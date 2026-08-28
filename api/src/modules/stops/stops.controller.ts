import { Controller, Get, Post, Patch, Delete, Body, Param, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { StopsService } from './stops.service';
import { CreateStopDto } from './dto/create-stop.dto';
import { Public, Roles } from '../../common';

@ApiTags('Stops')
@Controller('stops')
export class StopsController {
  constructor(private stopsService: StopsService) {}

  @Public()
  @Get()
  findAll() {
    return this.stopsService.findAll();
  }

  @Public()
  @Get('active')
  findActive() {
    return this.stopsService.findActive();
  }

  @Public()
  @Get('destinations')
  findDestinations(@Query('from') from: string) {
    if (!from) throw new BadRequestException('Query param "from" is required');
    return this.stopsService.findDestinationsFrom(from);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.stopsService.findOne(id);
  }

  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post()
  create(@Body() dto: CreateStopDto) {
    return this.stopsService.create(dto);
  }

  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateStopDto>) {
    return this.stopsService.update(id, dto);
  }

  @ApiBearerAuth()
  @Roles('SUPER_ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.stopsService.remove(id);
  }
}
