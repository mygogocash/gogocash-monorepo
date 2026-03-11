import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { JobService } from './cronjob/job.service';
import { WithdrawService } from './withdraw.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);
  constructor(
    private readonly jobService: JobService,
    private readonly withdrawService: WithdrawService,
  ) {}

  // @Cron(CronExpression.EVERY_MINUTE)
  @Cron(CronExpression.EVERY_12_HOURS)
  async handleCron() {
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
    this.logger.debug(
      'Called when the current time is 1:00 AM on the 7th day of every month',
    );
    this.withdrawService.adminAddRewardConversionForQuest();
  }
}
