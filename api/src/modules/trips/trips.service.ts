import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { AddStatusUpdateDto } from './dto/add-status-update.dto';
import { TripStatus } from '@prisma/client';

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
        _count: { select: { bookings: true } },
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
          select: { seatNumber: true, pickupStopId: true, dropoffStopId: true, status: true, paymentStatus: true },
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

    const takenSeats = new Set<number>();
    for (const booking of trip.bookings) {
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
