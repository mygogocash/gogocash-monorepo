import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PointService } from './point.service';
import { InvolveService } from 'src/involve/involve.service';
import { delay } from 'rxjs';
import { Conversion } from 'src/withdraw/schemas/conversion.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { rateCurrencyUSD } from 'src/utils/helper';
import { parseUserIdFromAffSub1 } from 'src/withdraw/conversion-user-id.util';

@Injectable()
export class TasksService {
  constructor(
    private readonly pointService: PointService,
    private readonly involveService: InvolveService,
    @InjectModel(Conversion.name) private conversionModel: Model<Conversion>,
  ) {}
  // @Cron('45 * * * * *')
  // @Cron(CronExpression.EVERY_MINUTE)
  // @Cron('0 31 0 7 * *')
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCron() {
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
        conversion_status: 'approved',
        add_point: { $ne: true },
        user_id: { $exists: true, $ne: null },
        datetime_conversion: {
          $gte: new Date(new Date().setDate(new Date().getDate() - 10)),
          $lt: new Date(),
        },
      })
      .lean();
    const rate = await rateCurrencyUSD();

    for (const conversion of filterApproved) {
      const userId =
        conversion.user_id?.toString() ??
        parseUserIdFromAffSub1(conversion.aff_sub1);
      if (!userId) {
        continue;
      }
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
    const awardedIds = filterApproved
      .map((conversion) => conversion._id)
      .filter(Boolean);
    if (awardedIds.length > 0) {
      await this.conversionModel.updateMany(
        { _id: { $in: awardedIds } },
        { $set: { add_point: true } },
      );
    }
  }
}
