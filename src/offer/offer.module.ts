import { Module } from '@nestjs/common';
import { OfferService } from './offer.service';
import { OfferController } from './offer.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Offer, OfferSchema } from 'src/offer/schemas/offer.schema';
import { Deeplink, DeeplinkSchema } from 'src/involve/schemas/deeplink.schema';
import { JwtService } from '@nestjs/jwt';
import { User, UserSchema } from 'src/user/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Offer.name, schema: OfferSchema },
      {
        name: Deeplink.name,
        schema: DeeplinkSchema,
      },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [OfferController],
  providers: [OfferService, JwtService],
})
export class OfferModule {}
