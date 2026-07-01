import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth.guard';
import { RateLimit } from 'src/auth/rate-limit.decorator';
import { RateLimitGuard } from 'src/auth/rate-limit.guard';
import { AgentActivateCashbackDto } from './dto/agent-activate-cashback.dto';
import { AgentMatchMerchantDto } from './dto/agent-match-merchant.dto';
import { GototrackAgentService } from './gototrack-agent.service';

const getRequestUserId = (req: Request) => {
  const user = req['user'] as { sub?: string; userId?: string } | undefined;
  const id = user?.sub || user?.userId;
  if (!id) throw new UnauthorizedException('Missing authenticated user');
  return id;
};

@ApiTags('GoGoTrack Agent')
@Controller('agent/v1/gototrack')
export class GototrackAgentController {
  constructor(private readonly agentService: GototrackAgentService) {}

  @Get('merchants/search')
  @UseGuards(RateLimitGuard)
  @RateLimit({ windowMs: 60_000, max: 60 })
  @ApiOperation({
    summary:
      'Agent — search enabled GoGoTrack merchants with structured options cards',
  })
  searchMerchants(@Query('q') query?: string) {
    return this.agentService.searchMerchants(query);
  }

  @Post('match-merchant')
  @UseGuards(FirebaseAuthGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @ApiBody({ type: AgentMatchMerchantDto })
  @ApiOperation({
    summary:
      'Agent — match a merchant from chat context and record a detection event',
  })
  matchMerchant(@Body() body: AgentMatchMerchantDto, @Req() req: Request) {
    return this.agentService.matchMerchant(getRequestUserId(req), body);
  }

  @Post('activate-cashback')
  @UseGuards(FirebaseAuthGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @ApiBody({ type: AgentActivateCashbackDto })
  @ApiOperation({
    summary:
      'Agent — activate cashback tracking and return affiliate + app deeplinks',
  })
  activateCashback(
    @Body() body: AgentActivateCashbackDto,
    @Req() req: Request,
  ) {
    return this.agentService.activateCashback(getRequestUserId(req), body);
  }

  @Get('timeline')
  @UseGuards(FirebaseAuthGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Agent — fetch user GoGoTrack detection and activation history',
  })
  getTimeline(@Req() req: Request) {
    return this.agentService.getTimeline(getRequestUserId(req));
  }
}
