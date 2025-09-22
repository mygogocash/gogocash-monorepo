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

@Module({
  imports: [
    InvolveModule,
    MongooseModule.forFeature([
      { name: UserAdmin.name, schema: UserAdminSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService, UserAdminService, JwtService],
})
export class AdminModule {}
