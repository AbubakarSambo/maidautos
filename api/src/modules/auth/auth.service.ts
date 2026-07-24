import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { RegisterDto, LoginDto, VerifyEmailDto, ForgotPasswordDto, ResetPasswordDto } from './dto';
import { TokenType } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const token = crypto.randomBytes(32).toString('hex');

    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          phone: dto.phone,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: 'PASSENGER',
          isEmailVerified: false,
        },
      });

      await tx.token.create({
        data: {
          userId: user.id,
          token,
          type: TokenType.EMAIL_VERIFICATION,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
    });

    await this.emailService.sendVerificationEmail(dto.email.toLowerCase(), dto.firstName, token);

    return { message: 'Registration successful. Please check your email to verify your account.', email: dto.email.toLowerCase() };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user || !user.isActive) throw new UnauthorizedException('Invalid email or password');
    if (!user.isEmailVerified) throw new UnauthorizedException('Please verify your email before logging in');
    if (!user.passwordHash) throw new UnauthorizedException('Invalid email or password');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid email or password');

    // Catch any guest bookings made under this email since the last login/verification
    // (e.g. the passenger booked as a guest again without noticing they were logged out).
    this.linkGuestBookings(user.id, user.email).catch(() => {});

    return { accessToken: this.generateToken(user), user: this.formatUser(user) };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const record = await this.prisma.token.findUnique({
      where: { token: dto.token },
      include: { user: true },
    });

    if (!record) throw new BadRequestException('Invalid verification token');
    if (record.usedAt) throw new BadRequestException('This token has already been used');
    if (record.expiresAt < new Date()) throw new BadRequestException('This link has expired. Please request a new one.');
    if (record.type !== TokenType.EMAIL_VERIFICATION) throw new BadRequestException('Invalid token type');

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: record.userId }, data: { isEmailVerified: true } });
      await tx.token.update({ where: { id: record.id }, data: { usedAt: new Date() } });

      // Only now do we know this person genuinely owns this email address (they clicked
      // a link mailed to it) — link any guest bookings made under it before they had an
      // account. Doing this before verification would let someone register with a
      // stranger's email and see that stranger's booking history.
      await tx.booking.updateMany({
        where: { userId: null, guestEmail: { equals: record.user.email, mode: 'insensitive' } },
        data: { userId: record.userId },
      });
    });

    const user = record.user;
    return { accessToken: this.generateToken(user), user: this.formatUser(user) };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const message = 'If an account with that email exists, a reset link has been sent.';
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user) return { message };

    await this.prisma.token.updateMany({
      where: { userId: user.id, type: TokenType.PASSWORD_RESET, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = crypto.randomBytes(32).toString('hex');
    await this.prisma.token.create({
      data: { userId: user.id, token, type: TokenType.PASSWORD_RESET, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });

    this.emailService.sendPasswordResetEmail(user.email, user.firstName, token).catch((err) => {
      this.logger.error(`Failed to send reset email: ${err.message}`);
    });

    return { message };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const record = await this.prisma.token.findUnique({
      where: { token: dto.token },
      include: { user: true },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset link');
    }
    if (record.type !== TokenType.PASSWORD_RESET) throw new BadRequestException('Invalid token type');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
      await tx.token.update({ where: { id: record.id }, data: { usedAt: new Date() } });
    });

    return { accessToken: this.generateToken(record.user), user: this.formatUser(record.user) };
  }

  async resendVerification(email: string) {
    const message = 'If an account with that email exists and is unverified, a new link has been sent.';
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || user.isEmailVerified) return { message };

    await this.prisma.token.updateMany({
      where: { userId: user.id, type: TokenType.EMAIL_VERIFICATION, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = crypto.randomBytes(32).toString('hex');
    await this.prisma.token.create({
      data: { userId: user.id, token, type: TokenType.EMAIL_VERIFICATION, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    });

    this.emailService.sendVerificationEmail(user.email, user.firstName, token).catch(() => {});
    return { message };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    return this.formatUser(user);
  }

  private async linkGuestBookings(userId: string, email: string) {
    await this.prisma.booking.updateMany({
      where: { userId: null, guestEmail: { equals: email, mode: 'insensitive' } },
      data: { userId },
    });
  }

  private generateToken(user: { id: string; email: string; role: string }) {
    return this.jwtService.sign({ sub: user.id, email: user.email, role: user.role });
  }

  private formatUser(user: any) {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      adminCity: user.adminCity,
      isEmailVerified: user.isEmailVerified,
    };
  }
}
