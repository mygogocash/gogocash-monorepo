import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { Request } from 'express';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth.guard';

import { QuestTaskProgressService } from './quest-task-progress.service';

@Controller('point')
export class QuestTaskProgressController {
  constructor(private readonly progress: QuestTaskProgressService) {}

  @UseGuards(FirebaseAuthGuard)
  @ApiSecurity('access-token')
  @ApiBearerAuth()
  @Get('quest-progress')
  getCustomerProgress(@Req() request: Request) {
    const user = request.user as
      { sub?: string; userId?: string; uid?: string } | undefined;
    return this.progress.getCustomerProgress(
      String(user?.sub ?? user?.userId ?? user?.uid ?? ''),
    );
  }
}
