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

  @Get('checkOfferDuplicate')
  checkOfferDuplicate() {
    return this.involveService.checkOfferDuplicate();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateInvolveDto: UpdateInvolveDto) {
    return this.involveService.update(+id, updateInvolveDto);
  }

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
