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
import { GototrackSettingsDto } from './dto/gototrack-settings.dto';
import { GototrackService } from './gototrack.service';

const getRequestUserId = (req: Request) => {
  const user = req['user'] as { sub?: string; userId?: string } | undefined;
  const id = user?.sub || user?.userId;
  if (!id) throw new UnauthorizedException('Missing authenticated user');
  return id;
};

@ApiTags('GoGoTrack')
@Controller('gototrack')
export class GototrackController {
  constructor(private readonly gototrackService: GototrackService) {}

  @Get('merchants')
  getMerchants() {
    return this.gototrackService.listMerchants();
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @ApiBody({ type: DetectionRequestDto })
  @ApiResponse({ status: 201, description: 'Detection event recorded' })
  @Post('detect')
  detect(@Body() detectionRequest: DetectionRequestDto, @Req() req: Request) {
    return this.gototrackService.detect(
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
    return this.gototrackService.activate(
      getRequestUserId(req),
      activationRequest,
    );
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @Get('timeline')
  getTimeline(@Req() req: Request) {
    return this.gototrackService.getTimeline(getRequestUserId(req));
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @Post('screenshot')
  createScreenshotJob(@Req() req: Request) {
    return this.gototrackService.createScreenshotJob(getRequestUserId(req));
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @Get('screenshot/:id')
  getScreenshotJob(@Param('id') id: string, @Req() req: Request) {
    return this.gototrackService.getScreenshotJob(getRequestUserId(req), id);
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @Get('settings')
  getSettings(@Req() req: Request) {
    return this.gototrackService.getSettings(getRequestUserId(req));
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @ApiBody({ type: GototrackSettingsDto })
  @Post('settings')
  updateSettings(@Body() settings: GototrackSettingsDto, @Req() req: Request) {
    return this.gototrackService.updateSettings(
      getRequestUserId(req),
      settings,
    );
  }
}
