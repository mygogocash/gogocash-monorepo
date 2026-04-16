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
import { CreditScoresService } from './credit-scores.service';
import {
  CreditScoreQueryDto,
  UpdateCreditScoreConfigDto,
  OverrideCreditScoreDto,
} from './dto/credit-score.dto';

@ApiTags('Admin Credit Scores')
@Controller('admin/credit-scores')
@UseGuards(AuthAdminGuard)
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

  @Put('config')
  updateConfig(@Body() dto: UpdateCreditScoreConfigDto) {
    return this.creditScoresService.updateConfig(dto);
  }

  @Get(':userId')
  getUserDetail(@Param('userId') userId: string) {
    return this.creditScoresService.getUserDetail(userId);
  }

  @Get(':userId/audit')
  getAudit(@Param('userId') userId: string) {
    return this.creditScoresService.getAudit(userId);
  }

  @Put(':userId/override')
  override(
    @Param('userId') userId: string,
    @Body() dto: OverrideCreditScoreDto,
    @Req() req: Request,
  ) {
    const admin = req['user'] as any;
    const adminId = admin?.sub ?? '';
    return this.creditScoresService.override(
      userId,
      dto.newScore,
      dto.reason,
      adminId,
    );
  }
}
