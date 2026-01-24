import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Conversion } from '../schemas/conversion.schema';
import { InvolveService } from 'src/involve/involve.service';
import { Model } from 'mongoose';
import { delay } from 'rxjs';

@Injectable()
export class JobService {
  private start_date = new Date().setDate(new Date().getDate() - 20);
  private end_date = new Date().setDate(new Date().getDate());
  private start: string;
  private end: string;

  constructor(
    private readonly involveService: InvolveService,
    @InjectModel(Conversion.name) private conversionModel: Model<Conversion>,
  ) {
    this.start = new Date(this.start_date).toISOString().split('T')[0];
    this.end = new Date(this.end_date).toISOString().split('T')[0];
  }

  async syncConversion() {
    const allOffers = await this.involveService.getConversionRange(
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
      const nextConversions = await this.involveService.getConversionRange(
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
    console.log('allConversions new', allConversions?.length);

    for (const conversion of allConversions) {
      await this.conversionModel.findOneAndUpdate(
        {
          conversion_id: conversion.conversion_id,
        },
        conversion,
        { upsert: true, new: true },
      );
      delay(1000);
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
        conversion,
        { upsert: true, new: true },
      );
      delay(1000);
    }
  }
}
