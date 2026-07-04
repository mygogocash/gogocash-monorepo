import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

export class ConsentData {
  @Prop({ required: false })
  marketing_communications: boolean;

  @Prop({ required: false })
  analytics: boolean;

  @Prop({ required: false })
  b2b_aggregated_insights: boolean;

  @Prop({ required: false })
  ai_credit_scoring: boolean;
}
@Schema({ timestamps: true })
export class User {
  // P1-TX: monotonic counter bumped inside the withdraw transaction. It exists
  // only to create write contention on this doc so two concurrent withdrawals
  // for the same user serialize (the loser hits a WriteConflict + retries +
  // re-checks the balance) — closing the balance-read/insert TOCTOU.
  @Prop({ type: Number, required: false, default: 0 })
  withdraw_lock_seq: number;

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

  /**
   * ISO-3166-1 alpha-2 country code (uppercase). Stored as plain string for
   * portability. Default `'TH'` matches the historical bias of the user base
   * and keeps the field non-empty for legacy doc paths that depend on truthy
   * country.
   *
   * Writers must canonicalise to ISO-2 before persisting (see
   * `auth.service.ts` and `user.service.ts` — they call `toIso2Server`).
   * Pre-migration documents may still hold full English names; the
   * `migrate-country.ts` script converts them in one pass.
   */
  @Prop({ default: 'TH' })
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

  // ── LINE miniapp + KYC/consent (feature/bug-old) ──
  @Prop()
  id_line: string;

  @Prop({ default: false })
  email_verified: boolean;

  @Prop({ default: '' })
  id_card: string;

  @Prop({ default: '' })
  passport: string;

  @Prop({ default: '' })
  legal_address: string;

  @Prop({ default: '' })
  state: string;

  @Prop({ default: '' })
  city: string;

  @Prop({ default: '' })
  zip: string;

  @Prop({ default: '' })
  email_mcb: string;

  /** Public URL or `local-media:` ref for the member profile photo. */
  @Prop({ default: '' })
  avatar_url: string;

  @Prop()
  consent?: ConsentData;
}

export const UserSchema = SchemaFactory.createForClass(User);
