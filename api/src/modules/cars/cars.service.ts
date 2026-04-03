import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCarDto } from './dto/create-car.dto';
import { CarStatus } from '@prisma/client';

@Injectable()
export class CarsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.car.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const car = await this.prisma.car.findUnique({ where: { id } });
    if (!car) throw new NotFoundException('Car not found');
    return car;
  }

  async findActive() {
    return this.prisma.car.findMany({ where: { status: 'ACTIVE' }, orderBy: { make: 'asc' } });
  }

  async create(dto: CreateCarDto) {
    const existing = await this.prisma.car.findUnique({ where: { plateNumber: dto.plateNumber } });
    if (existing) throw new ConflictException('Plate number already registered');
    return this.prisma.car.create({ data: { ...dto } });
  }

  async update(id: string, dto: Partial<CreateCarDto>) {
    await this.findOne(id);
    return this.prisma.car.update({ where: { id }, data: dto });
  }

  async updateStatus(id: string, status: CarStatus) {
    await this.findOne(id);
    return this.prisma.car.update({ where: { id }, data: { status } });
  }
}
