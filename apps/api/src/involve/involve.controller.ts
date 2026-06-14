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

@ApiTags('Involve')
@Controller('involve')
export class InvolveController {
  constructor(
    private readonly involveService: InvolveService,
    private readonly analytics: AnalyticsService,
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

  @UseGuards(FirebaseAuthGuard)
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
