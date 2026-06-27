import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthAdminGuard } from '../jwt-auth-admin.guard';
import { RolesGuard } from '../roles.guard';
import { Roles } from '../roles.decorator';
import { CommissionManagementService } from './commission-management.service';
import { FetchBestCommissionDto } from './dto/fetch-best.dto';
import { UpdateCommissionDeeplinkDto } from './dto/update-deeplink.dto';

@ApiTags('Commission Management')
@Controller('admin/commission-management')
@UseGuards(AuthAdminGuard, RolesGuard)
@Roles('support')
@ApiSecurity('access-token')
@ApiBearerAuth()
export class CommissionManagementController {
  constructor(
    private readonly commissionManagementService: CommissionManagementService,
  ) {}

  @Get('networks')
  getNetworks() {
    return this.commissionManagementService.getNetworks();
  }

  @Get('brands')
  listBrands(@Query('networkId') networkId?: string) {
    return this.commissionManagementService.listBrands(networkId);
  }

  @Post('fetch-best')
  @Roles('approver')
  fetchBest(@Body() body: FetchBestCommissionDto) {
    return this.commissionManagementService.fetchBest(body);
  }

  @Patch('deeplink')
  @Roles('approver')
  updateDeeplink(@Body() body: UpdateCommissionDeeplinkDto) {
    return this.commissionManagementService.updateDeeplink(body);
  }
}
