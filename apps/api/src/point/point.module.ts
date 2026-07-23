import { Module } from '@nestjs/common';
import { PointService } from './point.service';
import { PointController } from './point.controller';
import { TasksService } from './tasksService';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/user/schemas/user.schema';
import { Point, PointSchema } from './schemas/point.schema';
import { CacheModule } from '@nestjs/cache-manager';
import { Offer, OfferSchema } from 'src/offer/schemas/offer.schema';
import { Deeplink, DeeplinkSchema } from 'src/involve/schemas/deeplink.schema';
import { JwtService } from '@nestjs/jwt';
import { Category, CategorySchema } from 'src/offer/schemas/category.schema';
import {
  Conversion,
  ConversionSchema,
} from 'src/withdraw/schemas/conversion.schema';
import { FeeRate, FeeRateSchema } from 'src/withdraw/schemas/feeRate.schema';
import { Quest, QuestSchema } from './schemas/quest.schema';
import {
  SocialReward,
  SocialRewardSchema,
} from './schemas/social-reward.schema';
import {
  ReferralPayout,
  ReferralPayoutSchema,
} from './schemas/referral-payout.schema';
import { MediaModule } from 'src/media/media.module';
import { AnalyticsService } from 'src/analytics/analytics.service';
import {
  QuestMediaWriteCommand,
  QuestMediaWriteCommandSchema,
} from './schemas/quest-media-write-command.schema';
import {
  QuestMediaCleanup,
  QuestMediaCleanupSchema,
} from './schemas/quest-media-cleanup.schema';
import { QuestMediaWriteService } from './quest-media-write.service';
import { QuestMediaCleanupService } from './quest-media-cleanup.service';
import { QuestMediaQaService } from './quest-media-qa.service';
import { QuestTaskEngineModule } from 'src/quest-task-engine/quest-task-engine.module';
import {
  MembershipTier,
  MembershipTierSchema,
} from 'src/admin/membership/schemas/membership-tier.schema';

@Module({
  imports: [
    CacheModule.register(),
    MediaModule,
    QuestTaskEngineModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Point.name, schema: PointSchema },
      { name: Offer.name, schema: OfferSchema },
      { name: Deeplink.name, schema: DeeplinkSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Conversion.name, schema: ConversionSchema },
      { name: FeeRate.name, schema: FeeRateSchema },
      { name: Quest.name, schema: QuestSchema },
      { name: MembershipTier.name, schema: MembershipTierSchema },
      { name: SocialReward.name, schema: SocialRewardSchema },
      { name: ReferralPayout.name, schema: ReferralPayoutSchema },
      {
        name: QuestMediaWriteCommand.name,
        schema: QuestMediaWriteCommandSchema,
      },
      { name: QuestMediaCleanup.name, schema: QuestMediaCleanupSchema },
    ]),
  ],
  controllers: [PointController],
  // InvolveService removed: the point cron's only reference to it was
  // fully commented-out dead code, so the provider (and its injection into
  // TasksService) was vestigial.
  providers: [
    PointService,
    TasksService,
    JwtService,
    AnalyticsService,
    QuestMediaWriteService,
    QuestMediaCleanupService,
    QuestMediaQaService,
  ],
  exports: [PointService],
})
export class PointModule {}
