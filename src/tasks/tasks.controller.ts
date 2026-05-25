import { Controller, Get, Param } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { InvolveService } from 'src/involve/involve.service';
import { rateCurrencyUSD } from 'src/utils/helper';
import { InjectModel } from '@nestjs/mongoose';
import { Conversion } from 'src/withdraw/schemas/conversion.schema';
import { Model } from 'mongoose';
import { PointService } from 'src/point/point.service';
import { JobService } from 'src/withdraw/cronjob/job.service';
import { WithdrawService } from 'src/withdraw/withdraw.service';

@Controller('tasks')
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly involveService: InvolveService,
    private readonly pointService: PointService,
    private readonly jobService: JobService,
    private readonly withdrawService: WithdrawService,
    @InjectModel(Conversion.name) private conversionModel: Model<Conversion>,
  ) {}

  @Get('update-offers/:id')
  async updateOffers(@Param('id') id: string) {
    if (id == process.env.FIREBASE_API_KEY) {
      const allOffers = await this.involveService.findAll();
      console.log('allOffers', allOffers?.length);
    } else {
      return { message: 'error' };
    }
  }

  @Get('update-points/:id')
  async updatePoints(@Param('id') id: string) {
    if (id == process.env.FIREBASE_API_KEY) {
      const filterApproved = await this.conversionModel
        .find({
          aff_sub1: { $regex: '^user_id:' },
          datetime_conversion: {
            $gte: new Date(new Date().setDate(new Date().getDate() - 30)),
            $lt: new Date(),
          },
          payout: { $gt: 0 },
          // conversion_status: 'approved',
          // add_point: { $exists: false },
        })
        .lean();
      console.log('filterApproved', filterApproved?.length);
      const rate = await rateCurrencyUSD();

      for (const conversion of filterApproved) {
        const userId = conversion.aff_sub1.split('user_id:')[1];
        let calculatedPoints = 0;
        if (conversion.currency === 'USD') {
          calculatedPoints = Math.floor(conversion.sale_amount * rate['THB']);
        } else {
          calculatedPoints = Math.floor(conversion.sale_amount);
        }
        await this.pointService.addPointsToUser(
          userId,
          calculatedPoints,
          conversion.conversion_id,
        );
        await this.conversionModel.updateOne(
          { _id: conversion._id },
          { $set: { add_point: true } },
        );
        // await delay(1000);
      }

      console.log('add point done', filterApproved?.length);
    } else {
      return { message: 'error' };
    }
  }

  @Get('update-conversions/:id')
  async updateConversions(@Param('id') id: string) {
    if (id == process.env.FIREBASE_API_KEY) {
      await this.jobService.syncConversion();
    } else {
      return { message: 'error' };
    }
  }

  @Get('update-conversions-reward/:id')
  async addConversionReward(@Param('id') id: string) {
    if (id == process.env.FIREBASE_API_KEY) {
      this.withdrawService.adminAddRewardConversionForQuest();
    } else {
      return { message: 'error' };
    }
  }

  @Get('update-conversions-paid-to-approved/:id')
  async changeConversionPaid(@Param('id') id: string) {
    if (id == process.env.FIREBASE_API_KEY) {
      await this.tasksService.changeConversionPaid();
    } else {
      return { message: 'error' };
    }
  }

  @Get('update-status-conversions-is-pending/:id')
  async updateStatusConversionIsPending(@Param('id') id: string) {
    if (id == process.env.FIREBASE_API_KEY) {
      return await this.tasksService.updateStatusConversionIsPending();
    } else {
      return { message: 'error' };
    }
  }

  @Get('get-spacial-point-next-round/:id')
  async getSpacialPointNextRound(@Param('id') id: string) {
    if (id == process.env.FIREBASE_API_KEY) {
      return this.tasksService.getSpacialPointNextRound();
    } else {
      return { message: 'error' };
    }
  }
}
