import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthAdminGuard } from '../jwt-auth-admin.guard';
import { DashboardService } from './dashboard.service';
import { DashboardInsightsQueryDto } from './dto/dashboard-query.dto';

@ApiTags('Dashboard')
@Controller('admin/dashboard')
@UseGuards(AuthAdminGuard)
@ApiSecurity('access-token')
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  getStats() {
    return this.dashboardService.getStats();
  }

  @Get('summary')
  getSummary() {
    return this.dashboardService.getSummary();
  }

  @Get('insights')
  getInsights(@Query() query: DashboardInsightsQueryDto) {
    return this.dashboardService.getInsights(query.range);
  }
}
