import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth.guard';
import { EmailModule } from 'src/email/email.module';
import { Deeplink, DeeplinkSchema } from 'src/involve/schemas/deeplink.schema';
import { MediaModule } from 'src/media/media.module';
import {
  FavoriteOffer,
  FavoriteOfferSchema,
} from 'src/offer/schemas/favorite-offer.schema';
import {
  MissionOrder,
  MissionOrderSchema,
} from 'src/offer/schemas/missing-order.schema';
import { Point, PointSchema } from 'src/point/schemas/point.schema';
import {
  SocialReward,
  SocialRewardSchema,
} from 'src/point/schemas/social-reward.schema';
import {
  GototrackUserSettings,
  GototrackUserSettingsSchema,
} from 'src/gototrack/schemas/gototrack-user-settings.schema';
import { User, UserSchema } from 'src/user/schemas/user.schema';
import {
  UserMyCashback,
  UserMyCashbackSchema,
} from 'src/user/schemas/user-my-cashback.schema';
import { Withdraw, WithdrawSchema } from 'src/withdraw/schemas/withdraw.schema';
import {
  WithdrawMethod,
  WithdrawMethodSchema,
} from 'src/withdraw/schemas/withdrawMethod.schema';
import { PdpaController } from './pdpa.controller';
import { PdpaExportService } from './pdpa-export.service';
import { PdpaGatherService } from './pdpa-gather.service';
import {
  DataExportRequest,
  DataExportRequestSchema,
} from './schemas/data-export-request.schema';

@Module({
  imports: [
    EmailModule,
    MediaModule,
    JwtModule.register({ secret: process.env.JWT_SECRET }),
    MongooseModule.forFeature([
      { name: DataExportRequest.name, schema: DataExportRequestSchema },
      { name: User.name, schema: UserSchema },
      { name: UserMyCashback.name, schema: UserMyCashbackSchema },
      { name: WithdrawMethod.name, schema: WithdrawMethodSchema },
      { name: Withdraw.name, schema: WithdrawSchema },
      { name: FavoriteOffer.name, schema: FavoriteOfferSchema },
      { name: MissionOrder.name, schema: MissionOrderSchema },
      { name: Point.name, schema: PointSchema },
      { name: SocialReward.name, schema: SocialRewardSchema },
      { name: Deeplink.name, schema: DeeplinkSchema },
      { name: GototrackUserSettings.name, schema: GototrackUserSettingsSchema },
    ]),
  ],
  controllers: [PdpaController],
  providers: [PdpaGatherService, PdpaExportService, FirebaseAuthGuard],
})
export class PdpaModule {}
