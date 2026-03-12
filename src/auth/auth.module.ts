/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigModule } from '@nestjs/config';
import { UserService } from 'src/user/user.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/user/schemas/user.schema';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Point } from 'src/point/entities/point.entity';
import { PointSchema } from 'src/point/schemas/point.schema';
<<<<<<< feat/line-miniapp
import { UserMyCashback, UserMyCashbackSchema } from 'src/user/schemas/user-my-cashback.schema';
import { EmailModule } from 'src/email/email.module';
import { OtpService } from './otp.service';
import { EmailOtpVerification, EmailOtpVerificationSchema } from './schemas/email-otp.schema';

@Module({
  imports: [
    ConfigModule,
    EmailModule, // Provides EmailService
=======
import {
  UserMyCashback,
  UserMyCashbackSchema,
} from 'src/user/schemas/user-my-cashback.schema';
import { OtpService } from './otp.service';
import { MailerModule } from '@nestjs-modules/mailer';
import { UserOtp, UserOtpSchema } from 'src/user/schemas/user-otp.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
>>>>>>> feature/login-firebase
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Point.name, schema: PointSchema },
      { name: UserMyCashback.name, schema: UserMyCashbackSchema },
<<<<<<< feat/line-miniapp
      { name: EmailOtpVerification.name, schema: EmailOtpVerificationSchema }, // OTP schema
=======
      { name: UserOtp.name, schema: UserOtpSchema },
>>>>>>> feature/login-firebase
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
  controllers: [AuthController],
<<<<<<< feat/line-miniapp
  providers: [AuthService, UserService, JwtService, OtpService], // Add OtpService
=======
  providers: [AuthService, UserService, JwtService, OtpService],
>>>>>>> feature/login-firebase
})
export class AuthModule {}
