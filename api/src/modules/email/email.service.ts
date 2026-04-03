import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;
  private fromEmail: string;
  private frontendUrl: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('resend.apiKey');
    this.resend = new Resend(apiKey);
    this.fromEmail = this.configService.get<string>('resend.fromEmail');
    this.frontendUrl = this.configService.get<string>('resend.frontendUrl');
  }

  async sendVerificationEmail(email: string, firstName: string, token: string) {
    const verifyUrl = `${this.frontendUrl}/verify-email?token=${token}`;
    await this.resend.emails.send({
      from: this.fromEmail,
      to: email,
      subject: 'Verify your MaidAutos account',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2>Welcome to MaidAutos, ${firstName}!</h2>
          <p>Please verify your email address to get started.</p>
          <a href="${verifyUrl}" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0">Verify Email</a>
          <p style="color:#6b7280;font-size:14px">This link expires in 24 hours. If you didn't create this account, you can ignore this email.</p>
        </div>
      `,
    });
  }

  async sendPasswordResetEmail(email: string, firstName: string, token: string) {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${token}`;
    await this.resend.emails.send({
      from: this.fromEmail,
      to: email,
      subject: 'Reset your MaidAutos password',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2>Password Reset</h2>
          <p>Hi ${firstName}, we received a request to reset your password.</p>
          <a href="${resetUrl}" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0">Reset Password</a>
          <p style="color:#6b7280;font-size:14px">This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
        </div>
      `,
    });
  }

  async sendTicketEmail(
    email: string,
    firstName: string,
    ticketCode: string,
    ticketDetails: {
      from: string;
      to: string;
      departure: string;
      seatNumber: number;
      amount: string;
    },
    pdfBuffer: Buffer,
  ) {
    await this.resend.emails.send({
      from: this.fromEmail,
      to: email,
      subject: `Your MaidAutos Ticket — ${ticketCode}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2>Booking Confirmed!</h2>
          <p>Hi ${firstName}, your ticket is confirmed. Details below:</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px;color:#6b7280">Ticket Code</td><td style="padding:8px;font-weight:bold">${ticketCode}</td></tr>
            <tr><td style="padding:8px;color:#6b7280">Route</td><td style="padding:8px">${ticketDetails.from} → ${ticketDetails.to}</td></tr>
            <tr><td style="padding:8px;color:#6b7280">Departure</td><td style="padding:8px">${ticketDetails.departure}</td></tr>
            <tr><td style="padding:8px;color:#6b7280">Seat</td><td style="padding:8px">${ticketDetails.seatNumber}</td></tr>
            <tr><td style="padding:8px;color:#6b7280">Amount Paid</td><td style="padding:8px">₦${ticketDetails.amount}</td></tr>
          </table>
          <p style="color:#6b7280;font-size:14px">Your ticket is attached as a PDF. Please keep it for reference.</p>
        </div>
      `,
      attachments: [
        {
          filename: `ticket-${ticketCode}.pdf`,
          content: pdfBuffer,
        },
      ],
    });
  }

  async sendBookingCancellationEmail(email: string, firstName: string, ticketCode: string) {
    await this.resend.emails.send({
      from: this.fromEmail,
      to: email,
      subject: `Booking Cancelled — ${ticketCode}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2>Booking Cancelled</h2>
          <p>Hi ${firstName}, your booking <strong>${ticketCode}</strong> has been cancelled.</p>
          <p>If you have any questions, please contact us.</p>
        </div>
      `,
    });
  }
}
