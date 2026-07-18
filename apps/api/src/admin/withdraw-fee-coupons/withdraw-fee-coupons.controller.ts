import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthAdminGuard } from '../jwt-auth-admin.guard';
import { RolesGuard } from '../roles.guard';
import { Roles } from '../roles.decorator';
import { WithdrawFeeCouponsService } from './withdraw-fee-coupons.service';
import {
  CreateWithdrawFeeCouponDto,
  UpdateWithdrawFeeCouponDto,
} from './dto/withdraw-fee-coupon.dto';

@ApiTags('Withdraw Fee Coupons')
@Controller('admin/withdraw-fee-coupons')
@UseGuards(AuthAdminGuard, RolesGuard)
@ApiSecurity('access-token')
@ApiBearerAuth()
export class WithdrawFeeCouponsController {
  constructor(private readonly service: WithdrawFeeCouponsService) {}

  @Get()
  list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
    });
  }

  @Post()
  @Roles('support')
  create(@Req() req: Request, @Body() dto: CreateWithdrawFeeCouponDto) {
    const admin = req['user'] as
      | { sub?: string; email?: string; username?: string }
      | undefined;
    return this.service.create(dto, {
      id: admin?.sub,
      label: admin?.email || admin?.username,
    });
  }

  @Patch(':id')
  @Roles('support')
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateWithdrawFeeCouponDto,
  ) {
    const admin = req['user'] as
      | { sub?: string; email?: string; username?: string }
      | undefined;
    return this.service.update(id, dto, {
      id: admin?.sub,
      label: admin?.email || admin?.username,
    });
  }
}
