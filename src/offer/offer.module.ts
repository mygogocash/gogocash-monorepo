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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Offer.name, schema: OfferSchema },
      {
        name: Deeplink.name,
        schema: DeeplinkSchema,
      },
      { name: User.name, schema: UserSchema },
      { name: Category.name, schema: CategorySchema },
      { name: FavoriteOffer.name, schema: FavoriteOfferSchema },
    ]),
  ],
  controllers: [OfferController],
  providers: [OfferService, JwtService, TasksService],
})
export class OfferModule {}
