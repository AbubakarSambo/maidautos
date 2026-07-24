import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { CreateBulkTripsDto } from './dto/create-bulk-trips.dto';
import { AddStatusUpdateDto } from './dto/add-status-update.dto';
import { TripStatus } from '@prisma/client';

// Must match PENDING_PAYMENT_HOLD_MINUTES in bookings.service.ts — a booking
// still awaiting online payment only holds its seat for this long.
const PENDING_PAYMENT_HOLD_MINUTES = 15;

@Injectable()
export class TripsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: { status?: TripStatus; date?: string }) {
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.date) {
      const d = new Date(filters.date);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      where.departureDateTime = { gte: d, lt: next };
    }

    const holdCutoff = new Date(Date.now() - PENDING_PAYMENT_HOLD_MINUTES * 60 * 1000);

    return this.prisma.trip.findMany({
      where,
      include: {
        route: {
          include: {
            originStop: true,
            destinationStop: true,
            routeStops: { include: { stop: true }, orderBy: { order: 'asc' } },
          },
        },
        car: true,
        driver: true,
        statusUpdates: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: {
          select: {
            bookings: {
              where: {
                status: { in: ['CONFIRMED', 'COMPLETED'] },
                OR: [{ paymentStatus: { not: 'PENDING' } }, { createdAt: { gte: holdCutoff } }],
              },
            },
          },
        },
      },
      orderBy: { departureDateTime: 'asc' },
    });
  }

  async search(originStopId: string, destinationStopId: string, date: string) {
    // Find routes that contain both stops in the correct order
    const routes = await this.prisma.route.findMany({
      where: { isActive: true },
      include: {
        routeStops: { orderBy: { order: 'asc' } },
        originStop: true,
        destinationStop: true,
      },
    });

    // Filter routes where origin stop order < destination stop order
    const validRouteIds = routes
      .filter((route) => {
        const pickup = route.routeStops.find((rs) => rs.stopId === originStopId);
        const dropoff = route.routeStops.find((rs) => rs.stopId === destinationStopId);
        return pickup && dropoff && pickup.order < dropoff.order;
      })
      .map((r) => r.id);

    if (validRouteIds.length === 0) return [];

    const d = new Date(date);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);

    return this.prisma.trip.findMany({
      where: {
        routeId: { in: validRouteIds },
        departureDateTime: { gte: d, lt: next },
        status: { in: ['SCHEDULED', 'BOARDING'] },
      },
      include: {
        route: {
          include: {
            originStop: true,
            destinationStop: true,
            routeStops: { include: { stop: true }, orderBy: { order: 'asc' } },
          },
        },
        car: true,
        driver: { select: { id: true, firstName: true, lastName: true } },
        statusUpdates: { orderBy: { createdAt: 'desc' }, take: 1 },
        bookings: {
          where: { status: { in: ['CONFIRMED', 'COMPLETED'] } },
          select: { seatNumber: true, pickupStopId: true, dropoffStopId: true },
        },
      },
      orderBy: { departureDateTime: 'asc' },
    });
  }

  async findOne(id: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id },
      include: {
        route: {
          include: {
            originStop: true,
            destinationStop: true,
            routeStops: { include: { stop: true }, orderBy: { order: 'asc' } },
          },
        },
        car: true,
        driver: true,
        statusUpdates: { include: { stop: true, createdBy: { select: { id: true, firstName: true, lastName: true } } }, orderBy: { createdAt: 'desc' } },
        bookings: {
          where: { status: { in: ['CONFIRMED', 'COMPLETED'] } },
          select: { seatNumber: true, pickupStopId: true, dropoffStopId: true, status: true, paymentStatus: true, createdAt: true },
        },
      },
    });
    if (!trip) throw new NotFoundException('Trip not found');
    return trip;
  }

  // Returns which seats are available for a given segment (pickup → dropoff)
  async getAvailableSeats(tripId: string, pickupStopId: string, dropoffStopId: string) {
    const trip = await this.findOne(tripId);

    const pickupStop = trip.route.routeStops.find((rs) => rs.id === pickupStopId);
    const dropoffStop = trip.route.routeStops.find((rs) => rs.id === dropoffStopId);

    if (!pickupStop || !dropoffStop) throw new BadRequestException('Invalid stop IDs for this trip');
    if (pickupStop.order >= dropoffStop.order) throw new BadRequestException('Pickup must come before dropoff');

    // A seat is TAKEN for the requested segment if any confirmed booking overlaps it
    // Overlap: booking.pickup.order < requested.dropoff.order AND booking.dropoff.order > requested.pickup.order
    const routeStopOrderMap = new Map(trip.route.routeStops.map((rs) => [rs.id, rs.order]));

    const holdCutoff = new Date(Date.now() - PENDING_PAYMENT_HOLD_MINUTES * 60 * 1000);
    const takenSeats = new Set<number>();
    for (const booking of trip.bookings) {
      // An expired payment hold (still PENDING past the hold window) no longer blocks the seat.
      if (booking.paymentStatus === 'PENDING' && booking.createdAt < holdCutoff) continue;
      const bPickupOrder = routeStopOrderMap.get(booking.pickupStopId) ?? -1;
      const bDropoffOrder = routeStopOrderMap.get(booking.dropoffStopId) ?? -1;
      const overlaps = bPickupOrder < dropoffStop.order && bDropoffOrder > pickupStop.order;
      if (overlaps) takenSeats.add(booking.seatNumber);
    }

    const allSeats = Array.from({ length: trip.car.capacity }, (_, i) => i + 1);
    return {
      total: trip.car.capacity,
      available: allSeats.filter((s) => !takenSeats.has(s)),
      taken: Array.from(takenSeats),
    };
  }

  async create(dto: CreateTripDto) {
    return this.prisma.trip.create({
      data: {
        routeId: dto.routeId,
        carId: dto.carId,
        driverId: dto.driverId,
        departureDateTime: new Date(dto.departureDateTime),
        priceOverride: dto.priceOverride,
        notes: dto.notes,
      },
      include: {
        route: { include: { originStop: true, destinationStop: true, routeStops: { include: { stop: true }, orderBy: { order: 'asc' } } } },
        car: true,
        driver: true,
      },
    });
  }

  async createBulk(dto: CreateBulkTripsDto) {
    const [sy, sm, sd] = dto.startDate.split('-').map(Number);
    const [ey, em, ed] = dto.endDate.split('-').map(Number);
    const cursor = new Date(Date.UTC(sy, sm - 1, sd));
    const endUTC = new Date(Date.UTC(ey, em - 1, ed));
    if (endUTC < cursor) throw new BadRequestException('endDate must be on or after startDate');

    const daysSet = new Set(dto.daysOfWeek);
    const tripsToCreate: {
      routeId: string;
      carId: string;
      driverId: string;
      departureDateTime: Date;
      priceOverride?: number;
      notes?: string;
    }[] = [];

    while (cursor <= endUTC) {
      if (daysSet.has(cursor.getUTCDay())) {
        const dateStr = cursor.toISOString().slice(0, 10);
        tripsToCreate.push({
          routeId: dto.routeId,
          carId: dto.carId,
          driverId: dto.driverId,
          departureDateTime: new Date(`${dateStr}T${dto.departureTime}:00`),
          priceOverride: dto.priceOverride,
          notes: dto.notes,
        });
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    if (tripsToCreate.length === 0) {
      throw new BadRequestException('No dates in this range match the selected days of week');
    }

    await this.prisma.trip.createMany({ data: tripsToCreate });
    return { count: tripsToCreate.length };
  }

  async update(id: string, dto: Partial<CreateTripDto>) {
    await this.findOne(id);
    const data: any = { ...dto };
    if (dto.departureDateTime) data.departureDateTime = new Date(dto.departureDateTime);
    return this.prisma.trip.update({ where: { id }, data });
  }

  async updateStatus(id: string, status: TripStatus) {
    await this.findOne(id);
    return this.prisma.trip.update({ where: { id }, data: { status } });
  }

  async addStatusUpdate(tripId: string, dto: AddStatusUpdateDto, adminId: string) {
    await this.findOne(tripId);
    return this.prisma.tripStatusUpdate.create({
      data: {
        tripId,
        checkpointLabel: dto.checkpointLabel,
        stopId: dto.stopId,
        note: dto.note,
        createdById: adminId,
      },
      include: { stop: true, createdBy: { select: { id: true, firstName: true, lastName: true } } },
    });
  }
}
