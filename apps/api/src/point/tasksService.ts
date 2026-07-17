import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PointService } from './point.service';
import { Conversion } from 'src/withdraw/schemas/conversion.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { rateCurrencyUSD } from 'src/utils/helper';
import {
  awardReconciledPurchaseConversion,
  legacyPurchaseReadyFilter,
} from 'src/tasks/legacy-purchase-writer';

@Injectable()
export class TasksService {
  constructor(
    private readonly pointService: PointService,
    @InjectModel(Conversion.name) private conversionModel: Model<Conversion>,
  ) {}
  // @Cron('45 * * * * *')
  // @Cron(CronExpression.EVERY_MINUTE)
  // @Cron('0 31 0 7 * *')
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCron() {
    // Conversion points are awarded from conversions already ingested into the
    // local store (the network pull lives in withdraw/cronjob/job.service.ts).
    const filterApproved = await this.conversionModel
      .find({
        conversion_status: 'approved',
        add_point: { $ne: true },
        payout: { $gt: 0 },
        ...legacyPurchaseReadyFilter,
        $or: [
          { user_id: { $exists: true, $ne: null } },
          { aff_sub1: { $regex: '^user_id:' } },
        ],
        datetime_conversion: {
          $gte: new Date(new Date().setDate(new Date().getDate() - 10)),
          $lt: new Date(),
        },
      })
      .lean();
    const rate = await rateCurrencyUSD();

    for (const conversion of filterApproved) {
      await awardReconciledPurchaseConversion(conversion, {
        conversionModel: this.conversionModel as never,
        pointService: this.pointService,
        thbPerUsd: rate['THB'],
      });
    }
  }
}
