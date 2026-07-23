import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStopDto } from './dto/create-stop.dto';

@Injectable()
export class StopsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.stop.findMany({ orderBy: { name: 'asc' } });
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
