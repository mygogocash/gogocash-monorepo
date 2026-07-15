import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { AuthAdminGuard } from 'src/admin/jwt-auth-admin.guard';
import { RateLimit } from 'src/auth/rate-limit.decorator';
import { RateLimitGuard } from 'src/auth/rate-limit.guard';
import { CouponInsightsService } from './coupon-insights.service';
import {
  CouponInsightsQueryDto,
  RecordCouponEngagementDto,
  RecordCouponRedemptionDto,
} from './dto/coupon-activity.dto';

@ApiTags('Coupon insights')
@Controller('offer/coupons')
export class CouponInsightsController {
  constructor(private readonly couponInsights: CouponInsightsService) {}

  @Post(':couponId/events')
  @UseGuards(RateLimitGuard)
  @RateLimit({ windowMs: 60_000, max: 120 })
  @ApiOperation({
    summary:
      'Record one idempotent public coupon view or successful code copy.',
  })
  recordEngagement(
    @Param('couponId') couponId: string,
    @Body() dto: RecordCouponEngagementDto,
  ) {
    return this.couponInsights.recordEngagement(couponId, dto);
  }

  @Post(':couponId/redemptions')
  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Record one trusted, idempotent confirmed redemption from a merchant or operations integration.',
  })
  recordRedemption(
    @Param('couponId') couponId: string,
    @Body() dto: RecordCouponRedemptionDto,
  ) {
    return this.couponInsights.recordRedemption(couponId, dto);
  }

  @Get(':couponId/insights')
  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Load real per-coupon engagement and confirmed redemption metrics.',
  })
  getInsights(
    @Param('couponId') couponId: string,
    @Query() query: CouponInsightsQueryDto,
  ) {
    return this.couponInsights.getInsights(couponId, query);
  }
}
