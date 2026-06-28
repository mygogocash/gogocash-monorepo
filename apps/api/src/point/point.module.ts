import { Module } from '@nestjs/common';
import { PointService } from './point.service';
import { PointController } from './point.controller';
import { TasksService } from './tasksService';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/user/schemas/user.schema';
import { Point, PointSchema } from './schemas/point.schema';
import { InvolveService } from 'src/involve/involve.service';
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
import { MediaModule } from 'src/media/media.module';
import { AnalyticsService } from 'src/analytics/analytics.service';

@Module({
  imports: [
    CacheModule.register(),
    MediaModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Point.name, schema: PointSchema },
      { name: Offer.name, schema: OfferSchema },
      { name: Deeplink.name, schema: DeeplinkSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Conversion.name, schema: ConversionSchema },
      { name: FeeRate.name, schema: FeeRateSchema },
      { name: Quest.name, schema: QuestSchema },
      { name: SocialReward.name, schema: SocialRewardSchema },
      { name: Quest.name, schema: QuestSchema },
    ]),
  ],
  controllers: [PointController],
  providers: [
    PointService,
    TasksService,
    InvolveService,
    JwtService,
    AnalyticsService,
  ],
  exports: [PointService],
})
export class PointModule {}
