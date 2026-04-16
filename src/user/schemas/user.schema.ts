import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: false, unique: false, default: '' })
  address: string;

  @Prop({ required: false, unique: false, default: '' })
  id_crossmint: string;

  @Prop({ required: true, unique: true })
  id_firebase: string;

  @Prop()
  email: string;

  @Prop()
  username: string;

  @Prop()
  id_twitter: string;

  @Prop({ default: 'Thailand' })
  country: string;

  @Prop()
  privilege: string; // e.g. standard, premium

  @Prop()
  mobile: string;

  @Prop()
  birthdate: string;

  @Prop()
  gender: string;

  @Prop()
  provider: string;

  @Prop({ default: false })
  disabled: boolean;

  @Prop()
  id_telegram: string;

  // ── Wallet (Phase 2B) ──
  @Prop({ type: Boolean, default: false })
  wallet_frozen: boolean;

  @Prop({ type: Date, required: false })
  wallet_frozen_at: Date;

  @Prop({ type: String, required: false })
  wallet_frozen_by: string;

  // ── Referrals (Phase 3B) ──
  @Prop({ type: String, required: false })
  referred_by: string;

  @Prop({ type: String, required: false })
  referral_code: string;

  // ── Credit Score (Phase 4A) ──
  @Prop({ type: Number, default: 0 })
  credit_score: number;

  @Prop({ type: String, default: 'none' })
  credit_tier: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
