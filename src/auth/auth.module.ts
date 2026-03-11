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

@Module({
  imports: [
    ConfigModule,
    EmailModule, // Provides EmailService
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Point.name, schema: PointSchema },
      { name: UserMyCashback.name, schema: UserMyCashbackSchema },
      { name: EmailOtpVerification.name, schema: EmailOtpVerificationSchema }, // OTP schema
    ]),
    JwtModule.register({
      // This is for signing tokens your backend generates.
      // For verifying Crossmint's tokens, you'll use a separate verification process.
      secret: process.env.CROSSMINT_SECRET, // Your own secret for tokens you issue
      signOptions: { expiresIn: '60m' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, UserService, JwtService, OtpService], // Add OtpService
})
export class AuthModule {}
