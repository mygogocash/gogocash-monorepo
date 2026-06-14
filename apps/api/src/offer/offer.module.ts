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
import { InvolveService } from 'src/involve/involve.service';
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
import { GoogleDriveService } from 'src/google-drive/google-drive.service';

@Module({
  imports: [
    CacheModule.register(),
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
      { name: Conversion.name, schema: ConversionSchema },
      { name: Coupon.name, schema: CouponSchema },
      { name: FeeRate.name, schema: FeeRateSchema },
      { name: MissionOrder.name, schema: MissionOrderSchema },
    ]),
  ],
  controllers: [OfferController],
  providers: [
    OfferService,
    JwtService,
    TasksService,
    InvolveService,
    GoogleDriveService,
  ],
})
export class OfferModule {}
