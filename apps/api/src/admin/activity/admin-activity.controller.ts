import {
  Controller,
  Get,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthAdminGuard } from '../jwt-auth-admin.guard';
import { RolesGuard } from '../roles.guard';
import { Roles } from '../roles.decorator';
import { AdminActivityService } from './admin-activity.service';
import { ListAdminActivityQueryDto } from './dto/list-admin-activity-query.dto';

@ApiTags('Admin Activity')
@Controller('admin/activity')
@UseGuards(AuthAdminGuard, RolesGuard)
@ApiSecurity('access-token')
@ApiBearerAuth()
export class AdminActivityController {
  constructor(private readonly activityService: AdminActivityService) {}

  @Get()
  @Roles('viewer')
  list(
    @Query(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    query: ListAdminActivityQueryDto,
  ) {
    return this.activityService.list(query);
  }
}
