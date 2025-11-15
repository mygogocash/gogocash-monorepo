import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { delay } from 'rxjs';
import { OfferService } from './offer.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(private readonly offerService: OfferService) {}
  // @Cron('45 * * * * *')
  // @Cron(CronExpression.EVERY_10_SECONDS)
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_NOON)
  async handleCron() {
    this.logger.debug(
      'Called when the current time is 12:00 PM on the 1st day of the month',
    );
    const allOffers = await this.offerService.findAll(1, 1000, '', '');
    await this.offerService.writeJJsonToFile(allOffers.data);
    await delay(1000);
  }
}
