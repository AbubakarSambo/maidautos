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
  ) {
    const holdCutoff = new Date(Date.now() - PENDING_PAYMENT_HOLD_MINUTES * 60 * 1000);
    const routeStopOrderMap = new Map(routeStops.map((rs) => [rs.id, rs.order]));
    const seatBookings = await this.prisma.booking.findMany({
      where: {
        tripId,
        seatNumber: { in: seatNumbers },
        status: { in: ['CONFIRMED', 'COMPLETED'] },
        OR: [{ paymentStatus: { not: 'PENDING' } }, { createdAt: { gte: holdCutoff } }],
      },
    });
    for (const seatNumber of seatNumbers) {
      const conflictingBooking = seatBookings.find((b) => {
        if (b.seatNumber !== seatNumber) return false;
        const bPickupOrder = routeStopOrderMap.get(b.pickupStopId) ?? -1;
        const bDropoffOrder = routeStopOrderMap.get(b.dropoffStopId) ?? -1;
        return bPickupOrder < dropoffStop.order && bDropoffOrder > pickupStop.order;
      });
      if (conflictingBooking) {
        throw new ConflictException(`Seat ${seatNumber} is already booked for this segment`);
      }
    }
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
    if (dto.tripId === booking.tripId) {
      throw new BadRequestException('Choose a different trip — seat changes on the same trip are not supported');
    }

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

    // Same physical pickup and dropoff stops; the new trip may be on a different route.
    const pickupStop = newTrip.route.routeStops.find((rs) => rs.stopId === booking.pickupStop.stopId);
    const dropoffStop = newTrip.route.routeStops.find((rs) => rs.stopId === booking.dropoffStop.stopId);
    if (!pickupStop || !dropoffStop || pickupStop.order >= dropoffStop.order) {
      throw new BadRequestException('That trip does not serve the same pickup and dropoff stops');
    }

    await this.expireStaleHolds(newTrip.id);
    await this.assertSeatsAvailable(newTrip.id, newTrip.route.routeStops, pickupStop, dropoffStop, [dto.seatNumber]);

    const baseFare = resolveSegmentFare(newTrip.route, pickupStop, dropoffStop, newTrip.priceOverride);
    if (baseFare <= 0) throw new BadRequestException('Invalid price calculation for this segment');
    const newFare =
      baseFare +
      (newTrip.car.premiumSeatNumbers.includes(dto.seatNumber) ? Number(newTrip.car.premiumSeatSurcharge) : 0);

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
        trip: { include: { route: { include: { originStop: true, destinationStop: true } }, car: true } },
        pickupStop: { include: { stop: true } },
        dropoffStop: { include: { stop: true } },
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    if (bookings.length === 0) throw new NotFoundException('Booking not found for this payment reference');

    // Both the Paystack webhook and the browser-return verify call land here for
    // the same reference — only send the ticket email the first time it's marked PAID.
    const alreadyPaid = bookings[0].paymentStatus === 'PAID';

    await this.prisma.booking.updateMany({
      where: { paystackReference: reference },
      data: { paymentStatus: 'PAID' },
    });

    // A paid change supersedes the booking it was made from, releasing its seat.
    const changedFromIds = bookings.map((b) => b.changedFromBookingId).filter((id): id is string => !!id);
    if (changedFromIds.length > 0) {
      const superseded = await this.prisma.booking.updateMany({
        where: { id: { in: changedFromIds }, status: 'CONFIRMED' },
        data: { status: 'CHANGED' },
      });
      if (!alreadyPaid && superseded.count < changedFromIds.length) {
        this.logger.warn(`Change payment ${reference} confirmed but original booking(s) ${changedFromIds.join(', ')} were no longer CONFIRMED`);
      }
    }

    if (!alreadyPaid) {
      for (const booking of bookings) {
        this.sendTicketConfirmationEmail(booking).catch((err) => {
          this.logger.error(`Failed to send ticket email for booking ${booking.id} (${booking.ticketCode}): ${err.message}`);
        });
      }
    }

    return bookings[0];
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
