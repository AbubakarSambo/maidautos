import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RoutesService } from './routes.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { Public, Roles } from '../../common';

@ApiTags('Routes')
@Controller('routes')
export class RoutesController {
  constructor(private routesService: RoutesService) {}

  @Public()
  @Get()
  findAll() {
    return this.routesService.findAll();
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.routesService.findOne(id);
  }

  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post()
  create(@Body() dto: CreateRouteDto) {
    return this.routesService.create(dto);
  }

  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch(':id/toggle')
  toggleActive(@Param('id') id: string) {
    return this.routesService.toggleActive(id);
  }

  @ApiBearerAuth()
  @Roles('SUPER_ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.routesService.remove(id);
  }

  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post(':id/stops')
  addStop(
    @Param('id') id: string,
    @Body() data: { stopId: string; distanceFromOriginKm: number; priceFromOrigin: number },
  ) {
    return this.routesService.addStop(id, data);
  }

  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch('stops/:routeStopId')
  updateStop(
    @Param('routeStopId') routeStopId: string,
    @Body() data: { priceFromOrigin?: number; distanceFromOriginKm?: number },
  ) {
    return this.routesService.updateStop(routeStopId, data);
  }

  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Delete('stops/:routeStopId')
  removeStop(@Param('routeStopId') routeStopId: string) {
    return this.routesService.removeStop(routeStopId);
  }
}
