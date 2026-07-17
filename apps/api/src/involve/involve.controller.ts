import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { InvolveService } from './involve.service';
import { ConversionIngestService } from './conversion-ingest.service';
import { InvolvePostbackTokenGuard } from './involve-postback-token.guard';
import { sanitizePostbackQuery } from './involve-postback.mapper';
import {
  // ConversionData,
  CreateAffiliateAiDto,
  CreateAffiliateDto,
  RequestGetConversion,
} from './dto/create-involve.dto';
import { UpdateInvolveDto } from './dto/update-involve.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { AuthAdminGuard } from 'src/admin/jwt-auth-admin.guard';
import { Request } from 'express';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth.guard';
import { ApiKeyGuard } from 'src/common/api-key.guard';
import { AnalyticsService } from 'src/analytics/analytics.service';
import { extractAnalyticsContext } from 'src/analytics/analytics-context';
import { RateLimit } from 'src/auth/rate-limit.decorator';
import { RateLimitGuard } from 'src/auth/rate-limit.guard';

/** Product-safe mint budget: ten authenticated attempts per edge IP/minute. */
export const CREATE_AFFILIATE_RATE_LIMIT = {
  windowMs: 60_000,
  max: 10,
} as const;

@ApiTags('Involve')
@Controller('involve')
export class InvolveController {
  constructor(
    private readonly involveService: InvolveService,
    private readonly analytics: AnalyticsService,
    private readonly conversionIngestService: ConversionIngestService,
  ) {}

  @UseGuards(AuthAdminGuard)
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @ApiResponse({ status: 201, description: 'User login successfully' })
  @Get()
  findAll() {
    return this.involveService.findAll();
  }

  // V-5/stubs: admin-only. Per-method guards (this controller has no class-level
  // guard), so each previously-open route must be locked individually.
  @UseGuards(AuthAdminGuard)
  @Get('checkOfferDuplicate')
  checkOfferDuplicate() {
    return this.involveService.checkOfferDuplicate();
  }

  // Involve Asia server-to-server GET postback (real-time conversion notifications).
  // Guarded by INVOLVE_POSTBACK_SECRET query token; always returns 200 OK for valid
  // auth so Involve does not disable the URL after repeated 4xx/5xx responses.
  @UseGuards(InvolvePostbackTokenGuard)
  @Get('postback')
  async handlePostback(@Req() req: Request): Promise<string> {
    await this.conversionIngestService.upsertFromPostback(
      sanitizePostbackQuery(req.query as Record<string, unknown>),
    );
    return 'OK';
  }

  @UseGuards(AuthAdminGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateInvolveDto: UpdateInvolveDto) {
    return this.involveService.update(+id, updateInvolveDto);
  }

  @UseGuards(AuthAdminGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.involveService.remove(+id);
  }

  // Authentication must run first so unauthenticated traffic never consumes
  // mint-handler capacity or reaches the external affiliate provider.
  @UseGuards(FirebaseAuthGuard, RateLimitGuard)
  @RateLimit(CREATE_AFFILIATE_RATE_LIMIT)
  @ApiBody({ type: CreateAffiliateDto })
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @ApiResponse({ status: 201, description: 'User login successfully' })
  @Post('create-affiliate')
  createAffiliate(
    @Body() createInvolveDto: CreateAffiliateDto,
    @Req() req: Request,
  ) {
    const user = req['user'] as any;
    const id = user?.sub;
    const analyticsContext = extractAnalyticsContext(req, {
      userId: id,
    });

    return this.involveService
      .createAffiliate(createInvolveDto, id)
      .then(async (deeplink) => {
        await this.analytics.capture(
          'affiliate_deeplink_generated',
          analyticsContext,
          {
            offer_id: createInvolveDto.offer_id,
            merchant_id: createInvolveDto.merchant_id,
            source_flow: 'web_app',
          },
        );

        return deeplink;
      });
  }

  // V-5: was fully open — minted Involve affiliate deeplinks for any email
  // (email enumeration + affiliate-API cost abuse). This is an external/AI
  // integration endpoint, so it's guarded by a shared API key (x-api-key header
  // vs INVOLVE_AI_API_KEY), fail-closed when the secret is unset.
  @UseGuards(ApiKeyGuard)
  @Post('create-affiliate-ai/:email')
  createAffiliateAi(
    @Body() createInvolveDto: CreateAffiliateAiDto,
    @Param('email') email: string,
  ) {
    return this.involveService.createAffiliateAi(createInvolveDto, email);
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiBody({ type: RequestGetConversion })
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @ApiResponse({ status: 201, description: 'User login successfully' })
  @Post('conversion/:offer_id')
  async getConversion(
    @Param('offer_id') offer_id: string,
    @Body() body: RequestGetConversion,
    @Req() req: Request,
  ) {
    const user = req['user'] as any;
    const id = user?.sub;
    return this.involveService.getConversion(offer_id, body, id);
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiBody({ type: RequestGetConversion })
  @ApiSecurity('access-token') // Apply the security scheme defined globally
  @ApiBearerAuth() // This directly applies Bearer authentication
  @ApiResponse({ status: 201, description: 'User login successfully' })
  @Post('conversion-all')
  async getConversionAll(
    @Body() body: RequestGetConversion,
    @Req() req: Request,
  ) {
    const user = req['user'] as any;
    const id = user?.sub;
    return this.involveService.getConversationAllPage(body, id);
  }
}
