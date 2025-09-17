import { Module } from '@nestjs/common';
import { InvolveService } from './involve.service';
import { InvolveController } from './involve.controller';
import { CacheModule } from '@nestjs/cache-manager';
import { MongooseModule } from '@nestjs/mongoose';
import { Offer, OfferSchema } from './schemas/offer.schema';

@Module({
  imports: [
    CacheModule.register(),
    MongooseModule.forFeature([{ name: Offer.name, schema: OfferSchema }]),
  ],
  controllers: [InvolveController],
  providers: [InvolveService],
})
export class InvolveModule {}
