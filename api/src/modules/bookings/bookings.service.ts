import {
  Injectable,
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

    // Check seat availability for the segment. A booking still awaiting online
    // payment only holds its seat for PENDING_PAYMENT_HOLD_MINUTES — after that
    // the hold expires and the seat is bookable again.
    const holdCutoff = new Date(Date.now() - PENDING_PAYMENT_HOLD_MINUTES * 60 * 1000);
    const routeStopOrderMap = new Map(trip.route.routeStops.map((rs) => [rs.id, rs.order]));
    const seatBookings = await this.prisma.booking.findMany({
      where: {
        tripId: dto.tripId,
        seatNumber: dto.seatNumber,
        status: { in: ['CONFIRMED', 'COMPLETED'] },
        OR: [{ paymentStatus: { not: 'PENDING' } }, { createdAt: { gte: holdCutoff } }],
      },
    });
    const conflictingBooking = seatBookings.find((b) => {
      const bPickupOrder = routeStopOrderMap.get(b.pickupStopId) ?? -1;
      const bDropoffOrder = routeStopOrderMap.get(b.dropoffStopId) ?? -1;
      return bPickupOrder < dropoffStop.order && bDropoffOrder > pickupStop.order;
    });
    if (conflictingBooking) {
      throw new ConflictException(`Seat ${dto.seatNumber} is already booked for this segment`);
    }

    // Calculate amount: priceFromOrigin[dropoff] - priceFromOrigin[pickup]
    const amount = Number(dropoffStop.priceFromOrigin) - Number(pickupStop.priceFromOrigin);
    if (amount <= 0) throw new BadRequestException('Invalid price calculation for this segment');

    // Determine passenger identity
    let userId: string | null = null;
    let guestName = dto.guestName;
    let guestEmail = dto.guestEmail;
    let guestPhone = dto.guestPhone;

    if (requestingUser) {
      if (requestingUser.role === 'PASSENGER') {
        userId = requestingUser.id;
      } else if (['SUPER_ADMIN', 'ADMIN'].includes(requestingUser.role)) {
        // Admin booking on behalf
        if (dto.passengerUserId) {
          userId = dto.passengerUserId;
        }
        // Otherwise it's a walk-in with guest info
      }
    }

    if (!userId && !guestEmail && !guestPhone) {
      throw new BadRequestException('Guest bookings require at least an email or phone number');
    }

    // Cash is an admin/agent-only payment method: an agent collects cash in person at
    // the terminal and records the booking themselves. Self-service passengers (or
    // guests) can only pay online — they never see or can request a Cash booking.
    const isAdminBooked = !!requestingUser && requestingUser.role !== 'PASSENGER';
    if (dto.paymentMethod === 'CASH' && !isAdminBooked) {
      throw new BadRequestException('Cash payments can only be recorded by an admin agent');
    }

    const ticketCode = this.generateTicketCode();

    const booking = await this.prisma.booking.create({
      data: {
        tripId: dto.tripId,
        userId,
        guestName,
        guestEmail,
        guestPhone,
        nokName: dto.nokName,
        nokPhone: dto.nokPhone,
        seatNumber: dto.seatNumber,
        pickupStopId: dto.pickupStopId,
        dropoffStopId: dto.dropoffStopId,
        amount,
        paymentMethod: dto.paymentMethod,
        paymentStatus: dto.paymentMethod === 'CASH' && isAdminBooked ? 'PAID' : 'PENDING',
        status: 'CONFIRMED',
        ticketCode,
        bookedByAdminId: isAdminBooked ? requestingUser.id : null,
      },
      include: {
        trip: { include: { route: { include: { originStop: true, destinationStop: true } }, car: true } },
        pickupStop: { include: { stop: true } },
        dropoffStop: { include: { stop: true } },
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    // Only admin-recorded cash bookings are PAID immediately, so the ticket email goes
    // out right away. Self-service cash and Paystack bookings get emailed once their
    // payment is actually confirmed (recordCashPayment / confirmPaystackPayment).
    if (booking.paymentStatus === 'PAID') {
      this.sendTicketConfirmationEmail(booking).catch(() => {});
    }

    return booking;
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
      this.emailService.sendBookingCancellationEmail(email, firstName, booking.ticketCode).catch(() => {});
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

    this.sendTicketConfirmationEmail(booking).catch(() => {});

    return updated;
  }

  async confirmPaystackPayment(reference: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { paystackReference: reference },
      include: {
        trip: { include: { route: { include: { originStop: true, destinationStop: true } }, car: true } },
        pickupStop: { include: { stop: true } },
        dropoffStop: { include: { stop: true } },
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found for this payment reference');

    // Both the Paystack webhook and the browser-return verify call land here for
    // the same reference — only send the ticket email the first time it's marked PAID.
    const alreadyPaid = booking.paymentStatus === 'PAID';

    const updated = await this.prisma.booking.update({
      where: { id: booking.id },
      data: { paymentStatus: 'PAID' },
    });

    if (!alreadyPaid) {
      this.sendTicketConfirmationEmail(booking).catch(() => {});
    }

    return updated;
  }

  private async sendTicketConfirmationEmail(booking: {
    ticketCode: string;
    seatNumber: number;
    amount: any;
    guestName?: string | null;
    guestEmail?: string | null;
    user?: { firstName: string; email: string } | null;
    trip: { departureDateTime: Date };
    pickupStop: { stop: { name: string } };
    dropoffStop: { stop: { name: string } };
  }) {
    const email = booking.user?.email || booking.guestEmail;
    if (!email) return;
    const firstName = booking.user?.firstName || booking.guestName || 'Passenger';

    await this.emailService.sendTicketEmail(email, firstName, booking.ticketCode, {
      from: booking.pickupStop.stop.name,
      to: booking.dropoffStop.stop.name,
      departure: booking.trip.departureDateTime.toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' }),
      seatNumber: booking.seatNumber,
      amount: Number(booking.amount).toLocaleString('en-NG'),
    });
  }

  async attachPaystackReference(bookingId: string, reference: string, accessCode: string, paymentUrl: string) {
    return this.prisma.booking.update({
      where: { id: bookingId },
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
