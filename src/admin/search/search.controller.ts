import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthAdminGuard } from '../jwt-auth-admin.guard';
import { SearchService } from './search.service';
import {
  CreateFeaturedTermDto,
  UpdateFeaturedTermDto,
  ReorderTermsDto,
  CreateBoostRuleDto,
  UpdateBoostRuleDto,
  CreateBlacklistDto,
  BulkImportBlacklistDto,
} from './dto/search.dto';

@ApiTags('Search Config')
@Controller('admin/search')
@UseGuards(AuthAdminGuard)
@ApiSecurity('access-token')
@ApiBearerAuth()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  // ── Featured Terms ──
  @Get('featured-terms')
  getFeaturedTerms() {
    return this.searchService.getFeaturedTerms();
  }

  @Post('featured-terms')
  createFeaturedTerm(@Body() dto: CreateFeaturedTermDto) {
    return this.searchService.createFeaturedTerm(dto);
  }

  @Put('featured-terms/reorder')
  reorderFeaturedTerms(@Body() dto: ReorderTermsDto) {
    return this.searchService.reorderFeaturedTerms(dto.order);
  }

  @Put('featured-terms/:id')
  updateFeaturedTerm(@Param('id') id: string, @Body() dto: UpdateFeaturedTermDto) {
    return this.searchService.updateFeaturedTerm(id, dto);
  }

  @Delete('featured-terms/:id')
  deleteFeaturedTerm(@Param('id') id: string) {
    return this.searchService.deleteFeaturedTerm(id);
  }

  // ── Boost Rules ──
  @Get('boost-rules')
  getBoostRules() {
    return this.searchService.getBoostRules();
  }

  @Post('boost-rules')
  createBoostRule(@Body() dto: CreateBoostRuleDto) {
    return this.searchService.createBoostRule(dto);
  }

  @Put('boost-rules/:id')
  updateBoostRule(@Param('id') id: string, @Body() dto: UpdateBoostRuleDto) {
    return this.searchService.updateBoostRule(id, dto);
  }

  @Delete('boost-rules/:id')
  deleteBoostRule(@Param('id') id: string) {
    return this.searchService.deleteBoostRule(id);
  }

  // ── Blacklist ──
  @Get('blacklist')
  getBlacklist() {
    return this.searchService.getBlacklist();
  }

  @Post('blacklist')
  createBlacklistEntry(@Body() dto: CreateBlacklistDto) {
    return this.searchService.createBlacklistEntry(dto);
  }

  @Delete('blacklist/:id')
  deleteBlacklistEntry(@Param('id') id: string) {
    return this.searchService.deleteBlacklistEntry(id);
  }

  @Post('blacklist/import')
  bulkImportBlacklist(@Body() dto: BulkImportBlacklistDto) {
    return this.searchService.bulkImportBlacklist(dto.keywords);
  }
}
