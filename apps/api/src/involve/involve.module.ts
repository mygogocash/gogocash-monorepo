import { Module } from '@nestjs/common';
import { InvolveService } from './involve.service';
import { InvolveController } from './involve.controller';
import { ConversionIngestService } from './conversion-ingest.service';
import { CacheModule } from '@nestjs/cache-manager';
import { MongooseModule } from '@nestjs/mongoose';
import { Offer, OfferSchema } from '../offer/schemas/offer.schema';
import { JwtService } from '@nestjs/jwt';
import { Deeplink, DeeplinkSchema } from './schemas/deeplink.schema';
import { User, UserSchema } from 'src/user/schemas/user.schema';
import { Category, CategorySchema } from 'src/offer/schemas/category.schema';
import {
  Conversion,
  ConversionSchema,
} from 'src/withdraw/schemas/conversion.schema';
import { FeeRate, FeeRateSchema } from 'src/withdraw/schemas/feeRate.schema';
import { RateLimitGuard } from 'src/auth/rate-limit.guard';
import {
  AffiliateMintReservation,
  AffiliateMintReservationSchema,
} from './schemas/affiliate-mint-reservation.schema';
import { CategoryIntegrityModule } from 'src/policy/category-integrity.module';
import { QuestTaskEngineModule } from 'src/quest-task-engine/quest-task-engine.module';

@Module({
  imports: [
    CacheModule.register(),
    CategoryIntegrityModule,
    QuestTaskEngineModule,
    MongooseModule.forFeature([
      { name: Offer.name, schema: OfferSchema },
      { name: Deeplink.name, schema: DeeplinkSchema },
      { name: User.name, schema: UserSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Conversion.name, schema: ConversionSchema },
      { name: FeeRate.name, schema: FeeRateSchema },
      {
        name: AffiliateMintReservation.name,
        schema: AffiliateMintReservationSchema,
      },
    ]),
  ],
  controllers: [InvolveController],
  // AnalyticsService resolves via the @Global AnalyticsModule (app.module);
  // a local provider would spawn a second PostHog client. exports required —
  // admin/gototrack/offer/point/withdraw inject InvolveService.
  providers: [
    InvolveService,
    ConversionIngestService,
    JwtService,
    RateLimitGuard,
  ],
  exports: [InvolveService, ConversionIngestService],
})
export class InvolveModule {}
