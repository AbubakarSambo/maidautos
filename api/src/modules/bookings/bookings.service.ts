import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ManageBookingLookupDto, ChangeBookingDto } from './dto/manage-booking.dto';
import { ReassignBookingDto } from './dto/reassign-booking.dto';
import { MoveBookingDto } from './dto/move-booking.dto';
import { resolveSegmentFare } from '../routes/segment-fare.util';
import * as crypto from 'crypto';

// A booking awaiting online payment holds its seat for this long before the
// hold expires and the seat becomes bookable again (abandoned checkouts).
const PENDING_PAYMENT_HOLD_MINUTES = 15;

// Self-service booking changes: a customer can move a paid booking to another trip on
// the same pickup->dropoff stops up to this many hours before the original departure,
// paying this share of the ticket's value as a fee (plus any fare increase; a cheaper
// new trip is not refunded the difference).
export const BOOKING_CHANGE_CUTOFF_HOURS = 6;
export const BOOKING_CHANGE_FEE_RATE = 0.2;

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async findAll(filters?: { tripId?: string; userId?: string; status?: string }) {
    const where: any = {};
    if (filters?.tripId) where.tripId = filters.tripId;
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.status) where.status = filters.status;

    return this.prisma.booking.findMany({
      where,
      include: {
        trip: {
          include: {
            route: { include: { originStop: true, destinationStop: true } },
            car: true,
          },
        },
        pickupStop: { include: { stop: true } },
        dropoffStop: { include: { stop: true } },
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        bookedByAdmin: { select: { id: true, firstName: true, lastName: true } },
        reassignedFrom: { select: { ticketCode: true } },
        reassignedTo: { select: { ticketCode: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMyBookings(userId: string) {
    return this.prisma.booking.findMany({
      where: { userId },
      include: {
        trip: {
          include: {
            route: { include: { originStop: true, destinationStop: true } },
            car: true,
            statusUpdates: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
        pickupStop: { include: { stop: true } },
        dropoffStop: { include: { stop: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        trip: {
          include: {
            route: { include: { originStop: true, destinationStop: true, routeStops: { include: { stop: true }, orderBy: { order: 'asc' } } } },
            car: true,
            driver: true,
            statusUpdates: { orderBy: { createdAt: 'desc' } },
          },
        },
        pickupStop: { include: { stop: true } },
        dropoffStop: { include: { stop: true } },
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        bookedByAdmin: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async findByTicketCode(ticketCode: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { ticketCode },
      include: {
        trip: {
          include: {
            route: { include: { originStop: true, destinationStop: true } },
            car: true,
            driver: { select: { id: true, firstName: true, lastName: true, phone: true } },
            statusUpdates: { orderBy: { createdAt: 'desc' }, take: 3 },
          },
        },
        pickupStop: { include: { stop: true } },
        dropoffStop: { include: { stop: true } },
        changedTo: { where: { paymentStatus: 'PAID' }, select: { ticketCode: true } },
      },
    });
    if (!booking) throw new NotFoundException('Ticket not found');
    return booking;
  }

  // Creates one Booking row per seat, all sharing a groupId so they can be paid for
  // together as a single Paystack charge (or a single cash transaction) and shown
  // together on the confirmation page — while each seat still gets its own ticketCode
  // for independent boarding/check-in.
  async create(dto: CreateBookingDto, requestingUser?: any) {
    // Validate trip exists and is bookable
    const trip = await this.prisma.trip.findUnique({
      where: { id: dto.tripId },
      include: {
        route: { include: { routeStops: { orderBy: { order: 'asc' } }, segmentFares: true } },
        car: true,
      },
    });
    if (!trip) throw new NotFoundException('Trip not found');
    if (!['SCHEDULED', 'BOARDING'].includes(trip.status)) {
      throw new BadRequestException('This trip is no longer accepting bookings');
    }

    // Validate stops belong to this trip's route
    const pickupStop = trip.route.routeStops.find((rs) => rs.id === dto.pickupStopId);
    const dropoffStop = trip.route.routeStops.find((rs) => rs.id === dto.dropoffStopId);
    if (!pickupStop || !dropoffStop) throw new BadRequestException('Invalid stops for this trip');
    if (pickupStop.order >= dropoffStop.order) throw new BadRequestException('Pickup must come before dropoff');

    const seatNumbers = dto.passengers.map((p) => p.seatNumber);
    if (new Set(seatNumbers).size !== seatNumbers.length) {
      throw new BadRequestException('Duplicate seat numbers in passengers list');
    }

    // Check seat availability for the segment. A booking still awaiting online
    // payment only holds its seat for PENDING_PAYMENT_HOLD_MINUTES — after that
    // the hold expires and the seat is bookable again. Opportunistically clean up any
    // expired holds on this trip so they don't linger forever as phantom "confirmed"
    // bookings in booking lists — there's no scheduler in this app, so this piggybacks
    // on every booking attempt instead.
    await this.expireStaleHolds(dto.tripId);

    await this.assertSeatsAvailable(dto.tripId, trip.route.routeStops, pickupStop, dropoffStop, seatNumbers);

    // Calculate base amount: an explicit segment fare override for this pickup->dropoff
    // pair if one is set, otherwise priceFromOrigin[dropoff] - priceFromOrigin[pickup]. If
    // this trip has a priceOverride (e.g. a no-AC car costs less), scale that segment fare
    // proportionally against the override so relative stop-to-stop pricing is preserved
    // — e.g. a route-wide override to 60% of the listed price makes every segment 60% too.
    const baseAmount = resolveSegmentFare(trip.route, pickupStop, dropoffStop, trip.priceOverride);
    if (baseAmount <= 0) throw new BadRequestException('Invalid price calculation for this segment');
    const premiumSurcharge = Number(trip.car.premiumSeatSurcharge);
    const amountForSeat = (seatNumber: number) =>
      baseAmount + (trip.car.premiumSeatNumbers.includes(seatNumber) ? premiumSurcharge : 0);

    // Cash is an admin/agent-only payment method: an agent collects cash in person at
    // the terminal and records the booking themselves. Self-service passengers (or
    // guests) can only pay online — they never see or can request a Cash booking.
    // Conversely, admin-recorded bookings are always Cash — they're walk-ins the agent
    // is standing in front of, so there's no one for a Paystack link to go to.
    const isAdminBooked = !!requestingUser && requestingUser.role !== 'PASSENGER';
    if (dto.paymentMethod === 'CASH' && !isAdminBooked) {
      throw new BadRequestException('Cash payments can only be recorded by an admin agent');
    }
    if (isAdminBooked && dto.paymentMethod !== 'CASH') {
      throw new BadRequestException('Admin-recorded bookings must use Cash payment');
    }

    // Each seat gets its own passenger identity/contact — matters when one buyer books
    // seats for other people, not just themselves.
    const resolvePassenger = (p: (typeof dto.passengers)[number]) => {
      let userId: string | null = null;
      if (requestingUser) {
        if (requestingUser.role === 'PASSENGER') {
          userId = requestingUser.id;
        } else if (isAdminBooked && p.passengerUserId) {
          userId = p.passengerUserId;
        }
      }
      if (!userId && !p.guestEmail && !p.guestPhone) {
        throw new BadRequestException(`Passenger info required for seat ${p.seatNumber} — provide an email or phone`);
      }
      return userId;
    };

    const groupId = crypto.randomUUID();
    const paymentStatus = dto.paymentMethod === 'CASH' && isAdminBooked ? 'PAID' : 'PENDING';

    const bookings = await this.prisma.$transaction(
      dto.passengers.map((p) =>
        this.prisma.booking.create({
          data: {
            tripId: dto.tripId,
            userId: resolvePassenger(p),
            guestName: p.guestName,
            guestEmail: p.guestEmail,
            guestPhone: p.guestPhone,
            nokName: p.nokName,
            nokPhone: p.nokPhone,
            seatNumber: p.seatNumber,
            groupId,
            pickupStopId: dto.pickupStopId,
            dropoffStopId: dto.dropoffStopId,
            amount: amountForSeat(p.seatNumber),
            paymentMethod: dto.paymentMethod,
            paymentStatus,
            status: 'CONFIRMED',
            ticketCode: this.generateTicketCode(),
            bookedByAdminId: isAdminBooked ? requestingUser.id : null,
          },
          include: {
            trip: { include: { route: { include: { originStop: true, destinationStop: true } }, car: true } },
            pickupStop: { include: { stop: true } },
            dropoffStop: { include: { stop: true } },
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        }),
      ),
    );

    // Only admin-recorded cash bookings are PAID immediately, so the ticket email goes
    // out right away. Self-service cash and Paystack bookings get emailed once their
    // payment is actually confirmed (recordCashPayment / confirmPaystackPayment).
    if (paymentStatus === 'PAID') {
      for (const booking of bookings) {
        this.sendTicketConfirmationEmail(booking).catch((err) => {
          this.logger.error(`Failed to send ticket email for booking ${booking.id} (${booking.ticketCode}): ${err.message}`);
        });
      }
    }

    return { bookings, groupId, totalAmount: bookings.reduce((sum, b) => sum + Number(b.amount), 0) };
  }

  // Throws if any of the seats is already held by a live booking whose segment overlaps
  // pickup->dropoff on this trip. Unpaid bookings only count while their hold is fresh.
  private async assertSeatsAvailable(
    tripId: string,
    routeStops: { id: string; order: number }[],
    pickupStop: { order: number },
    dropoffStop: { order: number },
    seatNumbers: number[],
    excludeBookingId?: string,
  ) {
    const taken = await this.takenSeats(tripId, routeStops, pickupStop, dropoffStop, excludeBookingId);
    for (const seatNumber of seatNumbers) {
      if (taken.has(seatNumber)) {
        throw new ConflictException(`Seat ${seatNumber} is already booked for this segment`);
      }
    }
  }

  // Seats on this trip held by a live booking whose segment overlaps pickup->dropoff.
  // Unpaid bookings only count while their hold is fresh.
  private async takenSeats(
    tripId: string,
    routeStops: { id: string; order: number }[],
    pickupStop: { order: number },
    dropoffStop: { order: number },
    excludeBookingId?: string,
  ): Promise<Set<number>> {
    const holdCutoff = new Date(Date.now() - PENDING_PAYMENT_HOLD_MINUTES * 60 * 1000);
    const routeStopOrderMap = new Map(routeStops.map((rs) => [rs.id, rs.order]));
    const liveBookings = await this.prisma.booking.findMany({
      where: {
        tripId,
        ...(excludeBookingId && { id: { not: excludeBookingId } }),
        status: { in: ['CONFIRMED', 'COMPLETED'] },
        OR: [{ paymentStatus: { not: 'PENDING' } }, { createdAt: { gte: holdCutoff } }],
      },
      select: { seatNumber: true, pickupStopId: true, dropoffStopId: true },
    });
    const taken = new Set<number>();
    for (const b of liveBookings) {
      const bPickupOrder = routeStopOrderMap.get(b.pickupStopId) ?? -1;
      const bDropoffOrder = routeStopOrderMap.get(b.dropoffStopId) ?? -1;
      if (bPickupOrder < dropoffStop.order && bDropoffOrder > pickupStop.order) taken.add(b.seatNumber);
    }
    return taken;
  }

  // ---------------------------------------------------------------------------
  // Self-service booking changes
  // ---------------------------------------------------------------------------

  // Loads a booking by ticket code and checks the caller may manage it: an admin, the
  // logged-in passenger who owns it, or anyone who knows the email/phone it was made with.
  private async loadManageableBooking(dto: ManageBookingLookupDto, requestingUser?: any) {
    const booking = await this.prisma.booking.findUnique({
      where: { ticketCode: dto.ticketCode.trim().toUpperCase() },
      include: {
        trip: {
          include: {
            route: { include: { originStop: true, destinationStop: true } },
            car: true,
          },
        },
        pickupStop: { include: { stop: true } },
        dropoffStop: { include: { stop: true } },
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      },
    });
    // Same error for "no such ticket" and "wrong contact" so ticket codes can't be probed.
    const notFound = new NotFoundException('No booking found for that ticket code and email/phone');
    if (!booking) throw notFound;

    const isAdmin = requestingUser && requestingUser.role !== 'PASSENGER';
    const isOwner = requestingUser && booking.userId && booking.userId === requestingUser.id;
    if (isAdmin || isOwner) return booking;

    const contact = dto.contact?.trim();
    if (!contact) throw notFound;
    const emails = [booking.guestEmail, booking.user?.email].filter(Boolean).map((e) => e!.toLowerCase());
    const phones = [booking.guestPhone, booking.user?.phone].filter(Boolean).map((p) => normalizePhone(p!));
    const matches = contact.includes('@')
      ? emails.includes(contact.toLowerCase())
      : normalizePhone(contact).length >= 7 && phones.includes(normalizePhone(contact));
    if (!matches) throw notFound;
    return booking;
  }

  // Why this booking can't be changed right now, or null if it can.
  private changeBlockedReason(booking: {
    status: string;
    paymentStatus: string;
    trip: { status: string; departureDateTime: Date };
  }): string | null {
    if (booking.status === 'CHANGED') return 'This ticket has already been changed to another trip';
    if (booking.status !== 'CONFIRMED') return 'Only confirmed bookings can be changed';
    if (booking.paymentStatus !== 'PAID') return 'This booking has not been paid for yet';
    if (booking.trip.status !== 'SCHEDULED') return 'This trip is no longer open for changes';
    const cutoff = booking.trip.departureDateTime.getTime() - BOOKING_CHANGE_CUTOFF_HOURS * 60 * 60 * 1000;
    if (Date.now() > cutoff) {
      return `Bookings can only be changed up to ${BOOKING_CHANGE_CUTOFF_HOURS} hours before departure`;
    }
    return null;
  }

  async lookupForManagement(dto: ManageBookingLookupDto, requestingUser?: any) {
    const booking = await this.loadManageableBooking(dto, requestingUser);
    const blockedReason = this.changeBlockedReason(booking);
    return {
      booking,
      change: {
        allowed: blockedReason === null,
        reason: blockedReason,
        cutoffHours: BOOKING_CHANGE_CUTOFF_HOURS,
        feeRate: BOOKING_CHANGE_FEE_RATE,
        fee: Math.round(Number(booking.amount) * BOOKING_CHANGE_FEE_RATE),
      },
    };
  }

  // Validates moving the booking to dto.tripId / dto.seatNumber and prices it. Used both
  // to show the customer a quote and, authoritatively, when creating the change.
  private async prepareChange(dto: ChangeBookingDto, requestingUser?: any) {
    const booking = await this.loadManageableBooking(dto, requestingUser);
    const blockedReason = this.changeBlockedReason(booking);
    if (blockedReason) throw new BadRequestException(blockedReason);
    const { newTrip, pickupStop, dropoffStop, newFare } = await this.validateChangeTarget(booking, dto.tripId, dto.seatNumber);

    const currentValue = Number(booking.amount);
    const changeFee = Math.round(currentValue * BOOKING_CHANGE_FEE_RATE);
    const fareDifference = Math.max(0, Math.round((newFare - currentValue) * 100) / 100);

    return {
      booking,
      newTrip,
      pickupStop,
      dropoffStop,
      quote: {
        currentValue,
        newFare,
        changeFee,
        fareDifference,
        totalDue: changeFee + fareDifference,
        // The ticket keeps the higher of what was paid and the new fare — no refund down.
        newTicketValue: currentValue + fareDifference,
      },
    };
  }

  // Checks a booking can move to tripId/seatNumber — a different, future, scheduled trip
  // serving the same pickup and dropoff stops, with that seat free — and prices the seat.
  // Shared by customer changes and admin moves.
  // By default the booking keeps its pickup/dropoff stops. Admin moves may pass new stops
  // (a route change); then the same trip is allowed too, e.g. to change only the dropoff.
  private async validateChangeTarget(
    booking: { id: string; tripId: string; pickupStop: { stopId: string }; dropoffStop: { stopId: string } },
    tripId: string,
    seatNumber: number,
    newStops?: { pickupStopId: string; dropoffStopId: string },
  ) {
    const targetPickupStopId = newStops?.pickupStopId ?? booking.pickupStop.stopId;
    const targetDropoffStopId = newStops?.dropoffStopId ?? booking.dropoffStop.stopId;
    const stopsChanged =
      targetPickupStopId !== booking.pickupStop.stopId || targetDropoffStopId !== booking.dropoffStop.stopId;
    if (tripId === booking.tripId && !stopsChanged) {
      throw new BadRequestException('Choose a different trip — seat changes on the same trip are not supported');
    }
    const dto = { tripId, seatNumber };

    const newTrip = await this.prisma.trip.findUnique({
      where: { id: dto.tripId },
      include: {
        route: { include: { routeStops: { orderBy: { order: 'asc' } }, segmentFares: true } },
        car: true,
      },
    });
    if (!newTrip) throw new NotFoundException('Trip not found');
    if (newTrip.status !== 'SCHEDULED' || newTrip.departureDateTime.getTime() <= Date.now()) {
      throw new BadRequestException('That trip is not open for booking');
    }
    if (dto.seatNumber > newTrip.car.capacity) throw new BadRequestException('Invalid seat number');

    // The new trip may be on a different route, so look up its own route-stop rows.
    const pickupStop = newTrip.route.routeStops.find((rs) => rs.stopId === targetPickupStopId);
    const dropoffStop = newTrip.route.routeStops.find((rs) => rs.stopId === targetDropoffStopId);
    if (!pickupStop || !dropoffStop || pickupStop.order >= dropoffStop.order) {
      throw new BadRequestException(
        stopsChanged
          ? 'That trip does not go from the chosen pickup to the chosen dropoff'
          : 'That trip does not serve the same pickup and dropoff stops',
      );
    }

    await this.expireStaleHolds(newTrip.id);
    // On the same trip the booking's own current seat mustn't count against it.
    await this.assertSeatsAvailable(
      newTrip.id, newTrip.route.routeStops, pickupStop, dropoffStop, [dto.seatNumber],
      newTrip.id === booking.tripId ? booking.id : undefined,
    );

    const baseFare = resolveSegmentFare(newTrip.route, pickupStop, dropoffStop, newTrip.priceOverride);
    if (baseFare <= 0) throw new BadRequestException('Invalid price calculation for this segment');
    const newFare =
      baseFare +
      (newTrip.car.premiumSeatNumbers.includes(dto.seatNumber) ? Number(newTrip.car.premiumSeatSurcharge) : 0);

    return { newTrip, pickupStop, dropoffStop, newFare };
  }

  async quoteChange(dto: ChangeBookingDto, requestingUser?: any) {
    const { quote } = await this.prepareChange(dto, requestingUser);
    return quote;
  }

  // Creates the replacement booking on the new trip as an unpaid Paystack hold. The
  // original stays valid until the change fee is paid; confirmPaystackPayment then marks
  // it CHANGED, which frees its seat. Returns the groupId to initialize payment for.
  async createChange(dto: ChangeBookingDto, requestingUser?: any) {
    const { booking, newTrip, pickupStop, dropoffStop, quote } = await this.prepareChange(dto, requestingUser);

    // Drop any earlier unpaid change attempt for this booking so it doesn't hold a seat.
    await this.prisma.booking.updateMany({
      where: { changedFromBookingId: booking.id, paymentStatus: 'PENDING', status: 'CONFIRMED' },
      data: { status: 'CANCELLED' },
    });

    const replacement = await this.prisma.booking.create({
      data: {
        tripId: newTrip.id,
        userId: booking.userId,
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        guestPhone: booking.guestPhone,
        nokName: booking.nokName,
        nokPhone: booking.nokPhone,
        seatNumber: dto.seatNumber,
        groupId: crypto.randomUUID(),
        pickupStopId: pickupStop.id,
        dropoffStopId: dropoffStop.id,
        amount: quote.newTicketValue,
        paymentMethod: 'PAYSTACK',
        paymentStatus: 'PENDING',
        status: 'CONFIRMED',
        ticketCode: this.generateTicketCode(),
        changedFromBookingId: booking.id,
        changeFee: quote.changeFee,
        changeFareDifference: quote.fareDifference,
      },
    });

    return { groupId: replacement.groupId, bookingId: replacement.id, ...quote };
  }

  // Bookings in a group plus what's actually owed for each: the full amount for a new
  // booking, or just the change fee + fare difference for a change.
  async findGroupForPayment(groupId: string) {
    const bookings = await this.prisma.booking.findMany({
      where: { groupId },
      include: { user: { select: { email: true } } },
    });
    if (bookings.length === 0) throw new NotFoundException('Booking group not found');
    const amountDue = (b: (typeof bookings)[number]) =>
      b.changedFromBookingId ? Number(b.changeFee ?? 0) + Number(b.changeFareDifference ?? 0) : Number(b.amount);
    return {
      bookings,
      email: bookings.find((b) => b.guestEmail)?.guestEmail ?? bookings.find((b) => b.user?.email)?.user?.email ?? null,
      totalAmountKobo: bookings.reduce((sum, b) => sum + Math.round(amountDue(b) * 100), 0),
    };
  }

  // Cancels any booking on this trip that's still an unpaid, expired Paystack hold —
  // self-healing cleanup since nothing else marks these CANCELLED on its own.
  private async expireStaleHolds(tripId: string) {
    const holdCutoff = new Date(Date.now() - PENDING_PAYMENT_HOLD_MINUTES * 60 * 1000);
    await this.prisma.booking.updateMany({
      where: {
        tripId,
        status: 'CONFIRMED',
        paymentMethod: 'PAYSTACK',
        paymentStatus: 'PENDING',
        createdAt: { lt: holdCutoff },
      },
      data: { status: 'CANCELLED' },
    });
  }

  // Called when a Paystack payment comes back as anything other than success (the
  // customer cancelled, closed the checkout, or the charge failed) — releases the
  // seat(s) immediately instead of making the customer wait out the hold window.
  async cancelPendingByReference(reference: string) {
    await this.prisma.booking.updateMany({
      where: { paystackReference: reference, paymentStatus: 'PENDING' },
      data: { status: 'CANCELLED' },
    });
  }

  async findByGroupId(groupId: string) {
    const bookings = await this.prisma.booking.findMany({
      where: { groupId },
      include: {
        trip: {
          include: {
            route: { include: { originStop: true, destinationStop: true } },
            car: true,
          },
        },
        pickupStop: { include: { stop: true } },
        dropoffStop: { include: { stop: true } },
      },
      orderBy: { seatNumber: 'asc' },
    });
    if (bookings.length === 0) throw new NotFoundException('Booking group not found');
    return bookings;
  }

  async cancel(id: string, requestingUser: any) {
    const booking = await this.findOne(id);

    // Passengers can only cancel their own bookings
    if (requestingUser.role === 'PASSENGER' && booking.userId !== requestingUser.id) {
      throw new ForbiddenException('You can only cancel your own bookings');
    }

    if (booking.status === 'CANCELLED') throw new BadRequestException('Booking is already cancelled');
    if (booking.status === 'CHANGED') throw new BadRequestException('This booking was changed to another trip — manage the new ticket instead');

    const updated = await this.prisma.booking.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    // Send cancellation email if we have an email
    const email = booking.user?.email || booking.guestEmail;
    const firstName = booking.user?.firstName || booking.guestName || 'Passenger';
    if (email) {
      this.emailService.sendBookingCancellationEmail(email, firstName, booking.ticketCode).catch((err) => {
        this.logger.error(`Failed to send cancellation email for booking ${booking.id} (${booking.ticketCode}): ${err.message}`);
      });
    }

    return updated;
  }

  // Admin hands a booked seat to someone else — typically the original customer cancelled
  // by phone and a walk-in paid cash. The original is cancelled and a new ticket (new code,
  // so the old one can't be used to board) is issued for the same seat, stops and trip,
  // recorded as cash PAID. Done in one transaction so the seat is never up for grabs.
  // Refunding the original customer, if owed, happens outside the system.
  async reassign(id: string, dto: ReassignBookingDto, adminId: string) {
    const original = await this.findOne(id);

    if (original.status !== 'CONFIRMED') {
      throw new BadRequestException(`Only confirmed bookings can be reassigned — this one is ${original.status}`);
    }
    if (!['SCHEDULED', 'BOARDING'].includes(original.trip.status)) {
      throw new BadRequestException('This trip has already departed or ended');
    }
    const guestEmail = dto.guestEmail?.trim() || undefined;
    const guestPhone = dto.guestPhone?.trim() || undefined;
    if (!guestEmail && !guestPhone) {
      throw new BadRequestException('Provide a phone number or email for the new passenger');
    }

    const replacement = await this.prisma.$transaction(async (tx) => {
      // Guarded on status so two admins (or a customer cancelling) can't race this.
      const cancelled = await tx.booking.updateMany({
        where: { id: original.id, status: 'CONFIRMED' },
        data: { status: 'CANCELLED' },
      });
      if (cancelled.count === 0) throw new ConflictException('This booking was changed by someone else — refresh and try again');

      return tx.booking.create({
        data: {
          tripId: original.tripId,
          seatNumber: original.seatNumber,
          pickupStopId: original.pickupStopId,
          dropoffStopId: original.dropoffStopId,
          groupId: crypto.randomUUID(),
          guestName: dto.guestName.trim(),
          guestEmail,
          guestPhone,
          nokName: dto.nokName?.trim() || undefined,
          nokPhone: dto.nokPhone?.trim() || undefined,
          amount: dto.amount ?? original.amount,
          paymentMethod: 'CASH',
          paymentStatus: 'PAID',
          status: 'CONFIRMED',
          ticketCode: this.generateTicketCode(),
          bookedByAdminId: adminId,
          reassignedFromBookingId: original.id,
        },
        include: {
          trip: { include: { route: { include: { originStop: true, destinationStop: true } }, car: true } },
          pickupStop: { include: { stop: true } },
          dropoffStop: { include: { stop: true } },
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      });
    });

    this.logger.log(`Booking ${original.ticketCode} reassigned to ${replacement.ticketCode} by admin ${adminId}`);

    const originalEmail = original.user?.email || original.guestEmail;
    if (originalEmail) {
      const firstName = original.user?.firstName || original.guestName || 'Passenger';
      this.emailService.sendBookingCancellationEmail(originalEmail, firstName, original.ticketCode).catch((err) => {
        this.logger.error(`Failed to send cancellation email for booking ${original.id} (${original.ticketCode}): ${err.message}`);
      });
    }
    this.sendTicketConfirmationEmail(replacement).catch((err) => {
      this.logger.error(`Failed to send ticket email for booking ${replacement.id} (${replacement.ticketCode}): ${err.message}`);
    });

    return replacement;
  }

  // Admin: move a paid booking to another trip, optionally with new pickup/dropoff stops
  // (a route change), with no change cutoff and no fee — the new ticket keeps what the
  // customer already paid, whatever the new segment's fare. The
  // original is marked CHANGED (freeing its seat, excluded from revenue) and a new ticket
  // is issued, linked back via changedFromBookingId, in one transaction.
  async adminMove(id: string, dto: MoveBookingDto, adminId: string) {
    const original = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        pickupStop: { include: { stop: true } },
        dropoffStop: { include: { stop: true } },
        user: { select: { email: true, firstName: true } },
      },
    });
    if (!original) throw new NotFoundException('Booking not found');
    if (original.status === 'CHANGED') throw new BadRequestException('This ticket has already been changed to another trip');
    if (original.status !== 'CONFIRMED') {
      throw new BadRequestException(`Only confirmed bookings can be moved — this one is ${original.status}`);
    }
    if (original.paymentStatus !== 'PAID') throw new BadRequestException('This booking has not been paid for yet');

    if (!!dto.pickupStopId !== !!dto.dropoffStopId) {
      throw new BadRequestException('Provide both a new pickup and a new dropoff stop, or neither');
    }
    const newStops = dto.pickupStopId && dto.dropoffStopId
      ? { pickupStopId: dto.pickupStopId, dropoffStopId: dto.dropoffStopId }
      : undefined;
    const { newTrip, pickupStop, dropoffStop } = await this.validateChangeTarget(original, dto.tripId, dto.seatNumber, newStops);

    const replacement = await this.prisma.$transaction(async (tx) => {
      // Guarded on status so a concurrent cancel, reassign or customer change can't race this.
      const superseded = await tx.booking.updateMany({
        where: { id: original.id, status: 'CONFIRMED' },
        data: { status: 'CHANGED' },
      });
      if (superseded.count === 0) throw new ConflictException('This booking was changed by someone else — refresh and try again');

      return tx.booking.create({
        data: {
          tripId: newTrip.id,
          userId: original.userId,
          guestName: original.guestName,
          guestEmail: original.guestEmail,
          guestPhone: original.guestPhone,
          nokName: original.nokName,
          nokPhone: original.nokPhone,
          seatNumber: dto.seatNumber,
          groupId: crypto.randomUUID(),
          pickupStopId: pickupStop.id,
          dropoffStopId: dropoffStop.id,
          amount: original.amount,
          paymentMethod: original.paymentMethod,
          paymentStatus: 'PAID',
          status: 'CONFIRMED',
          ticketCode: this.generateTicketCode(),
          bookedByAdminId: adminId,
          changedFromBookingId: original.id,
          changeFee: 0,
          changeFareDifference: 0,
        },
        include: {
          trip: { include: { route: { include: { originStop: true, destinationStop: true } }, car: true } },
          pickupStop: { include: { stop: true } },
          dropoffStop: { include: { stop: true } },
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      });
    });

    this.logger.log(`Booking ${original.ticketCode} moved to trip ${newTrip.id} as ${replacement.ticketCode} by admin ${adminId}`);
    this.sendTicketConfirmationEmail(replacement).catch((err) => {
      this.logger.error(`Failed to send ticket email for booking ${replacement.id} (${replacement.ticketCode}): ${err.message}`);
    });
    return replacement;
  }

  async recordCashPayment(id: string, adminId: string) {
    const booking = await this.findOne(id);
    if (booking.paymentStatus === 'PAID') throw new BadRequestException('Booking is already paid');
    if (booking.paymentMethod !== 'CASH') throw new BadRequestException('This booking is not a cash payment');

    const updated = await this.prisma.booking.update({
      where: { id },
      data: { paymentStatus: 'PAID' },
    });

    this.sendTicketConfirmationEmail(booking).catch((err) => {
      this.logger.error(`Failed to send ticket email for booking ${booking.id} (${booking.ticketCode}): ${err.message}`);
    });

    return updated;
  }

  // A payment reference may cover several bookings (one multi-seat purchase), so this
  // confirms every booking sharing it, not just one row.
  async confirmPaystackPayment(reference: string) {
    const bookings = await this.prisma.booking.findMany({
      where: { paystackReference: reference },
      include: {
        trip: {
          include: {
            route: { include: { originStop: true, destinationStop: true, routeStops: true } },
            car: true,
          },
        },
        pickupStop: { include: { stop: true } },
        dropoffStop: { include: { stop: true } },
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        reassignedTo: { select: { id: true } },
      },
    });
    if (bookings.length === 0) throw new NotFoundException('Booking not found for this payment reference');

    // Both the Paystack webhook and the browser-return verify call land here for the same
    // reference — sometimes at the same moment, and Paystack retries webhooks. Each booking
    // is claimed atomically (PENDING -> PAID) and only the call that claims it does the
    // follow-up (reseating, admin alert, ticket email), so none of that ever runs twice.
    // A retried webhook can't flip a REFUNDED booking back to PAID either.
    const newlyPaid: typeof bookings = [];
    for (const booking of bookings) {
      const claimed = await this.prisma.booking.updateMany({
        where: { id: booking.id, paymentStatus: 'PENDING' },
        data: { paymentStatus: 'PAID' },
      });
      if (claimed.count === 1) {
        booking.paymentStatus = 'PAID';
        newlyPaid.push(booking);
      }
    }

    // The money can land after the seats were released: the hold expired, or an early
    // verify saw the payment as not-yet-complete. Paid means the customer keeps a seat:
    // their own if it's still free, otherwise any other free seat for their segment. If
    // the car is full, flag it for an admin.
    const unseated: ((typeof bookings)[number] & { reason: string })[] = [];
    for (const booking of newlyPaid.filter((b) => b.status === 'CANCELLED')) {
      const result = await this.findSeatForLatePayment(booking);
      if ('seatNumber' in result) {
        const { seatNumber } = result;
        await this.prisma.booking.update({ where: { id: booking.id }, data: { status: 'CONFIRMED', seatNumber } });
        const moved = seatNumber !== booking.seatNumber;
        this.logger.warn(
          `Reinstated cancelled booking ${booking.ticketCode} — payment ${reference} arrived after its seat was released` +
            (moved ? `; seat ${booking.seatNumber} was taken, moved to seat ${seatNumber}` : ''),
        );
        booking.status = 'CONFIRMED';
        booking.seatNumber = seatNumber;
      } else {
        const paidWithoutSeatAt = new Date();
        await this.prisma.booking.update({ where: { id: booking.id }, data: { paidWithoutSeatAt } });
        booking.paidWithoutSeatAt = paidWithoutSeatAt;
        unseated.push({ ...booking, reason: result.reason });
        this.logger.error(
          `PAID BUT NO SEAT: booking ${booking.ticketCode} (seat ${booking.seatNumber}, trip ${booking.tripId}) was paid via ${reference} ` +
            `but couldn't be reseated (${result.reason}) — needs manual rebooking or a refund`,
        );
      }
    }
    if (unseated.length > 0) {
      this.alertAdminsPaidWithoutSeat(unseated, reference).catch((err) => {
        this.logger.error(`Failed to send paid-without-seat alert for ${reference}: ${err.message}`);
      });
    }
    const seated = bookings.filter((b) => b.status !== 'CANCELLED');

    // A paid change supersedes the booking it was made from, releasing its seat — but
    // only if the replacement actually holds a seat, or the customer would lose both.
    const changedFromIds = seated.map((b) => b.changedFromBookingId).filter((id): id is string => !!id);
    if (changedFromIds.length > 0) {
      const superseded = await this.prisma.booking.updateMany({
        where: { id: { in: changedFromIds }, status: 'CONFIRMED' },
        data: { status: 'CHANGED' },
      });
      if (newlyPaid.length > 0 && superseded.count < changedFromIds.length) {
        this.logger.warn(`Change payment ${reference} confirmed but original booking(s) ${changedFromIds.join(', ')} were no longer CONFIRMED`);
      }
    }

    for (const booking of newlyPaid.filter((b) => b.status !== 'CANCELLED')) {
      this.sendTicketConfirmationEmail(booking).catch((err) => {
        this.logger.error(`Failed to send ticket email for booking ${booking.id} (${booking.ticketCode}): ${err.message}`);
      });
    }

    // Prefer a booking that holds a seat, so the customer lands on a valid ticket.
    return seated[0] ?? bookings[0];
  }

  // A free seat for a booking whose payment landed after it was cancelled: its own seat
  // if still free, else the lowest free standard seat, else the lowest free premium seat
  // (the customer isn't charged the surcharge — the mix-up was ours). Null when the car
  // is full for their segment, the trip has left, or an admin deliberately gave this
  // seat to someone else (that customer cancelled — an admin decides what happens).
  private async findSeatForLatePayment(booking: {
    tripId: string;
    seatNumber: number;
    reassignedTo: { id: string }[];
    trip: { status: string; car: { capacity: number; premiumSeatNumbers: number[] }; route: { routeStops: { id: string; order: number }[] } };
    pickupStop: { order: number };
    dropoffStop: { order: number };
  }): Promise<{ seatNumber: number } | { reason: string }> {
    if (booking.reassignedTo.length > 0) return { reason: 'an admin had already given their seat to another passenger' };
    if (!['SCHEDULED', 'BOARDING'].includes(booking.trip.status)) return { reason: `the trip is already ${booking.trip.status.toLowerCase()}` };

    const taken = await this.takenSeats(booking.tripId, booking.trip.route.routeStops, booking.pickupStop, booking.dropoffStop);
    if (!taken.has(booking.seatNumber)) return { seatNumber: booking.seatNumber };

    const free = Array.from({ length: booking.trip.car.capacity }, (_, i) => i + 1).filter((s) => !taken.has(s));
    const premium = new Set(booking.trip.car.premiumSeatNumbers);
    const seatNumber = free.find((s) => !premium.has(s)) ?? free[0];
    return seatNumber != null ? { seatNumber } : { reason: 'every seat on the trip is taken for their journey' };
  }

  private async alertAdminsPaidWithoutSeat(
    bookings: {
      ticketCode: string;
      seatNumber: number;
      amount: any;
      guestName: string | null;
      guestEmail: string | null;
      guestPhone: string | null;
      user: { firstName: string; lastName: string; email: string | null; phone: string | null } | null;
      trip: { departureDateTime: Date; route: { originStop: { name: string }; destinationStop: { name: string } } };
      pickupStop: { stop: { name: string } };
      dropoffStop: { stop: { name: string } };
      reason: string;
    }[],
    reference: string,
  ) {
    const admins = await this.prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, isActive: true, email: { not: null } },
      select: { email: true },
    });
    const to = admins.map((a) => a.email!).filter(Boolean);
    if (to.length === 0) {
      this.logger.error(`No admin emails to alert about paid-without-seat payment ${reference}`);
      return;
    }
    for (const b of bookings) {
      await this.emailService.sendPaidWithoutSeatAlert(to, {
        ticketCode: b.ticketCode,
        passengerName: b.user ? `${b.user.firstName} ${b.user.lastName}` : b.guestName || 'Guest',
        phone: b.user?.phone || b.guestPhone,
        email: b.user?.email || b.guestEmail,
        route: `${b.pickupStop.stop.name} → ${b.dropoffStop.stop.name}`,
        departure: b.trip.departureDateTime.toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Lagos' }),
        seatNumber: b.seatNumber,
        amount: Number(b.amount).toLocaleString('en-NG'),
        paystackReference: reference,
        reason: b.reason,
      });
    }
  }

  // Admin has dealt with a paid-without-seat booking (rebooked the customer or refunded them).
  async resolvePaidWithoutSeat(id: string, adminId: string) {
    const booking = await this.findOne(id);
    if (!booking.paidWithoutSeatAt) throw new BadRequestException('This booking is not flagged as paid without a seat');
    this.logger.log(`Paid-without-seat booking ${booking.ticketCode} marked resolved by admin ${adminId}`);
    return this.prisma.booking.update({ where: { id }, data: { paidWithoutSeatAt: null } });
  }

  private async sendTicketConfirmationEmail(booking: {
    ticketCode: string;
    seatNumber: number;
    amount: any;
    guestName?: string | null;
    guestEmail?: string | null;
    user?: { firstName: string; email: string } | null;
    trip: { departureDateTime: Date; car: { plateNumber: string } };
    pickupStop: { stop: { name: string } };
    dropoffStop: { stop: { name: string } };
  }) {
    const email = booking.user?.email || booking.guestEmail;
    if (!email) return;
    const firstName = booking.user?.firstName || booking.guestName || 'Passenger';

    await this.emailService.sendTicketEmail(email, firstName, booking.ticketCode, {
      from: ticketStopName(booking.pickupStop.stop.name),
      to: ticketStopName(booking.dropoffStop.stop.name),
      // Explicit timeZone — this runs server-side, where the process timezone (e.g. UTC
      // on Railway) would otherwise silently shift the printed departure time.
      departure: booking.trip.departureDateTime.toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Lagos' }),
      seatNumber: booking.seatNumber,
      vehicleNo: booking.trip.car.plateNumber,
      amount: Number(booking.amount).toLocaleString('en-NG'),
    });
  }

  async attachPaystackReference(groupId: string, reference: string, accessCode: string, paymentUrl: string) {
    return this.prisma.booking.updateMany({
      where: { groupId },
      data: { paystackReference: reference, paystackAccessCode: accessCode, paymentUrl },
    });
  }

  private generateTicketCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'MAD-';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }
}

// Stops whose ticket label names the specific terminal passengers board/alight at.
// Keyed by lower-cased stop name; only used for ticket display (the ticket email; the client has its own copy).
const TICKET_STOP_TERMINALS: Record<string, string> = {
  abuja: 'Mabushi Bus Terminal',
};

function ticketStopName(name: string): string {
  const terminal = TICKET_STOP_TERMINALS[name.trim().toLowerCase()];
  return terminal ? `${name} (${terminal})` : name;
}

// Compares phone numbers by their last 10 digits so +234 803..., 234803... and 0803...
// all match.
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10);
}
