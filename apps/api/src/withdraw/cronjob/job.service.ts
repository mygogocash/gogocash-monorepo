import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Conversion } from '../schemas/conversion.schema';
import { InvolveService } from 'src/involve/involve.service';
import { Model } from 'mongoose';
import { delay } from 'rxjs';
import { AnalyticsService } from 'src/analytics/analytics.service';
import { enrichConversionWithUserId } from '../conversion-user-id.util';

@Injectable()
export class JobService {
  private start_date = new Date().setDate(new Date().getDate() - 30);
  private end_date = new Date().setDate(new Date().getDate());
  // private start_date = new Date('2026-02-01'); //
  // private end_date = new Date('2026-02-28'); //
  private start: string;
  private end: string;

  constructor(
    private readonly involveService: InvolveService,
    @InjectModel(Conversion.name) private conversionModel: Model<Conversion>,
    private readonly analytics: AnalyticsService,
  ) {
    this.start = new Date(this.start_date).toISOString().split('T')[0];
    this.end = new Date(this.end_date).toISOString().split('T')[0];
  }

  async syncConversion(conversion_ids?: string) {
    const start_date = new Date().setDate(new Date().getDate() - 30);
    const end_date = new Date().setDate(new Date().getDate());
    const start = new Date(start_date).toISOString().split('T')[0];
    const end = new Date(end_date).toISOString().split('T')[0];
    const allOffers = await this.involveService.getConversionRange(
      {
        page: 1,
        limit: 100,
      },
      {
        start_date: start,
        end_date: end,
      },
      conversion_ids ? { conversion_id: conversion_ids } : undefined,
    );

    let allConversions = allOffers.data.data;
    let currentPage = 1;

    while (allOffers.data.nextPage) {
      currentPage++;
      const nextConversions = await this.involveService.getConversionRange(
        {
          page: currentPage,
          limit: 100,
        },
        {
          start_date: start,
          end_date: end,
        },
        conversion_ids ? { conversion_id: conversion_ids } : undefined,
      );
      allConversions = allConversions.concat(nextConversions.data.data);
      allOffers.data.nextPage = nextConversions.data.nextPage;
    }
    // console.log('allConversions new', allConversions);
    console.log('allConversions new', allConversions?.length);

    if (allConversions?.length === 0) return;
    for (const conversion of allConversions) {
      // const existingConversion = await this.conversionModel
      //   .findOne({
      //     conversion_id: conversion.conversion_id,
      //   })
      //   .lean();

      await this.conversionModel.findOneAndUpdate(
        {
          conversion_id: conversion.conversion_id,
        },
        enrichConversionWithUserId(conversion),
        { upsert: true, new: true },
      );

      // const userId = conversion.aff_sub1?.startsWith('user_id:')
      //   ? conversion.aff_sub1.split('user_id:')[1]
      //   : undefined;
      // const analyticsContext = {
      //   userId,
      //   distinctId: userId || `conversion:${conversion.conversion_id}`,
      //   platform: 'api' as const,
      // };

      // await this.analytics.capture('conversion_synced', analyticsContext, {
      //   conversion_id: conversion.conversion_id,
      //   merchant_id: conversion.merchant_id,
      //   offer_id: conversion.offer_id,
      //   status: conversion.conversion_status,
      //   payout: conversion.payout,
      //   currency: conversion.currency,
      //   source_flow: 'involve_sync',
      //   is_new_conversion: !existingConversion,
      // });

      // if (
      //   existingConversion &&
      //   existingConversion.conversion_status !== conversion.conversion_status
      // ) {
      //   await this.analytics.capture(
      //     'conversion_status_changed',
      //     analyticsContext,
      //     {
      //       conversion_id: conversion.conversion_id,
      //       merchant_id: conversion.merchant_id,
      //       offer_id: conversion.offer_id,
      //       previous_status: existingConversion.conversion_status,
      //       next_status: conversion.conversion_status,
      //       payout: conversion.payout,
      //       currency: conversion.currency,
      //       source_flow: 'involve_sync',
      //     },
      //   );
      // }

      // await delay(1000);
    }
    await this.conversionModel.updateMany(
      { conversion_status: 'paid' },
      { $set: { conversion_status: 'approved' } },
    );
    console.log('done', allConversions?.length);
  }

  async syncConversionByConversionId(conversion_ids?: string) {
    const allOffers = await this.involveService.getConversionAll(
      {
        page: 1,
        limit: 100,
      },
      conversion_ids ? { conversion_id: conversion_ids } : undefined,
    );

    let allConversions = allOffers.data.data;
    let currentPage = 1;

    while (allOffers.data.nextPage) {
      currentPage++;
      const nextConversions = await this.involveService.getConversionRange(
        {
          page: currentPage,
          limit: 100,
        },
        {
          start_date: this.start,
          end_date: this.end,
        },
        conversion_ids ? { conversion_id: conversion_ids } : undefined,
      );
      allConversions = allConversions.concat(nextConversions.data.data);
      allOffers.data.nextPage = nextConversions.data.nextPage;
    }
    // console.log('allConversions new', allConversions);
    console.log('allConversions new', allConversions?.length);

    if (allConversions?.length === 0) return;
    for (const conversion of allConversions) {
      // const existingConversion = await this.conversionModel
      //   .findOne({
      //     conversion_id: conversion.conversion_id,
      //   })
      //   .lean();

      await this.conversionModel.findOneAndUpdate(
        {
          conversion_id: conversion.conversion_id,
        },
        enrichConversionWithUserId(conversion),
        { upsert: true, new: true },
      );

      // const userId = conversion.aff_sub1?.startsWith('user_id:')
      //   ? conversion.aff_sub1.split('user_id:')[1]
      //   : undefined;
      // const analyticsContext = {
      //   userId,
      //   distinctId: userId || `conversion:${conversion.conversion_id}`,
      //   platform: 'api' as const,
      // };

      // await this.analytics.capture('conversion_synced', analyticsContext, {
      //   conversion_id: conversion.conversion_id,
      //   merchant_id: conversion.merchant_id,
      //   offer_id: conversion.offer_id,
      //   status: conversion.conversion_status,
      //   payout: conversion.payout,
      //   currency: conversion.currency,
      //   source_flow: 'involve_sync',
      //   is_new_conversion: !existingConversion,
      // });

      // if (
      //   existingConversion &&
      //   existingConversion.conversion_status !== conversion.conversion_status
      // ) {
      //   await this.analytics.capture(
      //     'conversion_status_changed',
      //     analyticsContext,
      //     {
      //       conversion_id: conversion.conversion_id,
      //       merchant_id: conversion.merchant_id,
      //       offer_id: conversion.offer_id,
      //       previous_status: existingConversion.conversion_status,
      //       next_status: conversion.conversion_status,
      //       payout: conversion.payout,
      //       currency: conversion.currency,
      //       source_flow: 'involve_sync',
      //     },
      //   );
      // }

      // await delay(1000);
    }
    console.log('done', allConversions?.length);
  }

  async syncConversionOld() {
    const allOffers = await this.involveService.getConversionRangeOld(
      {
        page: 1,
        limit: 100,
      },
      {
        start_date: this.start,
        end_date: this.end,
      },
    );

    let allConversions = allOffers.data.data;
    let currentPage = 1;

    while (allOffers.data.nextPage) {
      currentPage++;
      const nextConversions = await this.involveService.getConversionRangeOld(
        {
          page: currentPage,
          limit: 100,
        },
        {
          start_date: this.start,
          end_date: this.end,
        },
      );
      allConversions = allConversions.concat(nextConversions.data.data);
      allOffers.data.nextPage = nextConversions.data.nextPage;
    }
    console.log('allConversions Old', allConversions?.length);

    for (const conversion of allConversions) {
      await this.conversionModel.findOneAndUpdate(
        {
          conversion_id: conversion.conversion_id,
        },
        enrichConversionWithUserId(conversion),
        { upsert: true, new: true },
      );
      delay(1000);
    }
  }
}
