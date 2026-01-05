import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { delay } from 'rxjs';
import { InvolveService } from 'src/involve/involve.service';
import { Conversion } from './schemas/conversion.schema';
import { Model } from 'mongoose';
@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly involveService: InvolveService,
    @InjectModel(Conversion.name) private conversionModel: Model<Conversion>,
  ) {}
  // @Cron('45 * * * * *')
  // @Cron(CronExpression.EVERY_10_SECONDS)
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async handleCron() {
    this.logger.debug(
      'Called when the current time is 12:00 PM on the 1st day of the month',
    );
    const allOffers = await this.involveService.getConversionAll({
      page: 1,
      limit: 10,
    });

    let allConversions = allOffers.data.data;
    let currentPage = 1;

    while (allOffers.data.nextPage) {
      currentPage++;
      const nextConversions = await this.involveService.getConversionAll({
        page: currentPage,
        limit: 10,
      });
      allConversions = allConversions.concat(nextConversions.data.data);
      allOffers.data.nextPage = nextConversions.data.nextPage;
    }

    for (const conversion of allConversions) {
      await this.conversionModel.findOneAndUpdate(
        {
          conversion_id: conversion.conversion_id,
        },
        conversion,
        { upsert: true, new: true },
      );
      await delay(1000);
    }
  }
}
