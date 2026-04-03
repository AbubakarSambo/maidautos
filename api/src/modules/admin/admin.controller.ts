import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { Roles } from '../../common';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboardStats();
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get('reports/revenue-by-route')
  getRevenueByRoute(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.adminService.getRevenueByRoute(startDate, endDate);
  }
}
