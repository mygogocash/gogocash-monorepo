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
import { Point } from 'src/point/schemas/point.schema';
import { enrichConversionWithUserId } from 'src/withdraw/conversion-user-id.util';

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(Conversion.name) private conversionModel: Model<Conversion>,
    @InjectModel(Offer.name) private offerModel: Model<Offer>,
    @InjectModel(Quest.name) private questModel: Model<Quest>,
    @InjectModel(Point.name) private pointModel: Model<Point>,
    private readonly involveService: InvolveService,
    private readonly pointService: PointService,
  ) {}

  private rewardDistributionDueFilter(now: Date): QueryFilter<Quest> {
    return {
      status: 'close',
      reward_status: { $ne: true },
      $or: [
        { reward_distribution_mode: { $exists: false } },
        {
          reward_distribution_mode:
            'campaign_end' as QuestRewardDistributionMode,
        },
        {
          reward_distribution_mode: 'after_days' as QuestRewardDistributionMode,
          reward_distribution_scheduled_at: { $lte: now },
        },
      ],
    };
  }

  async changeConversionPaid() {
    const result = await this.conversionModel.updateMany(
      { conversion_status: 'paid' },
      { $set: { conversion_status: 'approved' } },
    );
    return result;
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
            this.conversionModel.findOneAndUpdate(
              { conversion_id: conversion.conversion_id },
              enrichConversionWithUserId(conversion),
              { upsert: true, new: true },
            ),
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
    const startDate = new Date(questDate.start_date).toLocaleDateString(
      'en-CA',
    );
    const endDate = new Date(questDate.end_date).toLocaleDateString('en-CA');
    const lists = await this.pointService.getSpacialPointNextRound(
      startDate,
      endDate,
    );

    if (lists?.length > 0) {
      for (let i = 0; i < lists.length; i++) {
        const dt = lists[i];
        const data = {
          user_id: new Types.ObjectId(dt.user_id),
          conversion_id: new Date().getTime() + i, // Use timestamp as unique ID for simplicity
          point: dt?.special_point_next_round || 0,
          type: 'add',
          action: 'special_point_quest',
        };
        const pointEntry = new this.pointModel(data);
        await pointEntry.save();
      }
    }
  }
}
