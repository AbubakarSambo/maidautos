import { Controller, Post, Get, Body, Param, Headers, RawBodyRequest, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { PaystackService } from './paystack.service';
import { Public, CurrentUser } from '../../common';
import { BookingsService } from '../bookings/bookings.service';

@ApiTags('Paystack')
@Controller('paystack')
export class PaystackController {
  constructor(
    private paystackService: PaystackService,
    private bookingsService: BookingsService,
  ) {}

  @Public()
  @Post('initialize/:bookingId')
  async initialize(@Param('bookingId') bookingId: string, @CurrentUser() user: any) {
    const booking = await this.bookingsService.findOne(bookingId);
    const email = user?.email || booking.guestEmail;
    if (!email) throw new Error('No email available for payment');
    const amountKobo = Math.round(Number(booking.amount) * 100);
    return this.paystackService.initializePayment(bookingId, email, amountKobo);
  }

  @Public()
  @Get('verify/:reference')
  verify(@Param('reference') reference: string) {
    return this.paystackService.verifyPayment(reference);
  }

  @Public()
  @Post('webhook')
  webhook(@Req() req: RawBodyRequest<Request>, @Headers('x-paystack-signature') signature: string) {
    return this.paystackService.handleWebhook(req.rawBody, signature);
  }
}
