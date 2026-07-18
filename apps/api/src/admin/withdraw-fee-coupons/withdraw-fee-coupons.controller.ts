import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
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
  create(@Body() dto: CreateWithdrawFeeCouponDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles('support')
  update(@Param('id') id: string, @Body() dto: UpdateWithdrawFeeCouponDto) {
    return this.service.update(id, dto);
  }
}
