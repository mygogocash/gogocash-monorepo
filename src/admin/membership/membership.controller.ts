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
import { MembershipService } from './membership.service';
import {
  MembershipQueryDto,
  CreateMembershipTierDto,
  UpdateMembershipTierDto,
  ChangeTierDto,
  CancelMembershipDto,
} from './dto/membership.dto';

@ApiTags('Admin Membership')
@Controller('admin/membership')
@UseGuards(AuthAdminGuard)
@ApiSecurity('access-token')
@ApiBearerAuth()
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Get('stats')
  getStats() {
    return this.membershipService.getStats();
  }

  @Get('tiers')
  getTiers() {
    return this.membershipService.getTiers();
  }

  @Post('tiers')
  createTier(@Body() dto: CreateMembershipTierDto) {
    return this.membershipService.createTier(dto);
  }

  @Put('tiers/:id')
  updateTier(
    @Param('id') id: string,
    @Body() dto: UpdateMembershipTierDto,
  ) {
    return this.membershipService.updateTier(id, dto);
  }

  @Delete('tiers/:id')
  deleteTier(@Param('id') id: string) {
    return this.membershipService.deleteTier(id);
  }

  @Get('users')
  getMembers(@Query() query: MembershipQueryDto) {
    return this.membershipService.getMembers(query);
  }

  @Put('users/:userId/tier')
  changeTier(
    @Param('userId') userId: string,
    @Body() dto: ChangeTierDto,
  ) {
    return this.membershipService.changeTier(userId, dto.tierId);
  }

  @Put('users/:userId/cancel')
  cancelMembership(
    @Param('userId') userId: string,
    @Body() dto: CancelMembershipDto,
  ) {
    return this.membershipService.cancelMembership(userId, dto.reason);
  }
}
