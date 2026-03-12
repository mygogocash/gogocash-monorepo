import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserOtpDocument = HydratedDocument<UserOtp>;

@Schema({ timestamps: true })
export class UserOtp {
  @Prop({ default: '', required: true, unique: true })
  email: string;

  @Prop({ default: '', required: true })
  otp: string;
}

export const UserOtpSchema = SchemaFactory.createForClass(UserOtp);
