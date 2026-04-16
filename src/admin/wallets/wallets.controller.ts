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
import { WalletsService } from './wallets.service';
import { WalletQueryDto, WalletAdjustDto } from './dto/wallet.dto';

@ApiTags('Admin Wallets')
@Controller('admin/wallets')
@UseGuards(AuthAdminGuard)
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

  @Put(':userId/freeze')
  freeze(@Param('userId') userId: string) {
    return this.walletsService.freeze(userId);
  }

  @Put(':userId/unfreeze')
  unfreeze(@Param('userId') userId: string) {
    return this.walletsService.unfreeze(userId);
  }

  @Post(':userId/adjust')
  adjust(
    @Param('userId') userId: string,
    @Body() dto: WalletAdjustDto,
    @Req() req: Request,
  ) {
    const admin = req['user'] as any;
    const adminId = admin?.sub ?? '';
    const adminName = admin?.username ?? admin?.email ?? '';
    return this.walletsService.adjust(userId, dto, adminId, adminName);
  }
}
