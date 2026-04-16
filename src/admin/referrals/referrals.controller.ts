import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthAdminGuard } from '../jwt-auth-admin.guard';
import { ReferralsService } from './referrals.service';
import { ReferralQueryDto, UpdateReferralConfigDto } from './dto/referral.dto';

@ApiTags('Admin Referrals')
@Controller('admin')
@UseGuards(AuthAdminGuard)
@ApiSecurity('access-token')
@ApiBearerAuth()
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Get('referral/config')
  getConfig() {
    return this.referralsService.getConfig();
  }

  @Put('referral/config')
  updateConfig(@Body() dto: UpdateReferralConfigDto) {
    return this.referralsService.updateConfig(dto);
  }

  @Get('referrals')
  findAll(@Query() query: ReferralQueryDto) {
    return this.referralsService.findAll(query);
  }

  @Get('referrals/:userId/tree')
  getTree(@Param('userId') userId: string) {
    return this.referralsService.getTree(userId);
  }

  @Put('referrals/:id/approve')
  approve(@Param('id') id: string) {
    return this.referralsService.approve(id);
  }

  @Put('referrals/:id/reject')
  reject(@Param('id') id: string) {
    return this.referralsService.reject(id);
  }
}
