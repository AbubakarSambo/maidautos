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
    const existing = await this.prisma.route.findUnique({
      where: { originStopId_destinationStopId: { originStopId: dto.originStopId, destinationStopId: dto.destinationStopId } },
    });
    if (existing) throw new ConflictException('Route between these stops already exists');

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

  async updateStop(routeStopId: string, data: { priceFromOrigin?: number; distanceFromOriginKm?: number }) {
    return this.prisma.routeStop.update({ where: { id: routeStopId }, data });
  }
}
