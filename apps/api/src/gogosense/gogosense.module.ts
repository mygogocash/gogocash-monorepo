import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { InvolveModule } from 'src/involve/involve.module';
import { User, UserSchema } from 'src/user/schemas/user.schema';
import { GogosenseController } from './gogosense.controller';
import { GogosenseService } from './gogosense.service';
import {
  GogosenseActivationEvent,
  GogosenseActivationEventSchema,
} from './schemas/gogosense-activation-event.schema';
import {
  GogosenseDetectionEvent,
  GogosenseDetectionEventSchema,
} from './schemas/gogosense-detection-event.schema';
import {
  GogosenseMerchant,
  GogosenseMerchantSchema,
} from './schemas/gogosense-merchant.schema';
import {
  GogosenseScreenshotJob,
  GogosenseScreenshotJobSchema,
} from './schemas/gogosense-screenshot-job.schema';
import {
  GogosenseUserSettings,
  GogosenseUserSettingsSchema,
} from './schemas/gogosense-user-settings.schema';

@Module({
  imports: [
    InvolveModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: GogosenseMerchant.name, schema: GogosenseMerchantSchema },
      {
        name: GogosenseDetectionEvent.name,
        schema: GogosenseDetectionEventSchema,
      },
      {
        name: GogosenseActivationEvent.name,
        schema: GogosenseActivationEventSchema,
      },
      {
        name: GogosenseScreenshotJob.name,
        schema: GogosenseScreenshotJobSchema,
      },
      { name: GogosenseUserSettings.name, schema: GogosenseUserSettingsSchema },
    ]),
  ],
  controllers: [GogosenseController],
  providers: [GogosenseService, JwtService],
  exports: [GogosenseService],
})
export class GogosenseModule {}
