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
import * as crypto from 'crypto';

// A booking awaiting online payment holds its seat for this long before the
// hold expires and the seat becomes bookable again (abandoned checkouts).
const PENDING_PAYMENT_HOLD_MINUTES = 15;

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
        route: { include: { routeStops: { orderBy: { order: 'asc' } } } },
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

    const holdCutoff = new Date(Date.now() - PENDING_PAYMENT_HOLD_MINUTES * 60 * 1000);
    const routeStopOrderMap = new Map(trip.route.routeStops.map((rs) => [rs.id, rs.order]));
    const seatBookings = await this.prisma.booking.findMany({
      where: {
        tripId: dto.tripId,
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

    // Calculate base amount: priceFromOrigin[dropoff] - priceFromOrigin[pickup]. If this
    // trip has a priceOverride (e.g. a no-AC car costs less), scale that segment fare
    // proportionally against the override so relative stop-to-stop pricing is preserved
    // — e.g. a route-wide override to 60% of the listed price makes every segment 60% too.
    let baseAmount = Number(dropoffStop.priceFromOrigin) - Number(pickupStop.priceFromOrigin);
    if (trip.priceOverride != null) {
      const firstStop = trip.route.routeStops[0];
      const lastStop = trip.route.routeStops[trip.route.routeStops.length - 1];
      const fullRouteFare = Number(lastStop.priceFromOrigin) - Number(firstStop.priceFromOrigin);
      if (fullRouteFare > 0) {
        baseAmount = baseAmount * (Number(trip.priceOverride) / fullRouteFare);
      }
    }
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
      from: booking.pickupStop.stop.name,
      to: booking.dropoffStop.stop.name,
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
