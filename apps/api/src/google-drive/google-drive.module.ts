import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { GoogleDriveService } from './google-drive.service';
import { GoogleDriveController } from './google-drive.controller';
import { AuthAdminGuard } from '../admin/jwt-auth-admin.guard';

@Module({
  // AuthAdminGuard (class-level on the controller) injects JwtService and the
  // Mongoose connection. Register the same admin-secret JwtModule the other
  // admin-guarded modules use, and provide the guard so Nest can resolve it. The
  // connection comes from the app-level MongooseModule.forRoot, whose core module
  // is @Global — no forFeature needed here (this module has no models).
  imports: [JwtModule.register({ secret: process.env.JWT_ADMIN_SECRET })],
  controllers: [GoogleDriveController],
  providers: [GoogleDriveService, AuthAdminGuard],
  exports: [GoogleDriveService],
})
export class GoogleDriveModule {}
