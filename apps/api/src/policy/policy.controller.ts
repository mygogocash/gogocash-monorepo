import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { AuthAdminGuard } from 'src/admin/jwt-auth-admin.guard';
import { Roles } from 'src/admin/roles.decorator';
import { RolesGuard } from 'src/admin/roles.guard';
import { RateLimit } from 'src/auth/rate-limit.decorator';
import { RateLimitGuard } from 'src/auth/rate-limit.guard';
import { AggregatePolicyCommandDto } from './dto/aggregate-policy.dto';
import { PolicyAggregateService } from './policy-aggregate.service';
import { PolicyTransactionCapabilityGuard } from './policy-transaction-capability.guard';
import { PolicyService } from './policy.service';
import { UpsertPolicyDto } from './dto/upsert-policy.dto';
import { CategoryLifecycleCommandDto } from './dto/category-lifecycle-command.dto';
import { CategoryIntegrityService } from './category-integrity.service';
import { CategoryIntegrityReadinessGuard } from './category-integrity-readiness.guard';

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
  constructor(
    private readonly policy: PolicyService,
    private readonly aggregatePolicy: PolicyAggregateService,
    private readonly categoryIntegrity: CategoryIntegrityService,
  ) {}

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

  @Get('aggregate-capability')
  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Admin — report whether MongoDB can run aggregate transactions.',
  })
  aggregateCapability() {
    return this.aggregatePolicy.getTransactionCapability(true);
  }

  @Put('aggregate')
  @UseGuards(
    AuthAdminGuard,
    RolesGuard,
    PolicyTransactionCapabilityGuard,
    CategoryIntegrityReadinessGuard,
  )
  @Roles('support')
  @UseInterceptors(
    FileInterceptor('default_banner', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Admin — atomically create/update category metadata and its localized policy.',
  })
  aggregate(
    @Body() dto: AggregatePolicyCommandDto,
    @UploadedFile() defaultBanner?: Express.Multer.File,
  ) {
    if (defaultBanner && !defaultBanner.mimetype?.startsWith('image/')) {
      throw new BadRequestException('Default banner must be an image file');
    }
    return this.aggregatePolicy.execute(dto, defaultBanner);
  }

  @Put()
  @UseGuards(AuthAdminGuard, RolesGuard)
  @Roles('support')
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Admin — upsert (create or replace) a category policy.',
  })
  upsert(@Body() dto: UpsertPolicyDto) {
    return this.categoryIntegrity.withNormalWrite({
      legacy: () => this.policy.upsert(dto),
      enforced: () =>
        this.categoryIntegrity.withPolicyContentMutation(
          dto.category_id,
          (session) => this.policy.upsert(dto, session),
        ),
    });
  }

  @Post('category/:id/delete-content')
  @UseGuards(AuthAdminGuard, RolesGuard, CategoryIntegrityReadinessGuard)
  // Approver+: hard-deletes every locale's policy content with no revision
  // history (#377), matching the offer-delete tier.
  @Roles('approver')
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Admin — delete policy content/media while keeping the category.',
  })
  deleteContent(
    @Param('id') id: string,
    @Body() dto: CategoryLifecycleCommandDto,
  ) {
    return this.categoryIntegrity.deleteContent(id, dto);
  }

  @Post('category/:id/retire')
  @UseGuards(AuthAdminGuard, RolesGuard, CategoryIntegrityReadinessGuard)
  @Roles('support')
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin — retire an unused policy category.' })
  retire(@Param('id') id: string, @Body() dto: CategoryLifecycleCommandDto) {
    return this.categoryIntegrity.retire(id, dto);
  }

  @Post('category/:id/purge')
  @UseGuards(AuthAdminGuard, RolesGuard, CategoryIntegrityReadinessGuard)
  @Roles('superadmin')
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Superadmin — purge a retired category after retention.',
  })
  purge(@Param('id') id: string, @Body() dto: CategoryLifecycleCommandDto) {
    return this.categoryIntegrity.purge(id, dto);
  }

  @Delete('category/:id')
  @UseGuards(AuthAdminGuard, RolesGuard)
  // Same content deletion as delete-content, so the tier moves in lockstep
  // (#377).
  @Roles('approver')
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Admin compatibility — delete policy content while keeping the category.',
  })
  remove(@Param('id') id: string) {
    return this.categoryIntegrity.withNormalWrite({
      legacy: () => this.policy.remove(id),
      enforced: async () => {
        const result = await this.categoryIntegrity.deleteContentLegacy(id);
        return { deleted: result.policy_deleted === true };
      },
    });
  }
}
