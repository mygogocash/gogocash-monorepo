import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { CacheModule } from '@nestjs/cache-manager';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UserAdminService } from './user-admin/user-admin-service';

import {
  UserAdmin,
  UserAdminSchema,
} from './user-admin/schemas/user-admin.schema';
import { User, UserSchema } from 'src/user/schemas/user.schema';
import { Withdraw, WithdrawSchema } from 'src/withdraw/schemas/withdraw.schema';
import { FeeRate, FeeRateSchema } from 'src/withdraw/schemas/feeRate.schema';
import { Offer, OfferSchema } from 'src/offer/schemas/offer.schema';
import {
  Category,
  CategorySchema,
} from 'src/offer/schemas/category.schema';
import {
  Conversion,
  ConversionSchema,
} from 'src/withdraw/schemas/conversion.schema';
import {
  UserMyCashback,
  UserMyCashbackSchema,
} from 'src/user/schemas/user-my-cashback.schema';
import { Banner, BannerSchema } from 'src/offer/schemas/banner.schema';
import { Deeplink, DeeplinkSchema } from 'src/involve/schemas/deeplink.schema';
import {
  WithdrawMethod,
  WithdrawMethodSchema,
} from 'src/withdraw/schemas/withdrawMethod.schema';
import { Coupon, CouponSchema } from 'src/offer/schemas/coupon.schema';
import {
  RewardList,
  RewardListSchema,
} from 'src/withdraw/schemas/rewardList.schema';
import { Quest, QuestSchema } from 'src/point/schemas/quest.schema';
import { Point, PointSchema } from 'src/point/schemas/point.schema';
import {
  SocialReward,
  SocialRewardSchema,
} from 'src/point/schemas/social-reward.schema';

import { InvolveService } from 'src/involve/involve.service';
import { UserService } from 'src/user/user.service';
import { GoogleDriveService } from 'src/google-drive/google-drive.service';
import { JobService } from 'src/withdraw/cronjob/job.service';
import { PointService } from 'src/point/point.service';
import { WithdrawService } from 'src/withdraw/withdraw.service';
import { AnalyticsModule } from 'src/analytics/analytics.module';

@Module({
  imports: [
    CacheModule.register(),
    AnalyticsModule,
    MongooseModule.forFeature([
      { name: UserAdmin.name, schema: UserAdminSchema },
      { name: User.name, schema: UserSchema },
      { name: Withdraw.name, schema: WithdrawSchema },
      { name: FeeRate.name, schema: FeeRateSchema },
      { name: Offer.name, schema: OfferSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Conversion.name, schema: ConversionSchema },
      { name: UserMyCashback.name, schema: UserMyCashbackSchema },
      { name: Banner.name, schema: BannerSchema },
      { name: Deeplink.name, schema: DeeplinkSchema },
      { name: WithdrawMethod.name, schema: WithdrawMethodSchema },
      { name: Coupon.name, schema: CouponSchema },
      { name: RewardList.name, schema: RewardListSchema },
      { name: Quest.name, schema: QuestSchema },
      { name: Point.name, schema: PointSchema },
      { name: SocialReward.name, schema: SocialRewardSchema },
    ]),
    JwtModule.register({
      secret: process.env.JWT_ADMIN_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AdminController],
  providers: [
    AdminService,
    UserAdminService,
    JwtService,
    InvolveService,
    UserService,
    GoogleDriveService,
    JobService,
    PointService,
    WithdrawService,
  ],
  exports: [AdminService, UserAdminService],
})
export class AdminModule {}
