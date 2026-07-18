import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AdminActivityEvent,
  AdminActivityEventSchema,
} from './schemas/admin-activity-event.schema';
import { AdminActivityService } from './admin-activity.service';
import { AdminActivityController } from './admin-activity.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AdminActivityEvent.name, schema: AdminActivityEventSchema },
    ]),
  ],
  controllers: [AdminActivityController],
  providers: [AdminActivityService],
  exports: [AdminActivityService],
})
export class AdminActivityModule {}
