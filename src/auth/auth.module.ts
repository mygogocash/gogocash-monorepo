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
import { MailerModule } from '@nestjs-modules/mailer';
import { UserOtp, UserOtpSchema } from 'src/user/schemas/user-otp.schema';
import { SiweNonce, SiweNonceSchema } from './schemas/siwe-nonce.schema';
import { RateLimitGuard } from './rate-limit.guard';
import { EmailOtpVerification, EmailOtpVerificationSchema } from './schemas/email-otp.schema';
import { AnalyticsModule } from 'src/analytics/analytics.module';

@Module({
  imports: [
    // forRoot + isGlobal so config.get('env.*') resolves in generateTempToken/
    // verifyTempToken (a bare ConfigModule import would lose the env namespace).
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EmailModule, // Provides EmailService (nodemailer with Gmail SMTP) — email-OTP subsystem
    AnalyticsModule, // Provides AnalyticsService
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Point.name, schema: PointSchema },
      { name: UserMyCashback.name, schema: UserMyCashbackSchema },
      { name: UserOtp.name, schema: UserOtpSchema },
      { name: SiweNonce.name, schema: SiweNonceSchema },
      { name: EmailOtpVerification.name, schema: EmailOtpVerificationSchema }, // email-OTP subsystem
    ]),
    JwtModule.register({
      // Backend-issued tokens; Crossmint verification is a separate process.
      secret: process.env.CROSSMINT_SECRET,
      signOptions: { expiresIn: '60m' },
    }),
    // MailerModule.forRoot — OtpService.sendOtpToEmail still uses MailerService
    // (legacy UserOtp subsystem). Kept alongside EmailModule's EmailService.
    MailerModule.forRoot({
      transport: {
        host: process.env.SMTP_HOST,
        port: 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, UserService, JwtService, OtpService, RateLimitGuard],
})
export class AuthModule {}
