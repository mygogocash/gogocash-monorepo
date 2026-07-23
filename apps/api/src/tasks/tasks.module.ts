import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { InvolveModule } from 'src/involve/involve.module';
import { AffiliateModule } from 'src/affiliate/affiliate.module';
import { CacheModule } from '@nestjs/cache-manager';
import { MongooseModule } from '@nestjs/mongoose';
import { FeeRate, FeeRateSchema } from 'src/withdraw/schemas/feeRate.schema';
import {
  Conversion,
  ConversionSchema,
} from 'src/withdraw/schemas/conversion.schema';
import { Category, CategorySchema } from 'src/offer/schemas/category.schema';
import { User, UserSchema } from 'src/user/schemas/user.schema';
import { Deeplink, DeeplinkSchema } from 'src/involve/schemas/deeplink.schema';
import { Offer } from 'src/offer/entities/offer.entity';
import { OfferSchema } from 'src/offer/schemas/offer.schema';
import { Quest, QuestSchema } from 'src/point/schemas/quest.schema';
import {
  SocialReward,
  SocialRewardSchema,
} from 'src/point/schemas/social-reward.schema';
import { Point, PointSchema } from 'src/point/schemas/point.schema';
import {
  ReferralPayout,
  ReferralPayoutSchema,
} from 'src/point/schemas/referral-payout.schema';
import { GoogleDriveService } from 'src/google-drive/google-drive.service';
import { JobService } from 'src/withdraw/cronjob/job.service';
import { WithdrawService } from 'src/withdraw/withdraw.service';
import { Withdraw } from 'src/withdraw/entities/withdraw.entity';
import { WithdrawSchema } from 'src/withdraw/schemas/withdraw.schema';
import {
  WithdrawMethod,
  WithdrawMethodSchema,
} from 'src/withdraw/schemas/withdrawMethod.schema';
import {
  UserMyCashback,
  UserMyCashbackSchema,
} from 'src/user/schemas/user-my-cashback.schema';
import {
  RewardList,
  RewardListSchema,
} from 'src/withdraw/schemas/rewardList.schema';
import {
  WithdrawFeeCoupon,
  WithdrawFeeCouponSchema,
} from 'src/withdraw/schemas/withdraw-fee-coupon.schema';
import {
  WithdrawFeeCouponRedemption,
  WithdrawFeeCouponRedemptionSchema,
} from 'src/withdraw/schemas/withdraw-fee-coupon-redemption.schema';
import { PointModule } from 'src/point/point.module';
import { AdminActivityModule } from 'src/admin/activity/admin-activity.module';
import {
  WalletAdjustment,
  WalletAdjustmentSchema,
} from 'src/admin/wallets/schemas/wallet-adjustment.schema';
import {
  LegacyRewardManifestRecord,
  LegacyRewardManifestSchema,
} from './schemas/legacy-reward-manifest.schema';
import {
  LegacyRewardResolutionCommand,
  LegacyRewardResolutionCommandSchema,
} from './schemas/legacy-reward-resolution-command.schema';

@Module({
  imports: [
    CacheModule.register(),
    PointModule,
    // InvolveModule stays: JobService (a provider here) uses InvolveService for
    // conversion pulls. AffiliateModule adds the seam the update-offers route
    // dispatches through.
    InvolveModule,
    AffiliateModule,
    // WithdrawService (provided below) audits via AdminActivityService — same
    // seam as WithdrawModule. Without this import Nest fails Railway health
    // checks with UnknownDependenciesException on boot.
    AdminActivityModule,
    // TasksController is guarded by AuthAdminGuard, which injects JwtService.
    // Without this registration Nest cannot resolve the guard's dependency and
    // the whole app fails to boot (UnknownDependenciesException). Mirrors the
    // JwtModule registration in every other AuthAdminGuard-protected module.
    JwtModule.register({ secret: process.env.JWT_ADMIN_SECRET }),
    MongooseModule.forFeature([
      { name: Offer.name, schema: OfferSchema },
      { name: Deeplink.name, schema: DeeplinkSchema },
      { name: User.name, schema: UserSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Conversion.name, schema: ConversionSchema },
      { name: FeeRate.name, schema: FeeRateSchema },
      { name: Quest.name, schema: QuestSchema },
      { name: SocialReward.name, schema: SocialRewardSchema },
      { name: Point.name, schema: PointSchema },
      { name: ReferralPayout.name, schema: ReferralPayoutSchema },
      { name: Withdraw.name, schema: WithdrawSchema },
      { name: WithdrawMethod.name, schema: WithdrawMethodSchema },
      { name: UserMyCashback.name, schema: UserMyCashbackSchema },
      { name: RewardList.name, schema: RewardListSchema },
      // Keep in lockstep with WithdrawModule — TasksModule re-provides
      // WithdrawService for cron/job wiring and must own the same models.
      { name: WithdrawFeeCoupon.name, schema: WithdrawFeeCouponSchema },
      {
        name: WithdrawFeeCouponRedemption.name,
        schema: WithdrawFeeCouponRedemptionSchema,
      },
      { name: WalletAdjustment.name, schema: WalletAdjustmentSchema },
      {
        name: LegacyRewardManifestRecord.name,
        schema: LegacyRewardManifestSchema,
      },
      {
        name: LegacyRewardResolutionCommand.name,
        schema: LegacyRewardResolutionCommandSchema,
      },
    ]),
  ],
  controllers: [TasksController],
  providers: [TasksService, GoogleDriveService, JobService, WithdrawService],
})
export class TasksModule {}
