import { Injectable, ConflictException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { TokenType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateUserDto } from './dto/create-user.dto';

const INVITE_TTL_MS = 72 * 60 * 60 * 1000;

const userSelect = {
  id: true, email: true, phone: true, firstName: true, lastName: true, role: true,
  adminCity: true, isActive: true, isEmailVerified: true, createdAt: true,
  passwordHash: true, googleId: true,
} as const;

// Never send the hash to the client — expose only whether the person still has to accept
// their invite (no password set and never signed in with Google).
function present<T extends { passwordHash: string | null; googleId: string | null }>(user: T) {
  const { passwordHash, googleId, ...rest } = user;
  return { ...rest, invitePending: !passwordHash && !googleId };
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async findAll(role?: string) {
    const where: any = {};
    if (role) where.role = role;
    const users = await this.prisma.user.findMany({ where, select: userSelect, orderBy: { createdAt: 'desc' } });
    return users.map(present);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: userSelect });
    if (!user) throw new NotFoundException('User not found');
    return present(user);
  }

  // Super admin creates an account directly. With a password it's usable immediately;
  // without one, the person gets an invite email linking to the set-password page.
  async create(dto: CreateUserDto) {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = dto.password ? await bcrypt.hash(dto.password, 12) : null;
    const token = dto.password ? null : crypto.randomBytes(32).toString('hex');

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          phone: dto.phone || undefined,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: dto.role || 'PASSENGER',
          adminCity: dto.adminCity,
          // The invite link is mailed to this address, so setting a password through it proves ownership.
          isEmailVerified: true,
        },
        select: userSelect,
      });
      if (token) {
        await tx.token.create({
          data: { userId: created.id, token, type: TokenType.PASSWORD_RESET, expiresAt: new Date(Date.now() + INVITE_TTL_MS) },
        });
      }
      return created;
    });

    if (token) this.sendInvite(email, user.firstName, token);
    return present(user);
  }

  async resendInvite(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (!user.email) throw new BadRequestException('User has no email address');
    if (user.passwordHash || user.googleId) throw new BadRequestException('This user has already set up their account');

    const token = crypto.randomBytes(32).toString('hex');
    await this.prisma.$transaction([
      this.prisma.token.updateMany({
        where: { userId: id, type: TokenType.PASSWORD_RESET, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.token.create({
        data: { userId: id, token, type: TokenType.PASSWORD_RESET, expiresAt: new Date(Date.now() + INVITE_TTL_MS) },
      }),
    ]);

    this.sendInvite(user.email, user.firstName, token);
    return { message: 'Invite sent' };
  }

  async update(id: string, data: { firstName?: string; lastName?: string; phone?: string; adminCity?: string }) {
    await this.findOne(id);
    return this.prisma.user.update({ where: { id }, data });
  }

  async toggleActive(id: string) {
    const user = await this.findOne(id);
    return this.prisma.user.update({ where: { id }, data: { isActive: !user.isActive } });
  }

  private sendInvite(email: string, firstName: string, token: string) {
    this.emailService.sendAdminInviteEmail(email, firstName, token).catch((err) => {
      this.logger.error(`Failed to send invite email to ${email}: ${err.message}`);
    });
  }
}
