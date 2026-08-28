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
      vehicleNo: string;
    },
    pdfBuffer?: Buffer,
  ) {
    const maroon = '#610000';
    const logoUrl = `${this.frontendUrl}/logo.png`;

    const field = (label: string, value: string) => `
      <tr>
        <td style="padding:9px 0;border-bottom:1px solid #e5e7eb;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.03em;white-space:nowrap">${label}</td>
        <td style="padding:9px 0;border-bottom:1px solid #e5e7eb;font-size:14px;font-weight:700;color:#111827;text-align:right">${value}</td>
      </tr>
    `;

    await this.resend.emails.send({
      from: this.fromEmail,
      to: email,
      subject: `Your MaidAutos Ticket — ${ticketCode}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px 0">
          <p style="color:#111827;font-size:15px">Hi ${firstName}, your booking is confirmed — here's your ticket.</p>

          <table role="presentation" style="width:100%;border-collapse:collapse;border-radius:16px;overflow:hidden;border:1px solid #f3f4f6;margin-top:16px">
            <tr>
              <td style="padding:20px 20px 12px">
                <table role="presentation"><tr>
                  <td><img src="${logoUrl}" alt="" width="36" height="36" style="display:block;object-fit:contain" /></td>
                  <td style="padding-left:12px">
                    <div style="font-weight:800;color:#111827;letter-spacing:-0.01em">MAID AUTOS LIMITED</div>
                    <span style="display:inline-block;margin-top:4px;background:${maroon};color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px">PASSENGER TICKET</span>
                  </td>
                </tr></table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 20px">
                <table role="presentation" style="width:100%;border-collapse:collapse">
                  ${field('Ticket Code', ticketCode)}
                  ${field('Date', ticketDetails.departure)}
                  ${field('Vehicle No', ticketDetails.vehicleNo)}
                  ${field('Destination', `${ticketDetails.from} to ${ticketDetails.to}`)}
                  ${field('Seat', String(ticketDetails.seatNumber))}
                  ${field('Amount', `₦${ticketDetails.amount}`)}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 20px 18px;text-align:center;border-top:1px solid #f3f4f6;margin-top:8px">
                <span style="color:${maroon};font-size:11px;font-weight:800;letter-spacing:0.03em">LUGGAGE AT OWNER'S RISK</span>
              </td>
            </tr>
          </table>

          <p style="color:#6b7280;font-size:13px;margin-top:16px">${pdfBuffer ? 'Your ticket is attached as a PDF. Please keep it for reference.' : `Show this email or your ticket code (${ticketCode}) at boarding.`}</p>
        </div>
      `,
      ...(pdfBuffer
        ? {
            attachments: [
              {
                filename: `ticket-${ticketCode}.pdf`,
                content: pdfBuffer,
              },
            ],
          }
        : {}),
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
