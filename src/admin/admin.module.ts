import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { InvolveModule } from 'src/involve/involve.module';
import { UserAdminService } from './user-admin/user-admin-service';
import { MongooseModule } from '@nestjs/mongoose';
import {
  UserAdmin,
  UserAdminSchema,
} from './user-admin/schemas/user-admin.schema';
import { JwtService } from '@nestjs/jwt';
import { Withdraw, WithdrawSchema } from 'src/withdraw/schemas/withdraw.schema';
import { InvolveService } from 'src/involve/involve.service';
import { CacheModule } from '@nestjs/cache-manager';
import { Offer, OfferSchema } from 'src/offer/schemas/offer.schema';
import { Deeplink, DeeplinkSchema } from 'src/involve/schemas/deeplink.schema';
import { User, UserSchema } from 'src/user/schemas/user.schema';
import { FeeRate, FeeRateSchema } from 'src/withdraw/schemas/feeRate.schema';
import { GoogleDriveService } from 'src/google-drive/google-drive.service';

@Module({
  imports: [
    CacheModule.register(),
    InvolveModule,
    MongooseModule.forFeature([
      { name: UserAdmin.name, schema: UserAdminSchema },
      { name: Withdraw.name, schema: WithdrawSchema },
      { name: Offer.name, schema: OfferSchema },
      { name: Deeplink.name, schema: DeeplinkSchema },
      { name: User.name, schema: UserSchema },
      { name: FeeRate.name, schema: FeeRateSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [
    AdminService,
    UserAdminService,
    JwtService,
    InvolveService,
    GoogleDriveService,
  ],
})
export class AdminModule {}
