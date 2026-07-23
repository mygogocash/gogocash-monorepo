import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { isLegacyCronEnabled } from 'src/common/legacy-cron-gate';
import { PointService } from './point.service';
import { Conversion } from 'src/withdraw/schemas/conversion.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { rateCurrencyUSD } from 'src/utils/helper';
import {
  awardReconciledPurchaseConversion,
  legacyPurchaseReadyFilter,
} from 'src/tasks/legacy-purchase-writer';
import { Point } from './schemas/point.schema';
import { FeeRate } from 'src/withdraw/schemas/feeRate.schema';
import { ReferralPayout } from './schemas/referral-payout.schema';
import { buildReferralBonusHook } from './referral-bonus-hook';

@Injectable()
export class TasksService {
  constructor(
    private readonly pointService: PointService,
    @InjectModel(Conversion.name) private conversionModel: Model<Conversion>,
    @InjectModel(Point.name) private pointModel: Model<Point>,
    @InjectModel(FeeRate.name) private feeRateModel: Model<FeeRate>,
    @InjectModel(ReferralPayout.name)
    private referralPayoutModel: Model<ReferralPayout>,
  ) {}
  // @Cron('45 * * * * *')
  // @Cron(CronExpression.EVERY_MINUTE)
  // @Cron('0 31 0 7 * *')
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async scheduledHandleCron() {
    if (!isLegacyCronEnabled()) return;
    await this.handleCron();
  }

  // Also invoked manually via GET /point/save-points (superadmin) — keep the
  // CRON_ENABLED gate on the scheduled wrapper only.
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

    const referralBonus = buildReferralBonusHook({
      pointModel: this.pointModel,
      feeRateModel: this.feeRateModel,
      referralPayoutModel: this.referralPayoutModel,
      pointService: this.pointService,
    });

    for (const conversion of filterApproved) {
      await awardReconciledPurchaseConversion(conversion, {
        conversionModel: this.conversionModel as never,
        pointService: this.pointService,
        thbPerUsd: rate['THB'],
        referralBonus,
      });
    }
  }
}
