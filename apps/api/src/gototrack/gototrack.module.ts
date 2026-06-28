import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { InvolveModule } from 'src/involve/involve.module';
import { User, UserSchema } from 'src/user/schemas/user.schema';
import { GototrackController } from './gototrack.controller';
import { GototrackService } from './gototrack.service';
import {
  GototrackActivationEvent,
  GototrackActivationEventSchema,
} from './schemas/gototrack-activation-event.schema';
import {
  GototrackDetectionEvent,
  GototrackDetectionEventSchema,
} from './schemas/gototrack-detection-event.schema';
import {
  GototrackMerchant,
  GototrackMerchantSchema,
} from './schemas/gototrack-merchant.schema';
import {
  GototrackScreenshotJob,
  GototrackScreenshotJobSchema,
} from './schemas/gototrack-screenshot-job.schema';
import {
  GototrackUserSettings,
  GototrackUserSettingsSchema,
} from './schemas/gototrack-user-settings.schema';

@Module({
  imports: [
    InvolveModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: GototrackMerchant.name, schema: GototrackMerchantSchema },
      {
        name: GototrackDetectionEvent.name,
        schema: GototrackDetectionEventSchema,
      },
      {
        name: GototrackActivationEvent.name,
        schema: GototrackActivationEventSchema,
      },
      {
        name: GototrackScreenshotJob.name,
        schema: GototrackScreenshotJobSchema,
      },
      { name: GototrackUserSettings.name, schema: GototrackUserSettingsSchema },
    ]),
  ],
  controllers: [GototrackController],
  providers: [GototrackService, JwtService],
  exports: [GototrackService],
})
export class GototrackModule {}
