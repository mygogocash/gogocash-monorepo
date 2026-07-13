import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OfferService } from './offer.service';
import { AffiliateProviderRegistry } from 'src/affiliate/affiliate-provider.registry';
import { syncEnabledAffiliateProviders } from 'src/affiliate/affiliate-sync.util';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly offerService: OfferService,
    private readonly registry: AffiliateProviderRegistry,
  ) {}
  // @Cron('45 * * * * *')
  // @Cron(CronExpression.EVERY_.10_SECONDS)
  // @Cron(CronExpression.EVERY_30_SECONDS)
  // @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  // async handleCron() {
  //   this.logger.debug(
  //     'Called when the current time is 12:00 PM on the 1st day of the month',
  //   );
  //   const allOffers = await this.offerService.findAll(1, 1000, '', '');
  //   await this.offerService.writeJJsonToFile(allOffers.data);
  //   await delay(1000);
  // }

  // @Cron(CronExpression.EVERY_30_SECONDS)
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_NOON)
  async handleCron() {
    this.logger.debug(
      'Called when the current time is 12:00 PM on the 1st day of the month',
    );
    // Sync every enabled affiliate network through the seam. Error-isolated per
    // provider so one network being down never blocks the others.
    await syncEnabledAffiliateProviders(this.registry, this.logger);
  }
}
