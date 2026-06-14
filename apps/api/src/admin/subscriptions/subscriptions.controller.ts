import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthAdminGuard } from '../jwt-auth-admin.guard';
import { RolesGuard } from '../roles.guard';
import { Roles } from '../roles.decorator';
import { SubscriptionsService } from './subscriptions.service';
import {
  SubscriptionQueryDto,
  CreateSubscriptionPlanDto,
  UpdateSubscriptionPlanDto,
  SubscriptionActionDto,
} from './dto/subscription.dto';

@ApiTags('Admin Subscriptions')
@Controller('admin/subscription')
@UseGuards(AuthAdminGuard, RolesGuard)
@Roles('superadmin') // pricing/plan config + grant subscription days
@ApiSecurity('access-token')
@ApiBearerAuth()
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  @Get('stats')
  getStats() {
    return this.subscriptionsService.getStats();
  }

  @Get('plans')
  getPlans() {
    return this.subscriptionsService.getPlans();
  }

  @Post('plans')
  createPlan(@Body() dto: CreateSubscriptionPlanDto) {
    return this.subscriptionsService.createPlan(dto);
  }

  @Put('plans/:id')
  updatePlan(
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionPlanDto,
  ) {
    return this.subscriptionsService.updatePlan(id, dto);
  }

  @Delete('plans/:id')
  deletePlan(@Param('id') id: string) {
    return this.subscriptionsService.deletePlan(id);
  }

  @Get('subscriptions')
  getSubscriptions(@Query() query: SubscriptionQueryDto) {
    return this.subscriptionsService.getSubscriptions(query);
  }

  @Get('subscriptions/:id')
  getDetail(@Param('id') id: string) {
    return this.subscriptionsService.getDetail(id);
  }

  @Put('subscriptions/:id/:action')
  performAction(
    @Param('id') id: string,
    @Param('action') action: string,
    @Body() dto: SubscriptionActionDto,
  ) {
    return this.subscriptionsService.performAction(id, action, dto.days);
  }
}
