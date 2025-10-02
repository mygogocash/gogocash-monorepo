import { Module } from '@nestjs/common';
import { InvolveService } from './involve.service';
import { InvolveController } from './involve.controller';
import { CacheModule } from '@nestjs/cache-manager';
import { MongooseModule } from '@nestjs/mongoose';
import { Offer, OfferSchema } from '../offer/schemas/offer.schema';
import { JwtService } from '@nestjs/jwt';
import { Deeplink, DeeplinkSchema } from './schemas/deeplink.schema';
import { User, UserSchema } from 'src/user/schemas/user.schema';

@Module({
  imports: [
    CacheModule.register(),
    MongooseModule.forFeature([
      { name: Offer.name, schema: OfferSchema },
      { name: Deeplink.name, schema: DeeplinkSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [InvolveController],
  providers: [InvolveService, JwtService],
})
export class InvolveModule {}
