import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth.guard';
import { ActivationRequestDto } from './dto/activation-request.dto';
import { DetectionRequestDto } from './dto/detection-request.dto';
import { GogosenseSettingsDto } from './dto/gogosense-settings.dto';
import { GogosenseService } from './gogosense.service';

const getRequestUserId = (req: Request) => {
  const user = req['user'] as { sub?: string; userId?: string } | undefined;
  const id = user?.sub || user?.userId;
  if (!id) throw new UnauthorizedException('Missing authenticated user');
  return id;
};

@ApiTags('GoGoSense')
@Controller('gogosense')
export class GogosenseController {
  constructor(private readonly gogosenseService: GogosenseService) {}

  @Get('merchants')
  getMerchants() {
    return this.gogosenseService.listMerchants();
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @ApiBody({ type: DetectionRequestDto })
  @ApiResponse({ status: 201, description: 'Detection event recorded' })
  @Post('detect')
  detect(@Body() detectionRequest: DetectionRequestDto, @Req() req: Request) {
    return this.gogosenseService.detect(
      getRequestUserId(req),
      detectionRequest,
    );
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @ApiBody({ type: ActivationRequestDto })
  @ApiResponse({ status: 201, description: 'Cashback activation created' })
  @Post('activate')
  activate(
    @Body() activationRequest: ActivationRequestDto,
    @Req() req: Request,
  ) {
    return this.gogosenseService.activate(
      getRequestUserId(req),
      activationRequest,
    );
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @Get('timeline')
  getTimeline(@Req() req: Request) {
    return this.gogosenseService.getTimeline(getRequestUserId(req));
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @Post('screenshot')
  createScreenshotJob(@Req() req: Request) {
    return this.gogosenseService.createScreenshotJob(getRequestUserId(req));
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @Get('screenshot/:id')
  getScreenshotJob(@Param('id') id: string, @Req() req: Request) {
    return this.gogosenseService.getScreenshotJob(getRequestUserId(req), id);
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @Get('settings')
  getSettings(@Req() req: Request) {
    return this.gogosenseService.getSettings(getRequestUserId(req));
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @ApiBody({ type: GogosenseSettingsDto })
  @Post('settings')
  updateSettings(@Body() settings: GogosenseSettingsDto, @Req() req: Request) {
    return this.gogosenseService.updateSettings(
      getRequestUserId(req),
      settings,
    );
  }
}
