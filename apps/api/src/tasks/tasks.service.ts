import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Conversion } from 'src/withdraw/schemas/conversion.schema';
import { Model, QueryFilter, Types } from 'mongoose';
import { InvolveService } from 'src/involve/involve.service';
import { Offer } from 'src/offer/schemas/offer.schema';
import {
  Quest,
  QuestRewardDistributionMode,
} from 'src/point/schemas/quest.schema';
import { PointService } from 'src/point/point.service';
import { ConversionIngestService } from 'src/involve/conversion-ingest.service';
import {
  legacyQuestRewardFilter,
  legacySpecialPointKey,
} from './legacy-reward-identity';
import {
  assertLegacyRewardManifest,
  legacyQuestPayoutConfigChecksum,
  legacyRewardManifestKey,
  LegacyRewardManifest,
} from './legacy-reward-manifest';
import { rateCurrencyUSD } from 'src/utils/helper';
import {
  awardReconciledPurchaseConversion,
  legacyPurchaseReadyFilter,
} from './legacy-purchase-writer';
import { Point } from 'src/point/schemas/point.schema';
import { FeeRate } from 'src/withdraw/schemas/feeRate.schema';
import { ReferralPayout } from 'src/point/schemas/referral-payout.schema';
import { buildReferralBonusHook } from 'src/point/referral-bonus-hook';

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(Conversion.name) private conversionModel: Model<Conversion>,
    @InjectModel(Offer.name) private offerModel: Model<Offer>,
    @InjectModel(Quest.name) private questModel: Model<Quest>,
    @InjectModel(Point.name) private pointModel: Model<Point>,
    @InjectModel(FeeRate.name) private feeRateModel: Model<FeeRate>,
    @InjectModel(ReferralPayout.name)
    private referralPayoutModel: Model<ReferralPayout>,
    private readonly involveService: InvolveService,
    private readonly conversionIngestService: ConversionIngestService,
    private readonly pointService: PointService,
  ) {}

  private buildReferralBonusHook() {
    return buildReferralBonusHook({
      pointModel: this.pointModel,
      feeRateModel: this.feeRateModel,
      referralPayoutModel: this.referralPayoutModel,
      pointService: this.pointService,
    });
  }

  private rewardDistributionDueFilter(now: Date): QueryFilter<Quest> {
    return {
      status: 'close',
      legacy_payout_reconciliation_status: 'ready',
      legacy_payout_reconciliation_version: 1,
      legacy_special_point_completed_at: { $exists: false },
      $and: [
        legacyQuestRewardFilter(),
        {
          $or: [
            { reward_distribution_mode: { $exists: false } },
            {
              reward_distribution_mode:
                'campaign_end' as QuestRewardDistributionMode,
            },
            {
              reward_distribution_mode:
                'after_days' as QuestRewardDistributionMode,
              reward_distribution_scheduled_at: { $lte: now },
            },
          ],
        },
      ],
    } as QueryFilter<Quest>;
  }

  async changeConversionPaid() {
    const conversions = await this.conversionModel
      .find({ conversion_status: 'paid' })
      .lean();
    for (const conversion of conversions) {
      const sourcePayload = {
        ...(conversion as unknown as Record<string, unknown>),
      };
      delete sourcePayload._id;
      delete sourcePayload.__v;
      delete sourcePayload.createdAt;
      delete sourcePayload.updatedAt;
      await this.conversionIngestService.upsertConversion(
        { ...sourcePayload, conversion_status: 'approved' },
        { adapter: 'admin', authoritative: true },
      );
    }
    return {
      acknowledged: true,
      matchedCount: conversions.length,
      modifiedCount: conversions.length,
    };
  }

  async awardApprovedConversionPoints(now = new Date(), windowDays = 30) {
    const from = new Date(now);
    from.setDate(from.getDate() - windowDays);
    const conversions = await this.conversionModel
      .find({
        conversion_status: 'approved',
        add_point: { $ne: true },
        payout: { $gt: 0 },
        ...legacyPurchaseReadyFilter,
        datetime_conversion: { $gte: from, $lt: now },
        $or: [
          { user_id: { $exists: true, $ne: null } },
          { aff_sub1: { $regex: '^user_id:' } },
        ],
      })
      .lean();
    const rate = await rateCurrencyUSD();
    const referralBonus = this.buildReferralBonusHook();
    for (const conversion of conversions) {
      await awardReconciledPurchaseConversion(conversion, {
        conversionModel: this.conversionModel as never,
        pointService: this.pointService,
        thbPerUsd: rate['THB'],
        referralBonus,
      });
    }
    return { scanned: conversions.length };
  }

  async updateStatusConversionIsPending() {
    try {
      let allConversions = [];
      let currentPage = 1;
      let hasNextPage = true;
      // const conversion = await this.conversionModel
      //   .find({
      //     conversion_status: 'pending',
      //     aff_sub1: { $regex: '^user_id:' },
      //   })
      //   .lean();
      // const conversionIds = conversion
      //   .map((conv) => conv.conversion_id)
      //   .join('|');
      // console.log('conversionIds', conversionIds);
      // console.log('conversions', conversion?.length);

      // return conversion;
      // Fetch all conversions with pagination
      while (hasNextPage) {
        const result = await this.involveService.getConversionAll(
          {
            page: currentPage,
            limit: 100,
          },
          { conversion_status: 'approved' },
        );

        if (result?.data?.data?.length > 0) {
          allConversions = allConversions.concat(result.data.data);
        }

        hasNextPage = result?.data?.nextPage;
        currentPage++;
      }
      // console.log('allConversions new', allConversions);

      if (allConversions?.length === 0) return;

      // Batch update conversions to avoid timeout
      const batchSize = 10;
      for (let i = 0; i < allConversions.length; i += batchSize) {
        const batch = allConversions.slice(i, i + batchSize);
        await Promise.all(
          batch.map((conversion) =>
            this.conversionIngestService.upsertConversion(conversion),
          ),
        );
      }
    } catch (error) {
      console.error('Error updating conversion status:', error);
      throw error;
    }
  }

  async getSpacialPointNextRound() {
    const questDate = await this.questModel.findOne(
      this.rewardDistributionDueFilter(new Date()),
    );

    if (!questDate) {
      // throw new HttpException({ message: 'Quest date not found' }, 400);
      return;
    }
    const manifestCollection =
      this.questModel.db.collection<LegacyRewardManifest>(
        'legacyrewardmanifests',
      );
    const manifest = await manifestCollection.findOne({
      manifest_key: legacyRewardManifestKey(
        questDate._id,
        'special-next-round',
      ),
    });
    const questConfigChecksum = legacyQuestPayoutConfigChecksum(
      questDate.toObject?.() ?? questDate,
    );
    if (questDate.legacy_payout_config_checksum !== questConfigChecksum) {
      throw new Error(
        'Legacy special-point quest configuration checksum mismatch',
      );
    }
    assertLegacyRewardManifest(
      manifest,
      questDate._id,
      'special-next-round',
      Number(questDate.legacy_payout_reconciliation_version),
      questConfigChecksum,
    );
    const lists = manifest.recipients;

    if (lists?.length > 0) {
      for (let i = 0; i < lists.length; i++) {
        const dt = lists[i];
        if (dt.excluded) continue;
        const userId = new Types.ObjectId(dt.user_id).toString();
        const payoutKey = legacySpecialPointKey(questDate._id, userId);
        if (dt.payout_key !== payoutKey) {
          throw new Error('Legacy special-point manifest identity mismatch');
        }
        await this.pointService.addPointsToUser(
          userId,
          dt.amount,
          0,
          'special_point_quest',
          payoutKey,
        );
      }
    }
    const manifestCompletion = await manifestCollection.updateOne(
      {
        manifest_key: manifest.manifest_key,
        manifest_hash: manifest.manifest_hash,
        quest_config_checksum: questConfigChecksum,
        status: { $in: ['ready', 'completed'] },
      },
      { $set: { status: 'completed', completed_at: new Date() } },
    );
    if (manifestCompletion.matchedCount !== 1) {
      throw new Error(
        'Legacy special-point manifest completion fence was lost',
      );
    }
    await this.questModel.findOneAndUpdate(
      {
        _id: questDate._id,
        legacy_payout_reconciliation_status: 'ready',
        legacy_payout_reconciliation_version: 1,
        legacy_payout_config_checksum: questConfigChecksum,
        legacy_special_point_completed_at: { $exists: false },
      },
      { $set: { legacy_special_point_completed_at: new Date() } },
      { new: true },
    );
  }
}
