import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Conversion } from 'src/withdraw/schemas/conversion.schema';
import { Model } from 'mongoose';
import { InvolveService } from 'src/involve/involve.service';
import { Offer } from 'src/offer/schemas/offer.schema';

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(Conversion.name) private conversionModel: Model<Conversion>,
    @InjectModel(Offer.name) private offerModel: Model<Offer>,
    private readonly involveService: InvolveService,
  ) {}

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

      console.log('allConversions new', allConversions?.length);

      if (allConversions?.length === 0) return;

      // Batch update conversions to avoid timeout
      const batchSize = 10;
      for (let i = 0; i < allConversions.length; i += batchSize) {
        const batch = allConversions.slice(i, i + batchSize);
        console.log('batch', batch);
        await Promise.all(
          batch.map((conversion) =>
            this.conversionModel.findOneAndUpdate(
              { conversion_id: conversion.conversion_id },
              conversion,
              { upsert: true, new: true },
            ),
          ),
        );
      }
      console.log('done', allConversions?.length);
    } catch (error) {
      console.error('Error updating conversion status:', error);
      throw error;
    }
  }
}
