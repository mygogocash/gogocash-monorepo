import { Module } from '@nestjs/common';
import { InvolveService } from './involve.service';
import { InvolveController } from './involve.controller';
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

@Module({
  imports: [
    CacheModule.register(),
    MongooseModule.forFeature([
      { name: Offer.name, schema: OfferSchema },
      { name: Deeplink.name, schema: DeeplinkSchema },
      { name: User.name, schema: UserSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Conversion.name, schema: ConversionSchema },
    ]),
  ],
  controllers: [InvolveController],
  providers: [InvolveService, JwtService],
})
export class InvolveModule {}
