import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { JobService } from './cronjob/job.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);
  constructor(private readonly jobService: JobService) {}

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
}
