import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStopDto } from './dto/create-stop.dto';

@Injectable()
export class StopsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.stop.findMany({ orderBy: { name: 'asc' } });
  }

  // Stops that can be a valid pickup point on some active route, i.e. a later stop
  // exists on that same route — matching the pickup.order < dropoff.order rule
  // trips.service.ts uses to resolve bookable trips. Terminal/last stops on a route
  // are excluded since a trip can never depart from them.
  async findActive() {
    const routes = await this.prisma.route.findMany({
      where: { isActive: true },
      select: { routeStops: { orderBy: { order: 'asc' }, select: { stopId: true } } },
    });

    const stopIds = new Set<string>();
    for (const route of routes) {
      for (const routeStop of route.routeStops.slice(0, -1)) {
        stopIds.add(routeStop.stopId);
      }
    }

    if (stopIds.size === 0) return [];
    return this.prisma.stop.findMany({
      where: { id: { in: [...stopIds] } },
      orderBy: { name: 'asc' },
    });
  }

  // Stops reachable as a dropoff from the given pickup stop on some active route,
  // i.e. stops that come after it in that route's order — matching the same
  // pickup.order < dropoff.order rule trips.service.ts uses to resolve bookable trips.
  async findDestinationsFrom(originStopId: string) {
    const routes = await this.prisma.route.findMany({
      where: { isActive: true },
      select: { routeStops: { orderBy: { order: 'asc' }, select: { stopId: true } } },
    });

    const stopIds = new Set<string>();
    for (const route of routes) {
      const originIndex = route.routeStops.findIndex((rs) => rs.stopId === originStopId);
      if (originIndex === -1) continue;
      for (const routeStop of route.routeStops.slice(originIndex + 1)) {
        stopIds.add(routeStop.stopId);
      }
    }

    if (stopIds.size === 0) return [];
    return this.prisma.stop.findMany({
      where: { id: { in: [...stopIds] } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const stop = await this.prisma.stop.findUnique({ where: { id } });
    if (!stop) throw new NotFoundException('Stop not found');
    return stop;
  }

  async create(dto: CreateStopDto) {
    const slug = dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existing = await this.prisma.stop.findUnique({ where: { slug } });
    if (existing) throw new ConflictException('Stop with this name already exists');
    return this.prisma.stop.create({ data: { name: dto.name, state: dto.state, slug } });
  }

  async update(id: string, dto: Partial<CreateStopDto>) {
    await this.findOne(id);
    const data: any = { ...dto };
    if (dto.name) {
      data.slug = dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    return this.prisma.stop.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    try {
      return await this.prisma.stop.delete({ where: { id } });
    } catch {
      throw new ConflictException('Cannot remove this stop — it is used by one or more routes');
    }
  }
}
