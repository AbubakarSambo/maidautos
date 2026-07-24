import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BookingsService } from '../bookings/bookings.service';
import * as crypto from 'crypto';

@Injectable()
export class PaystackService {
  private readonly logger = new Logger(PaystackService.name);
  private readonly secretKey: string;
  private readonly callbackUrl: string;
  private readonly baseUrl = 'https://api.paystack.co';

  constructor(
    private configService: ConfigService,
    private bookingsService: BookingsService,
  ) {
    this.secretKey = this.configService.get<string>('paystack.secretKey');
    this.callbackUrl = this.configService.get<string>('paystack.callbackUrl');
  }

  async initializePayment(bookingId: string, email: string, amountKobo: number) {
    const reference = `MAD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: amountKobo,
        reference,
        callback_url: `${this.callbackUrl}?bookingId=${bookingId}`,
        metadata: { bookingId },
      }),
    });

    const data = await response.json() as any;
    if (!data.status) throw new BadRequestException(data.message || 'Payment initialization failed');

    await this.bookingsService.attachPaystackReference(
      bookingId,
      reference,
      data.data.access_code,
      data.data.authorization_url,
    );

    return { reference, authorizationUrl: data.data.authorization_url, accessCode: data.data.access_code };
  }

  async verifyPayment(reference: string) {
    const response = await fetch(`${this.baseUrl}/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${this.secretKey}` },
    });
    const data = await response.json() as any;
    if (!data.status) throw new BadRequestException('Payment verification failed');

    // Normally the webhook confirms payment asynchronously, but it may not have
    // arrived yet by the time the customer's browser returns from Paystack — so
    // confirm synchronously here too (idempotent) and hand back the ticket code.
    let booking: { ticketCode: string; id: string } | null = null;
    if (data.data.status === 'success') {
      try {
        booking = await this.bookingsService.confirmPaystackPayment(reference);
      } catch (err) {
        this.logger.error(`Failed to confirm payment for ${reference}: ${err.message}`);
      }
    }

    return { ...data.data, ticketCode: booking?.ticketCode ?? null, bookingId: booking?.id ?? null };
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    const hash = crypto.createHmac('sha512', this.secretKey).update(rawBody).digest('hex');
    if (hash !== signature) {
      this.logger.warn('Invalid Paystack webhook signature');
      return;
    }

    const event = JSON.parse(rawBody.toString());
    if (event.event === 'charge.success') {
      const reference = event.data.reference;
      try {
        await this.bookingsService.confirmPaystackPayment(reference);
        this.logger.log(`Payment confirmed for reference: ${reference}`);
      } catch (err) {
        this.logger.error(`Failed to confirm payment for ${reference}: ${err.message}`);
      }
    }
  }
}
