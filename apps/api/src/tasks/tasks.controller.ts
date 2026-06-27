import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { InvolveService } from 'src/involve/involve.service';
import { rateCurrencyUSD } from 'src/utils/helper';
import { InjectModel } from '@nestjs/mongoose';
import { Conversion } from 'src/withdraw/schemas/conversion.schema';
import { Model } from 'mongoose';
import { PointService } from 'src/point/point.service';
import { JobService } from 'src/withdraw/cronjob/job.service';
import { WithdrawService } from 'src/withdraw/withdraw.service';
import { AuthAdminGuard } from 'src/admin/jwt-auth-admin.guard';
import { RateLimitGuard } from 'src/auth/rate-limit.guard';
import { RateLimit } from 'src/auth/rate-limit.decorator';

function isFirebaseCronSecret(id: string): boolean {
  const secret = process.env.FIREBASE_API_KEY;
  return Boolean(secret) && id === secret;
}

// ScheduleModule (in-process @Cron) is the real scheduler. These HTTP routes
// are admin break-glass only — the previous `id == FIREBASE_API_KEY` gate was
// a PUBLIC client key (effectively unauthenticated money mutation), so the
// whole controller is now behind a real admin JWT + rate limit.
@UseGuards(AuthAdminGuard, RateLimitGuard)
@RateLimit({ windowMs: 60_000, max: 10 })
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
    if (!isFirebaseCronSecret(id)) {
      return { message: 'error' };
    }
    await this.involveService.findAll();
  }

  @Get('update-points/:id')
  async updatePoints(@Param('id') id: string) {
    if (!isFirebaseCronSecret(id)) {
      return { message: 'error' };
    }

    const filterApproved = await this.conversionModel
      .find({
        aff_sub1: { $regex: '^user_id:' },
        datetime_conversion: {
          $gte: new Date(new Date().setDate(new Date().getDate() - 30)),
          $lt: new Date(),
        },
        payout: { $gt: 0 },
        // Idempotency: only award approved conversions that have NOT already
        // been pointed — without these, every call re-awards (double credit).
        conversion_status: 'approved',
        add_point: { $exists: false },
      })
      .lean();
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
    }
  }

  @Get('update-conversions/:id')
  async updateConversions(@Param('id') id: string) {
    if (!isFirebaseCronSecret(id)) {
      return { message: 'error' };
    }
    await this.jobService.syncConversion();
  }

  @Get('update-conversions-reward/:id')
  async addConversionReward(@Param('id') id: string) {
    if (!isFirebaseCronSecret(id)) {
      return { message: 'error' };
    }
    this.withdrawService.adminAddRewardConversionForQuest();
  }

  @Get('update-conversions-paid-to-approved/:id')
  async changeConversionPaid(@Param('id') id: string) {
    if (!isFirebaseCronSecret(id)) {
      return { message: 'error' };
    }
    await this.tasksService.changeConversionPaid();
  }

  @Get('update-status-conversions-is-pending/:id')
  async updateStatusConversionIsPending(@Param('id') id: string) {
    if (!isFirebaseCronSecret(id)) {
      return { message: 'error' };
    }
    return await this.tasksService.updateStatusConversionIsPending();
  }

  @Get('get-spacial-point-next-round/:id')
  async getSpacialPointNextRound(@Param('id') id: string) {
    if (!isFirebaseCronSecret(id)) {
      return { message: 'error' };
    }
    return this.tasksService.getSpacialPointNextRound();
  }
}
