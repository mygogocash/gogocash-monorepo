import { Module } from '@nestjs/common';
import { WithdrawService } from './withdraw.service';
import { WithdrawController } from './withdraw.controller';
import { JwtService } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/user/schemas/user.schema';
import { InvolveService } from 'src/involve/involve.service';
import { CacheModule } from '@nestjs/cache-manager';
import { Offer, OfferSchema } from 'src/offer/schemas/offer.schema';
import { Deeplink, DeeplinkSchema } from 'src/involve/schemas/deeplink.schema';
import { Withdraw, WithdrawSchema } from './schemas/withdraw.schema';
import { FeeRate, FeeRateSchema } from './schemas/feeRate.schema';
import {
  WithdrawMethod,
  WithdrawMethodSchema,
} from './schemas/withdrawMethod.schema';
import {
  UserMyCashback,
  UserMyCashbackSchema,
} from 'src/user/schemas/user-my-cashback.schema';
import { Category, CategorySchema } from 'src/offer/schemas/category.schema';
import { Conversion, ConversionSchema } from './schemas/conversion.schema';
import { TasksService } from './tasksService';

@Module({
  imports: [
    CacheModule.register(),
    MongooseModule.forFeature([
      { name: Offer.name, schema: OfferSchema },
      { name: Deeplink.name, schema: DeeplinkSchema },
      { name: User.name, schema: UserSchema },
      { name: Withdraw.name, schema: WithdrawSchema },
      { name: FeeRate.name, schema: FeeRateSchema },
      { name: WithdrawMethod.name, schema: WithdrawMethodSchema },
      { name: UserMyCashback.name, schema: UserMyCashbackSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Conversion.name, schema: ConversionSchema },
    ]),
  ],
  controllers: [WithdrawController],
  providers: [WithdrawService, JwtService, InvolveService, TasksService],
})
export class WithdrawModule {}
