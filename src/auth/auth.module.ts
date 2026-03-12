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
import { UserMyCashback, UserMyCashbackSchema } from 'src/user/schemas/user-my-cashback.schema';
import { EmailModule } from 'src/email/email.module';
import { OtpService } from './otp.service';
import { EmailOtpVerification, EmailOtpVerificationSchema } from './schemas/email-otp.schema';
import { AnalyticsModule } from 'src/analytics/analytics.module';

@Module({
  imports: [
    ConfigModule,
    EmailModule, // Provides EmailService (nodemailer with Gmail SMTP)
    AnalyticsModule, // Provides AnalyticsService
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Point.name, schema: PointSchema },
      { name: UserMyCashback.name, schema: UserMyCashbackSchema },
      { name: EmailOtpVerification.name, schema: EmailOtpVerificationSchema }, // OTP schema
    ]),
    JwtModule.register({
      secret: process.env.CROSSMINT_SECRET,
      signOptions: { expiresIn: '60m' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, UserService, JwtService, OtpService],
})
export class AuthModule {}
