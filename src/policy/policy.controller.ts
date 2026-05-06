import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { AuthAdminGuard } from 'src/admin/jwt-auth-admin.guard';
import { RateLimit } from 'src/auth/rate-limit.decorator';
import { RateLimitGuard } from 'src/auth/rate-limit.guard';
import { PolicyService } from './policy.service';
import { UpsertPolicyDto } from './dto/upsert-policy.dto';

/**
 * Multi-language category policy endpoints.
 *
 * - GET routes are PUBLIC — customer web reads them to render banner +
 *   terms below the offer list. Rate-limited per IP to deter scraping.
 * - PUT/DELETE require admin token.
 *
 * Schema and validation rules: see policy.schema.ts and policy.service.ts.
 */
@ApiTags('Policy')
@Controller('policy')
export class PolicyController {
  constructor(private readonly policy: PolicyService) {}

  @Get('category/:id')
  @UseGuards(RateLimitGuard)
  @RateLimit({ windowMs: 60_000, max: 60 })
  @ApiOperation({
    summary:
      'Public — fetch the policy document for a category (banner + terms, all locales).',
  })
  findByCategory(@Param('id') id: string) {
    return this.policy.findByCategory(id);
  }

  @Get('category-list')
  @UseGuards(RateLimitGuard)
  @RateLimit({ windowMs: 60_000, max: 60 })
  @ApiOperation({
    summary: 'Public — list every category that has a policy authored.',
  })
  list() {
    return this.policy.list();
  }

  @Put()
  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Admin — upsert (create or replace) a category policy.',
  })
  upsert(@Body() dto: UpsertPolicyDto) {
    return this.policy.upsert(dto);
  }

  @Delete('category/:id')
  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin — delete a category policy entirely.' })
  remove(@Param('id') id: string) {
    return this.policy.remove(id);
  }
}
