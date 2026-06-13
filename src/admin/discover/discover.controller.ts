import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthAdminGuard } from '../jwt-auth-admin.guard';
import { RolesGuard } from '../roles.guard';
import { Roles } from '../roles.decorator';
import { DiscoverService } from './discover.service';

@ApiTags('Discover')
@Controller('admin/discover')
@UseGuards(AuthAdminGuard, RolesGuard)
@Roles('support') // controls what users see in Discover (content/UX)
@ApiSecurity('access-token')
@ApiBearerAuth()
export class DiscoverController {
  constructor(private readonly discoverService: DiscoverService) {}

  @Get('sections')
  getSections() {
    return this.discoverService.getSections();
  }

  @Put('sections/:type/reorder')
  reorderItems(@Param('type') type: string, @Body() body: { order: string[] }) {
    return this.discoverService.reorderItems(type, body.order);
  }

  @Post('sections/:type/items')
  addItem(@Param('type') type: string, @Body() body: { offer_id: string; custom_title?: string }) {
    return this.discoverService.addItem(type, body);
  }

  @Put('sections/:type/items/:id')
  updateItem(
    @Param('type') type: string,
    @Param('id') id: string,
    @Body() body: { custom_title?: string; sort_order?: number },
  ) {
    return this.discoverService.updateItem(type, id, body);
  }

  @Delete('sections/:type/items/:id')
  deleteItem(@Param('type') type: string, @Param('id') id: string) {
    return this.discoverService.deleteItem(type, id);
  }
}
