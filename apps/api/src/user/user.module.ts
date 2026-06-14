/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { JwtService } from '@nestjs/jwt';
import {
  UserMyCashback,
  UserMyCashbackSchema,
} from './schemas/user-my-cashback.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserMyCashback.name, schema: UserMyCashbackSchema },
    ]),
  ],
  controllers: [UserController],
  providers: [UserService, JwtService],
})
export class UserModule {}
