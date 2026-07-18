import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthAdminGuard } from '../jwt-auth-admin.guard';
import { RolesGuard } from '../roles.guard';
import {
  AdminActivityEvent,
  AdminActivityEventSchema,
} from './schemas/admin-activity-event.schema';
import { AdminActivityService } from './admin-activity.service';
import { AdminActivityController } from './admin-activity.controller';

@Module({
  imports: [
    JwtModule.register({ secret: process.env.JWT_ADMIN_SECRET }),
    MongooseModule.forFeature([
      { name: AdminActivityEvent.name, schema: AdminActivityEventSchema },
    ]),
  ],
  controllers: [AdminActivityController],
  providers: [AdminActivityService, AuthAdminGuard, RolesGuard],
  exports: [AdminActivityService],
})
export class AdminActivityModule {}
