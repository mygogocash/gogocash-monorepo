import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ReferralPayoutDocument = HydratedDocument<ReferralPayout>;

/**
 * Immutable audit trail for referral bonus payouts (MONEY / R0).
 *
 * One row per qualifying (referred friend's approved conversion). The unique
 * `idempotency_key` (derived off the referee's purchase payout key) makes the
 * audit write itself idempotent: a retried payout upserts the same row instead
 * of duplicating history. Rows are append-only — nothing in the app updates
 * them after insert.
 */
@Schema({ timestamps: true, collection: 'referralpayouts' })
export class ReferralPayout {
  /** User who receives the bonus (the referrer). */
  @Prop({ type: Types.ObjectId, required: true, ref: 'User', index: true })
  referrer_id: Types.ObjectId;

  /** Referred friend whose approved cashback triggered the bonus. */
  @Prop({ type: Types.ObjectId, required: true, ref: 'User', index: true })
  referee_id: Types.ObjectId;

  /** Network conversion id of the referee's qualifying purchase. */
  @Prop({ type: Number, required: true })
  source_conversion_id: number;

  /** The referee's own purchase payout key this bonus is derived from. */
  @Prop({ type: String, required: true })
  source_payout_key: string;

  /** Referee cashback (points) the bonus was computed against. */
  @Prop({ type: Number, required: true, min: 0 })
  source_amount: number;

  /** Percentage applied (snapshot of FeeRate.referral_bonus_percent at payout). */
  @Prop({ type: Number, required: true, min: 0, max: 100 })
  percent: number;

  /** Bonus points credited to the referrer. */
  @Prop({ type: Number, required: true, min: 0 })
  bonus_amount: number;

  /** Deterministic key shared with the referrer's Point ledger row. */
  @Prop({ type: String, required: true })
  idempotency_key: string;
}

export const ReferralPayoutSchema =
  SchemaFactory.createForClass(ReferralPayout);

ReferralPayoutSchema.index(
  { idempotency_key: 1 },
  { name: 'uniq_referral_payout_idempotency_key', unique: true },
);
