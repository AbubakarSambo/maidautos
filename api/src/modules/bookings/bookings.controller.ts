import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { Public, Roles, CurrentUser } from '../../common';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get()
  findAll(
    @Query('tripId') tripId?: string,
    @Query('userId') userId?: string,
    @Query('status') status?: string,
  ) {
    return this.bookingsService.findAll({ tripId, userId, status });
  }

  @ApiBearerAuth()
  @Get('my')
  findMyBookings(@CurrentUser() user: any) {
    return this.bookingsService.findMyBookings(user.id);
  }

  @Public()
  @Get('ticket/:code')
  findByTicketCode(@Param('code') code: string) {
    return this.bookingsService.findByTicketCode(code);
  }

  // Public because groupId is an opaque, unguessable token — same exposure model as ticket codes.
  @Public()
  @Get('group/:groupId')
  findByGroupId(@Param('groupId') groupId: string) {
    return this.bookingsService.findByGroupId(groupId);
  }

  @ApiBearerAuth()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bookingsService.findOne(id);
  }

  // Handles authenticated + guest bookings (no @ApiBearerAuth guard, auth is optional)
  @Public()
  @Post()
  create(@Body() dto: CreateBookingDto, @CurrentUser() user: any) {
    return this.bookingsService.create(dto, user);
  }

  @ApiBearerAuth()
  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: any) {
    return this.bookingsService.cancel(id, user);
  }

  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch(':id/record-payment')
  recordCashPayment(@Param('id') id: string, @CurrentUser() user: any) {
    return this.bookingsService.recordCashPayment(id, user.id);
  }
}
