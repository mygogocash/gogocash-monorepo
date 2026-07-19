import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { isLegacyCronEnabled } from 'src/common/legacy-cron-gate';
import { JobService } from './cronjob/job.service';
import { WithdrawService } from './withdraw.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);
  private rankPayoutRun?: Promise<void>;
  constructor(
    private readonly jobService: JobService,
    private readonly withdrawService: WithdrawService,
  ) {}

  // @Cron(CronExpression.EVERY_MINUTE)
  @Cron(CronExpression.EVERY_12_HOURS)
  async handleCron() {
    if (!isLegacyCronEnabled()) return;
    this.logger.debug('Called when the current time is every 12 hours');
    await this.jobService.syncConversion();
  }

  // @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  // async handleCronOld() {
  //   this.logger.debug('Called when the current time is every day at midnight');
  //   await this.jobService.syncConversionOld();
  // }

  // add conversion reward every 7th day of every month
  // @Cron('0 0 0 7 * *')
  // @Cron(CronExpression.EVERY_MINUTE)
  @Cron('0 1 0 7 * *')
  async addConversionReward() {
    if (!isLegacyCronEnabled()) return;
    this.logger.debug(
      'Called when the current time is 1:00 AM on the 7th day of every month',
    );
    if (!this.rankPayoutRun) {
      const work = Promise.resolve().then(async () => {
        await this.withdrawService.adminAddRewardConversionForQuest();
      });
      const tracked = work.finally(() => {
        if (this.rankPayoutRun === tracked) this.rankPayoutRun = undefined;
      });
      this.rankPayoutRun = tracked;
    }
    const configured = Number(
      process.env.LEGACY_REWARD_CRON_TIMEOUT_MS ?? 300_000,
    );
    const timeoutMs = Number.isFinite(configured)
      ? Math.min(Math.max(configured, 1_000), 900_000)
      : 300_000;
    let timer: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        this.rankPayoutRun,
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(
            () => reject(new Error('Legacy rank payout cron timed out')),
            timeoutMs,
          );
          timer.unref();
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
