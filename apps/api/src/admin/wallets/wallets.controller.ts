import {
  Controller,
  Get,
  Post,
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
import { WalletsService } from './wallets.service';
import { WalletQueryDto, WalletAdjustDto } from './dto/wallet.dto';
import { requireAdminActor } from '../activity/admin-activity.actor';

@ApiTags('Admin Wallets')
@Controller('admin/wallets')
@UseGuards(AuthAdminGuard, RolesGuard)
@ApiSecurity('access-token')
@ApiBearerAuth()
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get()
  findAll(@Query() query: WalletQueryDto) {
    return this.walletsService.findAll(query);
  }

  @Get(':userId')
  findOne(@Param('userId') userId: string) {
    return this.walletsService.findOne(userId);
  }

  @Get(':userId/adjustments')
  getAdjustments(@Param('userId') userId: string) {
    return this.walletsService.getAdjustments(userId);
  }

  @Roles('approver')
  @Put(':userId/freeze')
  freeze(@Param('userId') userId: string, @Req() req: Request) {
    return this.walletsService.freeze(userId, requireAdminActor(req));
  }

  @Roles('approver')
  @Put(':userId/unfreeze')
  unfreeze(@Param('userId') userId: string, @Req() req: Request) {
    return this.walletsService.unfreeze(userId, requireAdminActor(req));
  }

  // Direct balance credit/debit — highest-trust money action.
  @Roles('superadmin')
  @Post(':userId/adjust')
  adjust(
    @Param('userId') userId: string,
    @Body() dto: WalletAdjustDto,
    @Req() req: Request,
  ) {
    return this.walletsService.adjust(userId, dto, requireAdminActor(req));
  }
}
