import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserContactOtpDocument = HydratedDocument<UserContactOtp>;

/**
 * Admin withdraw-detail contact OTP (#424).
 * Keyed by userId + channel + target so it never collides with customer
 * LINE-signup EmailOtpVerification (email-only).
 */
@Schema({ timestamps: true, collection: 'user_contact_otps' })
export class UserContactOtp {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: ['email', 'mobile'] })
  channel: 'email' | 'mobile';

  /** Normalized target (lowercase email, or raw mobile string). */
  @Prop({ required: true })
  target: string;

  @Prop({ required: true })
  otpHash: string;

  @Prop({ required: true, index: true })
  expiresAt: Date;

  @Prop({ default: 0 })
  attempts: number;

  @Prop({ default: false })
  verified: boolean;
}

export const UserContactOtpSchema =
  SchemaFactory.createForClass(UserContactOtp);

UserContactOtpSchema.index(
  { userId: 1, channel: 1, target: 1 },
  { unique: true },
);
UserContactOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
