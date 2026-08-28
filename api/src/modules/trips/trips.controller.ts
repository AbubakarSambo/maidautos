import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TripsService } from './trips.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { CreateBulkTripsDto } from './dto/create-bulk-trips.dto';
import { AddStatusUpdateDto } from './dto/add-status-update.dto';
import { Public, Roles, CurrentUser } from '../../common';
import { TripStatus } from '@prisma/client';

@ApiTags('Trips')
@Controller('trips')
export class TripsController {
  constructor(private tripsService: TripsService) {}

  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get()
  findAll(
    @Query('status') status?: TripStatus,
    @Query('date') date?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.tripsService.findAll({ status, date, dateFrom, dateTo });
  }

  @Public()
  @Get('search')
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  @ApiQuery({ name: 'date', required: true })
  search(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('date') date: string,
  ) {
    return this.tripsService.search(from, to, date);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tripsService.findOne(id);
  }

  @Public()
  @Get(':id/available-seats')
  @ApiQuery({ name: 'pickup', required: true })
  @ApiQuery({ name: 'dropoff', required: true })
  getAvailableSeats(
    @Param('id') id: string,
    @Query('pickup') pickupStopId: string,
    @Query('dropoff') dropoffStopId: string,
  ) {
    return this.tripsService.getAvailableSeats(id, pickupStopId, dropoffStopId);
  }

  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post()
  create(@Body() dto: CreateTripDto) {
    return this.tripsService.create(dto);
  }

  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post('bulk')
  createBulk(@Body() dto: CreateBulkTripsDto) {
    return this.tripsService.createBulk(dto);
  }

  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateTripDto>) {
    return this.tripsService.update(id, dto);
  }

  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: TripStatus) {
    return this.tripsService.updateStatus(id, status);
  }

  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post(':id/status-updates')
  addStatusUpdate(
    @Param('id') id: string,
    @Body() dto: AddStatusUpdateDto,
    @CurrentUser() user: any,
  ) {
    return this.tripsService.addStatusUpdate(id, dto, user.id);
  }
}
