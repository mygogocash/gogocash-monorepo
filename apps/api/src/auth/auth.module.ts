/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from 'src/user/user.module';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/user/schemas/user.schema';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Point } from 'src/point/entities/point.entity';
import { PointSchema } from 'src/point/schemas/point.schema';
import {
  UserMyCashback,
  UserMyCashbackSchema,
} from 'src/user/schemas/user-my-cashback.schema';
import { EmailModule } from 'src/email/email.module';
import { OtpService } from './otp.service';
import { UserOtp, UserOtpSchema } from 'src/user/schemas/user-otp.schema';
import { SiweNonce, SiweNonceSchema } from './schemas/siwe-nonce.schema';
import { RateLimitGuard } from './rate-limit.guard';
import {
  EmailOtpVerification,
  EmailOtpVerificationSchema,
} from './schemas/email-otp.schema';
import { AnalyticsModule } from 'src/analytics/analytics.module';
import { CrossmintAuthGuard } from './jwt-auth.guard';
import { QuestTaskEngineModule } from 'src/quest-task-engine/quest-task-engine.module';

@Module({
  imports: [
    // forRoot + isGlobal so config.get('env.*') resolves in generateTempToken/
    // verifyTempToken (a bare ConfigModule import would lose the env namespace).
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EmailModule, // Provides EmailService (Resend) — used by both OTP subsystems
    AnalyticsModule, // Provides AnalyticsService
    QuestTaskEngineModule,
    UserModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Point.name, schema: PointSchema },
      { name: UserMyCashback.name, schema: UserMyCashbackSchema },
      { name: UserOtp.name, schema: UserOtpSchema },
      { name: SiweNonce.name, schema: SiweNonceSchema },
      { name: EmailOtpVerification.name, schema: EmailOtpVerificationSchema }, // email-OTP subsystem
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '60m' },
    }),
    // Email is sent via Resend through EmailService (see EmailModule). The old
    // MailerModule/SMTP transport was retired together with the Gmail nodemailer
    // transport — both OTP flows now go through one provider + verified domain.
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtService,
    OtpService,
    RateLimitGuard,
    CrossmintAuthGuard,
  ],
})
export class AuthModule {}
