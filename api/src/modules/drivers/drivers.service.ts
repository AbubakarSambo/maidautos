import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDriverDto } from './dto/create-driver.dto';

@Injectable()
export class DriversService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.driver.findMany({ orderBy: { firstName: 'asc' } });
  }

  async findOne(id: string) {
    const driver = await this.prisma.driver.findUnique({ where: { id } });
    if (!driver) throw new NotFoundException('Driver not found');
    return driver;
  }

  async findAvailable() {
    return this.prisma.driver.findMany({ where: { status: 'AVAILABLE', isActive: true }, orderBy: { firstName: 'asc' } });
  }

  async create(dto: CreateDriverDto) {
    const existing = await this.prisma.driver.findUnique({ where: { phone: dto.phone } });
    if (existing) throw new ConflictException('Driver with this phone number already exists');
    return this.prisma.driver.create({ data: { ...dto, licenseExpiry: new Date(dto.licenseExpiry) } });
  }

  async update(id: string, dto: Partial<CreateDriverDto>) {
    await this.findOne(id);
    const data: any = { ...dto };
    if (dto.licenseExpiry) data.licenseExpiry = new Date(dto.licenseExpiry);
    return this.prisma.driver.update({ where: { id }, data });
  }

  async toggleActive(id: string) {
    const driver = await this.findOne(id);
    return this.prisma.driver.update({ where: { id }, data: { isActive: !driver.isActive } });
  }
}
