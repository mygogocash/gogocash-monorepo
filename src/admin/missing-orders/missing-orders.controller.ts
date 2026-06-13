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
import { MissingOrdersService } from './missing-orders.service';
import {
  MissingOrderQueryDto,
  ApproveRejectDto,
  AssignDto,
  AddNoteDto,
} from './dto/missing-order.dto';

@ApiTags('Admin Missing Orders')
@Controller('admin/missing-orders')
@UseGuards(AuthAdminGuard, RolesGuard)
@ApiSecurity('access-token')
@ApiBearerAuth()
export class MissingOrdersController {
  constructor(
    private readonly missingOrdersService: MissingOrdersService,
  ) {}

  @Get('stats')
  getStats() {
    return this.missingOrdersService.getStats();
  }

  @Get()
  findAll(@Query() query: MissingOrderQueryDto) {
    return this.missingOrdersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.missingOrdersService.findOne(id);
  }

  // Approving a missing order grants the claimed cashback (money decision).
  @Roles('approver')
  @Put(':id/approve')
  approve(@Param('id') id: string, @Body() dto: ApproveRejectDto) {
    return this.missingOrdersService.approve(id, dto.note);
  }

  @Roles('approver')
  @Put(':id/reject')
  reject(@Param('id') id: string, @Body() dto: ApproveRejectDto) {
    return this.missingOrdersService.reject(id, dto.note);
  }

  @Roles('approver')
  @Put(':id/assign')
  assign(@Param('id') id: string, @Body() dto: AssignDto) {
    return this.missingOrdersService.assign(id, dto.admin_id);
  }

  @Post(':id/notes')
  addNote(
    @Param('id') id: string,
    @Body() dto: AddNoteDto,
    @Req() req: Request,
  ) {
    const admin = req['user'] as any;
    const adminId = admin?.sub ?? '';
    const adminName = admin?.username ?? admin?.email ?? '';
    return this.missingOrdersService.addNote(
      id,
      adminId,
      adminName,
      dto.text,
    );
  }
}
