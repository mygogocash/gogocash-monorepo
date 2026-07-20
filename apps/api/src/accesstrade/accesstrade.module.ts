import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Offer, OfferSchema } from 'src/offer/schemas/offer.schema';
import { Deeplink, DeeplinkSchema } from 'src/involve/schemas/deeplink.schema';
import { AccesstradeService } from './accesstrade.service';

/**
 * Owns the Accesstrade Global network service + its Mongo models, mirroring
 * OptimiseModule/InvolveModule. Exports the service so the affiliate seam's
 * AccesstradeAffiliateProvider (declared in AffiliateModule) can delegate to it.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Offer.name, schema: OfferSchema },
      { name: Deeplink.name, schema: DeeplinkSchema },
    ]),
  ],
  providers: [AccesstradeService],
  exports: [AccesstradeService],
})
export class AccesstradeModule {}
