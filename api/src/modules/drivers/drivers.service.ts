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
    try {
      return await this.prisma.driver.create({
        data: { ...dto, email: dto.email || undefined, nin: dto.nin || undefined, licenseExpiry: new Date(dto.licenseExpiry) },
      });
    } catch (err) {
      // email/nin are optional-but-unique — an empty string sent for a blank field would
      // otherwise collide with another driver's blank field and surface as a raw 500.
      if (err.code === 'P2002') throw new ConflictException('A driver with this email, NIN, or license number already exists');
      throw err;
    }
  }

  async update(id: string, dto: Partial<CreateDriverDto>) {
    await this.findOne(id);
    const data: any = { ...dto };
    if (dto.email !== undefined) data.email = dto.email || undefined;
    if (dto.nin !== undefined) data.nin = dto.nin || undefined;
    if (dto.licenseExpiry) data.licenseExpiry = new Date(dto.licenseExpiry);
    try {
      return await this.prisma.driver.update({ where: { id }, data });
    } catch (err) {
      if (err.code === 'P2002') throw new ConflictException('A driver with this email, NIN, or license number already exists');
      throw err;
    }
  }

  async toggleActive(id: string) {
    const driver = await this.findOne(id);
    return this.prisma.driver.update({ where: { id }, data: { isActive: !driver.isActive } });
  }
}
