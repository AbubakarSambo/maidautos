import { Controller, Post, Get, Body, Param, Headers, RawBodyRequest, Req, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { PaystackService } from './paystack.service';
import { Public, OptionalAuth, Roles, CurrentUser } from '../../common';
import { BookingsService } from '../bookings/bookings.service';

@ApiTags('Paystack')
@Controller('paystack')
export class PaystackController {
  constructor(
    private paystackService: PaystackService,
    private bookingsService: BookingsService,
  ) {}

  @OptionalAuth()
  @Post('initialize/:groupId')
  async initialize(@Param('groupId') groupId: string, @CurrentUser() user: any) {
    // For a booking change this is the change fee + fare difference, not the ticket value.
    const { bookings, email: bookingEmail, totalAmountKobo } = await this.bookingsService.findGroupForPayment(groupId);
    if (bookings.some((b) => b.paymentStatus === 'PAID')) throw new BadRequestException('This booking is already paid');
    const email = user?.email || bookingEmail;
    if (!email) throw new BadRequestException('An email address is needed to pay online');
    return this.paystackService.initializePayment(groupId, email, totalAmountKobo);
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

  // Manual admin fallback for when neither the webhook nor the browser-return
  // callback confirmed a payment (e.g. missed/misconfigured webhook, customer
  // paid via bank transfer and never returned to the app).
  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post('re-verify/:bookingId')
  async reVerify(@Param('bookingId') bookingId: string) {
    const booking = await this.bookingsService.findOne(bookingId);
    if (!booking.paystackReference) throw new BadRequestException('Booking has no Paystack reference');
    return this.paystackService.verifyPayment(booking.paystackReference);
  }
}
