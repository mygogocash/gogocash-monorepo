import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthAdminGuard } from '../jwt-auth-admin.guard';
import { RolesGuard } from '../roles.guard';
import { Roles } from '../roles.decorator';
import { AdminActivityService } from './admin-activity.service';

@ApiTags('Admin Activity')
@Controller('admin/activity')
@UseGuards(AuthAdminGuard, RolesGuard)
@ApiSecurity('access-token')
@ApiBearerAuth()
export class AdminActivityController {
  constructor(private readonly activityService: AdminActivityService) {}

  @Get()
  @Roles('support')
  list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('actor_id') actor_id?: string,
    @Query('action') action?: string,
    @Query('entity_type') entity_type?: string,
    @Query('entity_id') entity_id?: string,
    @Query('search') search?: string,
  ) {
    return this.activityService.list({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      from,
      to,
      actor_id,
      action,
      entity_type,
      entity_id,
      search,
    });
  }
}
