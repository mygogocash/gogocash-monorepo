import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserOtpDocument = HydratedDocument<UserOtp>;

@Schema({ timestamps: true })
export class UserOtp {
  @Prop({ default: '', required: true, unique: true })
  email: string;

  @Prop({ default: '', required: true })
  otp: string;

  // Per-email lockout: 3 wrong attempts → 30 min cooldown. Without this a
  // 6-digit OTP can be brute-forced in minutes regardless of per-IP rate
  // limits (rotating IPs, distributed attackers).
  @Prop({ default: 0 })
  failed_attempts: number;

  @Prop({ type: Date, required: false })
  locked_until: Date;
}

export const UserOtpSchema = SchemaFactory.createForClass(UserOtp);
