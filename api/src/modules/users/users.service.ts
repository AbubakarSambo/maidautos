import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(role?: string) {
    const where: any = {};
    if (role) where.role = role;
    return this.prisma.user.findMany({
      where,
      select: { id: true, email: true, phone: true, firstName: true, lastName: true, role: true, adminCity: true, isActive: true, isEmailVerified: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, phone: true, firstName: true, lastName: true, role: true, adminCity: true, isActive: true, isEmailVerified: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // Super admin creates an admin or passenger account directly (no email verification flow)
  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new ConflictException('Email already in use');
    const passwordHash = await bcrypt.hash(dto.password, 12);
    return this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        phone: dto.phone,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role || 'PASSENGER',
        adminCity: dto.adminCity,
        isEmailVerified: true,
      },
      select: { id: true, email: true, phone: true, firstName: true, lastName: true, role: true, adminCity: true, isActive: true, createdAt: true },
    });
  }

  async update(id: string, data: { firstName?: string; lastName?: string; phone?: string; adminCity?: string }) {
    await this.findOne(id);
    return this.prisma.user.update({ where: { id }, data });
  }

  async toggleActive(id: string) {
    const user = await this.findOne(id);
    return this.prisma.user.update({ where: { id }, data: { isActive: !user.isActive } });
  }
}
