import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PointService } from './point.service';
import { InvolveService } from 'src/involve/involve.service';
import { delay } from 'rxjs';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly pointService: PointService,
    private readonly involveService: InvolveService,
  ) {}
  // @Cron('45 * * * * *')
  // @Cron(CronExpression.EVERY_10_SECONDS)
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCron() {
    this.logger.debug('Called when the current time is 00.00');

    const conversions = await this.involveService.getConversionAll({
      page: '1',
      limit: '10',
    });

    let allConversions = conversions.data.data;
    let currentPage = 1;

    while (conversions.data.nextPage) {
      currentPage++;
      const nextConversions = await this.involveService.getConversionAll({
        page: currentPage.toString(),
        limit: '10',
      });
      allConversions = allConversions.concat(nextConversions.data.data);
      conversions.data.nextPage = nextConversions.data.nextPage;
      await delay(1000);
    }
    const filterAff = allConversions.filter((item) => {
      return item.aff_sub1 && item.aff_sub1.startsWith('user_id:');
    });
    const filterApproved = filterAff.filter((item) => {
      return item.conversion_status === 'approved';
    });
    for (const conversion of filterApproved) {
      const userId = conversion.aff_sub1.split('user_id:')[1];
      const calculatedPoints = Math.floor(conversion.sale_amount / 100);
      // console.log(
      //   `User ID: ${userId}, ${conversion.conversion_id} Payout Amount: ${conversion.payout}, Calculated Points: ${calculatedPoints}`,
      // );
      await this.pointService.addPointsToUser(
        userId,
        calculatedPoints,
        conversion.conversion_id,
      );
      await delay(1000);
    }
  }
}
