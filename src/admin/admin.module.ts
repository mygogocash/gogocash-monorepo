/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UserService } from 'src/user/user.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/user/schemas/user.schema';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Point } from 'src/point/entities/point.entity';
import { PointSchema } from 'src/point/schemas/point.schema';
import {
  UserMyCashback,
  UserMyCashbackSchema,
} from 'src/user/schemas/user-my-cashback.schema';
import { MailerModule } from '@nestjs-modules/mailer';
import { UserOtp, UserOtpSchema } from 'src/user/schemas/user-otp.schema';
import { AuthService } from 'src/auth/auth.service';
import { OtpService } from 'src/auth/otp.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Point.name, schema: PointSchema },
      { name: UserMyCashback.name, schema: UserMyCashbackSchema },
      { name: UserOtp.name, schema: UserOtpSchema },
    ]),
    JwtModule.register({
      // This is for signing tokens your backend generates.
      // For verifying Crossmint's tokens, you'll use a separate verification process.
      secret: process.env.CROSSMINT_SECRET, // Your own secret for tokens you issue
      signOptions: { expiresIn: '60m' },
    }),
    MailerModule.forRoot({
      transport: {
        host: process.env.SMTP_HOST, // Change from 'localhost' to 'smtp.sendgrid.net'
        port: 587, // Use 587 (TLS) or 465 (SSL)
        secure: false, // true for 465, false for 587
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      },
    }),
  ],
  controllers: [AdminController],
  providers: [AuthService, UserService, JwtService, OtpService],
})
export class AuthModule {}
