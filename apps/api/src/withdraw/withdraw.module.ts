import { Module } from '@nestjs/common';
import { WithdrawService } from './withdraw.service';
import { WithdrawController } from './withdraw.controller';
import { JwtService } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '@nestjs/cache-manager';
import { User, UserSchema } from 'src/user/schemas/user.schema';
import { InvolveModule } from 'src/involve/involve.module';
import { Offer, OfferSchema } from 'src/offer/schemas/offer.schema';
import { Deeplink, DeeplinkSchema } from 'src/involve/schemas/deeplink.schema';
import { Withdraw, WithdrawSchema } from './schemas/withdraw.schema';
import { FeeRate, FeeRateSchema } from './schemas/feeRate.schema';
import {
  WithdrawMethod,
  WithdrawMethodSchema,
} from './schemas/withdrawMethod.schema';
import {
  UserMyCashback,
  UserMyCashbackSchema,
} from 'src/user/schemas/user-my-cashback.schema';
import { Category, CategorySchema } from 'src/offer/schemas/category.schema';
import { Conversion, ConversionSchema } from './schemas/conversion.schema';
import { TasksService } from './tasksService';
import { JobService } from './cronjob/job.service';
import { Quest, QuestSchema } from 'src/point/schemas/quest.schema';
import { Point, PointSchema } from 'src/point/schemas/point.schema';
import {
  SocialReward,
  SocialRewardSchema,
} from 'src/point/schemas/social-reward.schema';
import { RewardList, RewardListSchema } from './schemas/rewardList.schema';
import {
  WithdrawFeeCoupon,
  WithdrawFeeCouponSchema,
} from './schemas/withdraw-fee-coupon.schema';
import {
  WithdrawFeeCouponRedemption,
  WithdrawFeeCouponRedemptionSchema,
} from './schemas/withdraw-fee-coupon-redemption.schema';
import { GoogleDriveService } from 'src/google-drive/google-drive.service';
import { AnalyticsService } from 'src/analytics/analytics.service';
import { PointModule } from 'src/point/point.module';
import { AdminActivityModule } from 'src/admin/activity/admin-activity.module';

@Module({
  imports: [
    CacheModule.register(),
    PointModule,
    InvolveModule,
    AdminActivityModule,
    MongooseModule.forFeature([
      { name: Offer.name, schema: OfferSchema },
      { name: Deeplink.name, schema: DeeplinkSchema },
      { name: User.name, schema: UserSchema },
      { name: Withdraw.name, schema: WithdrawSchema },
      { name: FeeRate.name, schema: FeeRateSchema },
      { name: WithdrawMethod.name, schema: WithdrawMethodSchema },
      { name: UserMyCashback.name, schema: UserMyCashbackSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Conversion.name, schema: ConversionSchema },
      { name: Quest.name, schema: QuestSchema },
      { name: Point.name, schema: PointSchema },
      { name: SocialReward.name, schema: SocialRewardSchema },
      { name: RewardList.name, schema: RewardListSchema },
      { name: WithdrawFeeCoupon.name, schema: WithdrawFeeCouponSchema },
      {
        name: WithdrawFeeCouponRedemption.name,
        schema: WithdrawFeeCouponRedemptionSchema,
      },
    ]),
  ],
  controllers: [WithdrawController],
  providers: [
    WithdrawService,
    JwtService,
    TasksService,
    JobService,
    GoogleDriveService,
    AnalyticsService,
  ],
})
export class WithdrawModule {}
