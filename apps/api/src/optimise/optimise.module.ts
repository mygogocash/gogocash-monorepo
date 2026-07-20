import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Offer, OfferSchema } from 'src/offer/schemas/offer.schema';
import { Deeplink, DeeplinkSchema } from 'src/involve/schemas/deeplink.schema';
import { OptimiseService } from './optimise.service';

/**
 * Owns the Optimise Media network service + its Mongo models, mirroring
 * InvolveModule. Exports the service so the affiliate seam's
 * OptimiseAffiliateProvider (declared in AffiliateModule) can delegate to it —
 * keeping AffiliateModule model-free and the dependency edge one-way.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Offer.name, schema: OfferSchema },
      { name: Deeplink.name, schema: DeeplinkSchema },
    ]),
  ],
  providers: [OptimiseService],
  exports: [OptimiseService],
})
export class OptimiseModule {}
