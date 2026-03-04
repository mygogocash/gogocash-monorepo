import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PointService } from './point.service';
import { InvolveService } from 'src/involve/involve.service';
import { delay } from 'rxjs';
import { Conversion } from 'src/withdraw/schemas/conversion.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { rateCurrencyUSD } from 'src/utils/helper';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly pointService: PointService,
    private readonly involveService: InvolveService,
    @InjectModel(Conversion.name) private conversionModel: Model<Conversion>,
  ) {}
  // @Cron('45 * * * * *')
  @Cron(CronExpression.EVERY_MINUTE)
  // @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCron() {
    this.logger.debug('Called when the current time is 00.00');

    // const conversions = await this.involveService.getConversionAll({
    //   page: 1,
    //   limit: 10,
    // });

    // let allConversions = conversions.data.data;
    // let currentPage = 1;

    // while (conversions.data.nextPage) {
    //   currentPage++;
    //   const nextConversions = await this.involveService.getConversionAll({
    //     page: currentPage,
    //     limit: 10,
    //   });
    //   allConversions = allConversions.concat(nextConversions.data.data);
    //   conversions.data.nextPage = nextConversions.data.nextPage;
    //   await delay(1000);
    // }
    // const filterAff = allConversions.filter((item) => {
    //   return item.aff_sub1 && item.aff_sub1.startsWith('user_id:');
    // });
    // const filterApproved = filterAff.filter((item) => {
    //   return item.conversion_status === 'approved';
    // });
    const filterApproved = await this.conversionModel
      .find({
        aff_sub1: { $regex: '^user_id:' },
        datetime_conversion: {
          $gte: new Date(new Date().setDate(new Date().getDate() - 10)),
          $lt: new Date(),
        },
        // conversion_status: 'approved',
        // add_point: { $exists: false },
      })
      .lean();
    console.log('filterApproved', filterApproved?.length);
    const rate = await rateCurrencyUSD();

    for (const conversion of filterApproved) {
      const userId = conversion.aff_sub1.split('user_id:')[1];
      // console.log('conversion', conversion.datetime_conversion);
      // const calculatedPoints = Math.floor(conversion.sale_amount / 100);
      let calculatedPoints = 0;
      if (conversion.currency === 'USD') {
        // console.log('rate', rate['THB']);
        calculatedPoints = Math.floor(conversion.sale_amount * rate['THB']);
      } else {
        calculatedPoints = Math.floor(conversion.sale_amount);
      }
      // console.log('calculatedPoints', calculatedPoints);
      // console.log(
      //   `User ID: ${userId}, ${conversion.conversion_id} Payout Amount: ${conversion.payout}, Calculated Points: ${calculatedPoints}`,
      // );
      await this.pointService.addPointsToUser(
        userId,
        calculatedPoints,
        conversion.conversion_id,
      );
      await delay(1000);
    }
    // await this.conversionModel.updateMany(
    //   { _id: { $in: filterApproved.map((c) => new Types.ObjectId(c._id)) } },
    //   { $set: { add_point: true } },
    // );
    console.log('add point done', filterApproved?.length);
  }
}
