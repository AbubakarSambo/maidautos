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
  @Post('initialize/:groupId')
  async initialize(@Param('groupId') groupId: string, @CurrentUser() user: any) {
    const bookings = await this.bookingsService.findByGroupId(groupId);
    const email = user?.email || bookings[0].guestEmail;
    if (!email) throw new Error('No email available for payment');
    const totalAmountKobo = bookings.reduce((sum, b) => sum + Math.round(Number(b.amount) * 100), 0);
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
}
