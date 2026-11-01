import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ManageBookingLookupDto, ChangeBookingDto } from './dto/manage-booking.dto';
import { ReassignBookingDto } from './dto/reassign-booking.dto';
import { Public, OptionalAuth, Roles, CurrentUser } from '../../common';

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
  @OptionalAuth()
  @Post()
  create(@Body() dto: CreateBookingDto, @CurrentUser() user: any) {
    return this.bookingsService.create(dto, user);
  }

  // Self-service "manage booking". Logged-in owners need only the ticket code; guests
  // also prove ownership with the booking's email or phone. POST so contact details
  // stay out of URLs/logs.
  @OptionalAuth()
  @Post('manage/lookup')
  manageLookup(@Body() dto: ManageBookingLookupDto, @CurrentUser() user: any) {
    return this.bookingsService.lookupForManagement(dto, user);
  }

  @OptionalAuth()
  @Post('manage/quote')
  manageQuote(@Body() dto: ChangeBookingDto, @CurrentUser() user: any) {
    return this.bookingsService.quoteChange(dto, user);
  }

  // Holds the new seat and returns a groupId; the client then pays via
  // POST /paystack/initialize/:groupId, and the change completes once payment confirms.
  @OptionalAuth()
  @Post('manage/change')
  manageChange(@Body() dto: ChangeBookingDto, @CurrentUser() user: any) {
    return this.bookingsService.createChange(dto, user);
  }

  @ApiBearerAuth()
  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: any) {
    return this.bookingsService.cancel(id, user);
  }

  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch(':id/reassign')
  reassign(@Param('id') id: string, @Body() dto: ReassignBookingDto, @CurrentUser() user: any) {
    return this.bookingsService.reassign(id, dto, user.id);
  }

  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch(':id/resolve-paid-without-seat')
  resolvePaidWithoutSeat(@Param('id') id: string, @CurrentUser() user: any) {
    return this.bookingsService.resolvePaidWithoutSeat(id, user.id);
  }

  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch(':id/record-payment')
  recordCashPayment(@Param('id') id: string, @CurrentUser() user: any) {
    return this.bookingsService.recordCashPayment(id, user.id);
  }
}
