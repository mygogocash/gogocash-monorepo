import { Module } from '@nestjs/common';
import { OfferService } from './offer.service';
import { OfferController } from './offer.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Offer, OfferSchema } from 'src/offer/schemas/offer.schema';
import { Deeplink, DeeplinkSchema } from 'src/involve/schemas/deeplink.schema';
import { JwtService } from '@nestjs/jwt';
import { User, UserSchema } from 'src/user/schemas/user.schema';
import { TasksService } from './tasksService';
import { Category, CategorySchema } from './schemas/category.schema';
import {
  FavoriteOffer,
  FavoriteOfferSchema,
} from './schemas/favorite-offer.schema';
import { Banner, BannerSchema } from './schemas/banner.schema';
import {
  TopBrandConfig,
  TopBrandConfigSchema,
} from './schemas/top-brand-config.schema';
import { AffiliateModule } from 'src/affiliate/affiliate.module';
import { CacheModule } from '@nestjs/cache-manager';
import {
  Conversion,
  ConversionSchema,
} from 'src/withdraw/schemas/conversion.schema';
import { Coupon, CouponSchema } from './schemas/coupon.schema';
import { FeeRate, FeeRateSchema } from 'src/withdraw/schemas/feeRate.schema';
import {
  MissionOrder,
  MissionOrderSchema,
} from './schemas/missing-order.schema';
import { MediaModule } from 'src/media/media.module';
import { Quest, QuestSchema } from 'src/point/schemas/quest.schema';
import {
  FeaturedSearchTerm,
  FeaturedSearchTermSchema,
} from 'src/admin/search/schemas/featured-term.schema';
import {
  SearchBoostRule,
  SearchBoostRuleSchema,
} from 'src/admin/search/schemas/boost-rule.schema';
import {
  SearchBlacklist,
  SearchBlacklistSchema,
} from 'src/admin/search/schemas/blacklist.schema';

@Module({
  imports: [
    CacheModule.register(),
    MediaModule,
    // The offer-sync cron (TasksService) dispatches through the affiliate seam.
    AffiliateModule,
    MongooseModule.forFeature([
      { name: Offer.name, schema: OfferSchema },
      {
        name: Deeplink.name,
        schema: DeeplinkSchema,
      },
      { name: User.name, schema: UserSchema },
      { name: Category.name, schema: CategorySchema },
      { name: FavoriteOffer.name, schema: FavoriteOfferSchema },
      { name: Banner.name, schema: BannerSchema },
      { name: TopBrandConfig.name, schema: TopBrandConfigSchema },
      { name: Conversion.name, schema: ConversionSchema },
      { name: Coupon.name, schema: CouponSchema },
      { name: FeeRate.name, schema: FeeRateSchema },
      { name: MissionOrder.name, schema: MissionOrderSchema },
      { name: Quest.name, schema: QuestSchema },
      { name: FeaturedSearchTerm.name, schema: FeaturedSearchTermSchema },
      { name: SearchBoostRule.name, schema: SearchBoostRuleSchema },
      { name: SearchBlacklist.name, schema: SearchBlacklistSchema },
    ]),
  ],
  controllers: [OfferController],
  // InvolveService removed here: it was a second, module-local instance. The
  // offer-sync cron now reaches Involve through the AffiliateModule registry
  // (which shares the InvolveModule singleton), so no duplicate is needed.
  providers: [OfferService, JwtService, TasksService],
})
export class OfferModule {}
