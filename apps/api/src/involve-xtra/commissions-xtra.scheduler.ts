import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { isLegacyCronEnabled } from '../common/legacy-cron-gate';
import { CommissionsXtraSyncService } from './commissions-xtra-sync.service';

// #586 REQ-SYNC-5 — in-process cron for the Xtra syncs, gated by the shared
// legacy-cron invariant (CRON_ENABLED) so only one Railway stack runs them.
@Injectable()
export class CommissionsXtraScheduler {
  private readonly logger = new Logger(CommissionsXtraScheduler.name);

  constructor(private readonly sync: CommissionsXtraSyncService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async nightlyShopeeXtra(): Promise<void> {
    if (!isLegacyCronEnabled()) return;
    try {
      await this.sync.syncShopeeXtra();
    } catch (error) {
      this.logger.error(
        `nightly Shopee Xtra sync failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async dailyCampaigns(): Promise<void> {
    if (!isLegacyCronEnabled()) return;
    try {
      await this.sync.syncCampaigns();
    } catch (error) {
      this.logger.error(
        `daily Xtra campaigns sync failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
