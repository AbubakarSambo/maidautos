import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRouteDto } from './dto/create-route.dto';

@Injectable()
export class RoutesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.route.findMany({
      include: {
        originStop: true,
        destinationStop: true,
        routeStops: { include: { stop: true }, orderBy: { order: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const route = await this.prisma.route.findUnique({
      where: { id },
      include: {
        originStop: true,
        destinationStop: true,
        routeStops: { include: { stop: true }, orderBy: { order: 'asc' } },
      },
    });
    if (!route) throw new NotFoundException('Route not found');
    return route;
  }

  async create(dto: CreateRouteDto) {
    const existing = await this.prisma.route.findFirst({
      where: { originStopId: dto.originStopId, destinationStopId: dto.destinationStopId, isActive: true },
    });
    if (existing) throw new ConflictException('An active route between these stops already exists');

    return this.prisma.route.create({
      data: {
        originStopId: dto.originStopId,
        destinationStopId: dto.destinationStopId,
        estimatedDurationMinutes: dto.estimatedDurationMinutes,
        routeStops: {
          create: dto.stops.map((s) => ({
            stopId: s.stopId,
            order: s.order,
            distanceFromOriginKm: s.distanceFromOriginKm,
            priceFromOrigin: s.priceFromOrigin,
          })),
        },
      },
      include: {
        originStop: true,
        destinationStop: true,
        routeStops: { include: { stop: true }, orderBy: { order: 'asc' } },
      },
    });
  }

  async toggleActive(id: string) {
    const route = await this.findOne(id);
    return this.prisma.route.update({ where: { id }, data: { isActive: !route.isActive } });
  }

  async remove(id: string) {
    await this.findOne(id);
    const tripCount = await this.prisma.trip.count({ where: { routeId: id } });
    if (tripCount > 0) {
      throw new ConflictException('Cannot delete this route — it has scheduled or past trips. Deactivate it instead.');
    }
    await this.prisma.route.delete({ where: { id } });
  }

  async updateStop(routeStopId: string, data: { priceFromOrigin?: number; distanceFromOriginKm?: number }) {
    return this.prisma.routeStop.update({ where: { id: routeStopId }, data });
  }

  async removeStop(routeStopId: string) {
    const routeStop = await this.prisma.routeStop.findUnique({ where: { id: routeStopId } });
    if (!routeStop) throw new NotFoundException('Route stop not found');

    const route = await this.prisma.route.findUnique({ where: { id: routeStop.routeId } });
    if (routeStop.stopId === route.originStopId || routeStop.stopId === route.destinationStopId) {
      throw new ConflictException('Cannot remove the origin or destination stop of a route');
    }

    try {
      await this.prisma.routeStop.delete({ where: { id: routeStopId } });
    } catch {
      throw new ConflictException('Cannot remove this stop — it has existing bookings');
    }

    await this.renumberStops(routeStop.routeId);
  }

  async addStop(
    routeId: string,
    data: { stopId: string; distanceFromOriginKm: number; priceFromOrigin: number },
  ) {
    const route = await this.findOne(routeId);
    if (data.stopId === route.originStopId || data.stopId === route.destinationStopId) {
      throw new ConflictException('This stop is already the origin or destination of the route');
    }
    if (route.routeStops.some((rs) => rs.stopId === data.stopId)) {
      throw new ConflictException('This stop is already on the route');
    }

    await this.prisma.routeStop.create({
      data: {
        routeId,
        stopId: data.stopId,
        order: route.routeStops.length, // temporary, fixed up by renumberStops
        distanceFromOriginKm: data.distanceFromOriginKm,
        priceFromOrigin: data.priceFromOrigin,
      },
    });

    await this.renumberStops(routeId);
    return this.findOne(routeId);
  }

  // Orders route stops by distance from origin so a newly added or removed
  // stop always sorts into the correct position along the route. Two-phase
  // update avoids colliding with the (routeId, order) unique constraint
  // while orders are being reshuffled mid-transaction.
  private async renumberStops(routeId: string) {
    const stops = await this.prisma.routeStop.findMany({
      where: { routeId },
      orderBy: { distanceFromOriginKm: 'asc' },
    });
    await this.prisma.$transaction([
      ...stops.map((s, i) => this.prisma.routeStop.update({ where: { id: s.id }, data: { order: 100000 + i } })),
      ...stops.map((s, i) => this.prisma.routeStop.update({ where: { id: s.id }, data: { order: i } })),
    ]);
  }
}
