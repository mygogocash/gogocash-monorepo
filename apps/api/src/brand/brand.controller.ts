import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { BrandService } from './brand.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { ListBrandsDto } from './dto/list-brands.dto';
import { AuthAdminGuard } from '../admin/jwt-auth-admin.guard';

@ApiTags('Brand')
@Controller('brand')
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  /**
   * Customer-facing variant resolver.
   *
   * `GET /brand/resolve/:slug?country=Thailand` returns the brand plus the variant
   * selected for that country (exact-match → default_country → first variant).
   * Used by the customer app's `/open/brand/:slug` deep-link route so the right
   * tracking link is opened without a client-side join.
   */
  @Get('resolve/:slug')
  resolveVariant(
    @Param('slug') slug: string,
    @Query('country') country?: string,
  ) {
    return this.brandService.resolveVariant(slug, country ?? null);
  }

  // ─── Admin-only routes ─────────────────────────────────────────────────────

  @UseGuards(AuthAdminGuard)
  @ApiBearerAuth()
  @ApiSecurity('access-token')
  @Get()
  list(@Query() query: ListBrandsDto) {
    return this.brandService.list(query);
  }

  @UseGuards(AuthAdminGuard)
  @ApiBearerAuth()
  @ApiSecurity('access-token')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.brandService.findOne(id);
  }

  @UseGuards(AuthAdminGuard)
  @ApiBearerAuth()
  @ApiSecurity('access-token')
  @ApiBody({ type: CreateBrandDto })
  @Post()
  create(@Body() dto: CreateBrandDto) {
    return this.brandService.create(dto);
  }

  @UseGuards(AuthAdminGuard)
  @ApiBearerAuth()
  @ApiSecurity('access-token')
  @ApiBody({ type: UpdateBrandDto })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBrandDto) {
    return this.brandService.update(id, dto);
  }

  @UseGuards(AuthAdminGuard)
  @ApiBearerAuth()
  @ApiSecurity('access-token')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.brandService.softDelete(id);
  }
}
