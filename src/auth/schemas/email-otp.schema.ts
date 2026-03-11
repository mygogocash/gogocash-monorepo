import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type EmailOtpVerificationDocument =
  HydratedDocument<EmailOtpVerification>;

@Schema({ timestamps: true })
export class EmailOtpVerification {
  @Prop({ required: true, unique: true, index: true })
  email: string; // Unique constraint: one email = one OTP record (single source of truth)

  @Prop({ required: true })
  otpHash: string; // Bcrypt-hashed 6-digit OTP

  @Prop({ required: true, index: true })
  expiresAt: Date; // OTP expiration (5 minutes from creation)

  @Prop({ default: 0 })
  attempts: number; // Failed verification attempts (max 5)

  @Prop({ default: false })
  verified: boolean; // Whether OTP was successfully verified
}

export const EmailOtpVerificationSchema =
  SchemaFactory.createForClass(EmailOtpVerification);

// Create TTL index to automatically delete expired OTPs
EmailOtpVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
