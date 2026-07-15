import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthAdminGuard } from '../jwt-auth-admin.guard';
import { RolesGuard } from '../roles.guard';
import { Roles } from '../roles.decorator';
import { SearchService } from './search.service';
import {
  CreateFeaturedTermDto,
  UpdateFeaturedTermDto,
  ReorderTermsDto,
  CreateBoostRuleDto,
  UpdateBoostRuleDto,
  CreateBlacklistDto,
  BulkImportBlacklistDto,
  CreateSearchRuleDto,
  UpdateSearchRuleDto,
} from './dto/search.dto';

@ApiTags('Search Config')
@Controller('admin/search')
@UseGuards(AuthAdminGuard, RolesGuard)
// Reads are open to any authenticated admin (RolesGuard is a no-op without
// @Roles metadata); writes control user-facing search results, so every
// mutation handler below stays support-gated via a per-route @Roles('support').
@ApiSecurity('access-token')
@ApiBearerAuth()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  // ── Persistent, offer-targeted rules ──
  @Get('rules')
  getRules() {
    return this.searchService.getRules();
  }

  @Post('rules')
  @Roles('support')
  createRule(@Body() dto: CreateSearchRuleDto) {
    return this.searchService.createRule(dto);
  }

  @Put('rules/:id')
  @Roles('support')
  updateRule(@Param('id') id: string, @Body() dto: UpdateSearchRuleDto) {
    return this.searchService.updateRule(id, dto);
  }

  @Delete('rules/:id')
  @Roles('support')
  deleteRule(@Param('id') id: string) {
    return this.searchService.deleteRule(id);
  }

  // ── Featured Terms ──
  @Get('featured-terms')
  getFeaturedTerms() {
    return this.searchService.getFeaturedTerms();
  }

  @Post('featured-terms')
  @Roles('support')
  createFeaturedTerm(@Body() dto: CreateFeaturedTermDto) {
    return this.searchService.createFeaturedTerm(dto);
  }

  @Put('featured-terms/reorder')
  @Roles('support')
  reorderFeaturedTerms(@Body() dto: ReorderTermsDto) {
    return this.searchService.reorderFeaturedTerms(dto.order);
  }

  @Put('featured-terms/:id')
  @Roles('support')
  updateFeaturedTerm(
    @Param('id') id: string,
    @Body() dto: UpdateFeaturedTermDto,
  ) {
    return this.searchService.updateFeaturedTerm(id, dto);
  }

  @Delete('featured-terms/:id')
  @Roles('support')
  deleteFeaturedTerm(@Param('id') id: string) {
    return this.searchService.deleteFeaturedTerm(id);
  }

  // ── Boost Rules ──
  @Get('boost-rules')
  getBoostRules() {
    return this.searchService.getBoostRules();
  }

  @Post('boost-rules')
  @Roles('support')
  createBoostRule(@Body() dto: CreateBoostRuleDto) {
    return this.searchService.createBoostRule(dto);
  }

  @Put('boost-rules/:id')
  @Roles('support')
  updateBoostRule(@Param('id') id: string, @Body() dto: UpdateBoostRuleDto) {
    return this.searchService.updateBoostRule(id, dto);
  }

  @Delete('boost-rules/:id')
  @Roles('support')
  deleteBoostRule(@Param('id') id: string) {
    return this.searchService.deleteBoostRule(id);
  }

  // ── Blacklist ──
  @Get('blacklist')
  getBlacklist() {
    return this.searchService.getBlacklist();
  }

  @Post('blacklist')
  @Roles('support')
  createBlacklistEntry(@Body() dto: CreateBlacklistDto) {
    return this.searchService.createBlacklistEntry(dto);
  }

  @Delete('blacklist/:id')
  @Roles('support')
  deleteBlacklistEntry(@Param('id') id: string) {
    return this.searchService.deleteBlacklistEntry(id);
  }

  @Post('blacklist/import')
  @Roles('support')
  bulkImportBlacklist(@Body() dto: BulkImportBlacklistDto) {
    return this.searchService.bulkImportBlacklist(dto.keywords);
  }
}
