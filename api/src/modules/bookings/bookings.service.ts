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

    // Check seat availability for the segment
    const routeStopOrderMap = new Map(trip.route.routeStops.map((rs) => [rs.id, rs.order]));
    const conflictingBooking = await this.prisma.booking.findFirst({
      where: {
        tripId: dto.tripId,
        seatNumber: dto.seatNumber,
        status: { in: ['CONFIRMED', 'COMPLETED'] },
      },
    });
    if (conflictingBooking) {
      const bPickupOrder = routeStopOrderMap.get(conflictingBooking.pickupStopId) ?? -1;
      const bDropoffOrder = routeStopOrderMap.get(conflictingBooking.dropoffStopId) ?? -1;
      const overlaps = bPickupOrder < dropoffStop.order && bDropoffOrder > pickupStop.order;
      if (overlaps) throw new ConflictException(`Seat ${dto.seatNumber} is already booked for this segment`);
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

    const ticketCode = this.generateTicketCode();

    const booking = await this.prisma.booking.create({
      data: {
        tripId: dto.tripId,
        userId,
        guestName,
        guestEmail,
        guestPhone,
        seatNumber: dto.seatNumber,
        pickupStopId: dto.pickupStopId,
        dropoffStopId: dto.dropoffStopId,
        amount,
        paymentMethod: dto.paymentMethod,
        paymentStatus: dto.paymentMethod === 'CASH' ? 'PAID' : 'PENDING',
        status: 'CONFIRMED',
        ticketCode,
        bookedByAdminId: requestingUser && requestingUser.role !== 'PASSENGER' ? requestingUser.id : null,
      },
      include: {
        trip: { include: { route: { include: { originStop: true, destinationStop: true } }, car: true } },
        pickupStop: { include: { stop: true } },
        dropoffStop: { include: { stop: true } },
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

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

    return this.prisma.booking.update({
      where: { id },
      data: { paymentStatus: 'PAID' },
    });
  }

  async confirmPaystackPayment(reference: string) {
    const booking = await this.prisma.booking.findUnique({ where: { paystackReference: reference } });
    if (!booking) throw new NotFoundException('Booking not found for this payment reference');

    return this.prisma.booking.update({
      where: { id: booking.id },
      data: { paymentStatus: 'PAID' },
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
