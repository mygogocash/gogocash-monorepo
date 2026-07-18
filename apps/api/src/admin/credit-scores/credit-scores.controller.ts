import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthAdminGuard } from '../jwt-auth-admin.guard';
import { RolesGuard } from '../roles.guard';
import { Roles } from '../roles.decorator';
import { CreditScoresService } from './credit-scores.service';
import {
  CreditScoreQueryDto,
  UpdateCreditScoreConfigDto,
  OverrideCreditScoreDto,
} from './dto/credit-score.dto';
import { requireAdminActor } from '../activity/admin-activity.actor';

@ApiTags('Admin Credit Scores')
@Controller('admin/credit-scores')
@UseGuards(AuthAdminGuard, RolesGuard)
@ApiSecurity('access-token')
@ApiBearerAuth()
export class CreditScoresController {
  constructor(private readonly creditScoresService: CreditScoresService) {}

  @Get()
  findAll(@Query() query: CreditScoreQueryDto) {
    return this.creditScoresService.findAll(query);
  }

  @Get('config')
  getConfig() {
    return this.creditScoresService.getConfig();
  }

  @Roles('superadmin')
  @Put('config')
  updateConfig(@Body() dto: UpdateCreditScoreConfigDto, @Req() req: Request) {
    return this.creditScoresService.updateConfig(dto, requireAdminActor(req));
  }

  @Get(':userId')
  getUserDetail(@Param('userId') userId: string) {
    return this.creditScoresService.getUserDetail(userId);
  }

  @Get(':userId/audit')
  getAudit(@Param('userId') userId: string) {
    return this.creditScoresService.getAudit(userId);
  }

  @Roles('approver')
  @Put(':userId/override')
  override(
    @Param('userId') userId: string,
    @Body() dto: OverrideCreditScoreDto,
    @Req() req: Request,
  ) {
    return this.creditScoresService.override(
      userId,
      dto.newScore,
      dto.reason,
      requireAdminActor(req),
    );
  }
}
