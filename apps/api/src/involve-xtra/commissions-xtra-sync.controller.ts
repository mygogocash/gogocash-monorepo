import { Controller, Logger, Post, UseGuards } from '@nestjs/common';

import { AuthAdminGuard } from '../admin/jwt-auth-admin.guard';
import { RateLimit } from '../auth/rate-limit.decorator';
import { RateLimitGuard } from '../auth/rate-limit.guard';
import {
  CommissionsXtraSyncService,
  type XtraSyncSummary,
} from './commissions-xtra-sync.service';

// #586 REQ-SYNC-7 — admin break-glass manual trigger for QA (mirrors the
// TasksController pattern: real admin JWT + rate limit, never a public key).
@UseGuards(AuthAdminGuard, RateLimitGuard)
@RateLimit({ windowMs: 60_000, max: 10 })
@Controller('admin/involve-xtra')
export class CommissionsXtraSyncController {
  private readonly logger = new Logger(CommissionsXtraSyncController.name);

  constructor(private readonly sync: CommissionsXtraSyncService) {}

  @Post('sync-shops')
  async syncShops(): Promise<XtraSyncSummary> {
    this.logger.log('manual trigger: syncShopeeXtra');
    return this.sync.syncShopeeXtra();
  }

  @Post('sync-campaigns')
  async syncCampaigns(): Promise<XtraSyncSummary> {
    this.logger.log('manual trigger: syncCampaigns');
    return this.sync.syncCampaigns();
  }
}
