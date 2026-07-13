import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ConversionDocument = HydratedDocument<Conversion>;

@Schema({ timestamps: true })
export class Conversion {
  // Core IDs
  @Prop({ required: true, unique: true, index: true })
  conversion_id: number;

  @Prop({ required: true, index: true })
  offer_id: number;

  @Prop({ required: true })
  offer_name: string;

  @Prop({ required: true, index: true })
  merchant_id: number;

  /**
   * Affiliate network of origin. `'involve'` default keeps every pre-existing
   * conversion valid without a backfill migration — the source-scoped balance
   * joins read a missing field as 'involve', so legacy money math is unchanged.
   * New networks namespace their `conversion_id` as `'opt:<id>'` / `'act:<id>'`
   * (string-prefixed) so the existing unique `conversion_id` index stays
   * collision-free even when two networks reuse the same numeric id.
   */
  @Prop({ default: 'involve', enum: ['involve', 'optimise', 'accesstrade'] })
  source: string;

  /**
   * Optional network sub-account / publisher id this conversion was attributed
   * to (Optimise & Accesstrade support multiple accounts per network). No
   * default: absent for legacy Involve rows, set only by the new-network sync.
   */
  @Prop({ required: false })
  network_account?: string;

  // Affiliate subs
  @Prop({ required: false })
  aff_sub1: string; // "user_id:68bf99fed9667685c1637607"

  @Prop({ required: false })
  aff_sub2: string;

  @Prop({ required: false })
  aff_sub3: string;

  @Prop({ required: false })
  aff_sub4: string;

  @Prop({ required: false })
  aff_sub5: string;

  // Parsed user reference (recommended)
  @Prop({ type: Types.ObjectId, required: false, index: true })
  user_id?: Types.ObjectId;

  // Advertiser subs (Shopee)
  @Prop({ required: false })
  adv_sub1: string;

  @Prop({ required: false })
  adv_sub2: string;

  @Prop({ required: false })
  adv_sub3: string;

  @Prop({ required: false })
  adv_sub4: string;

  @Prop({ required: false })
  adv_sub5: string;

  // Status & time
  @Prop({ required: true, index: true })
  conversion_status: string; // approved | pending | rejected | paid

  @Prop({ required: true, index: true })
  datetime_conversion: Date;

  @Prop({ required: false })
  affiliate_remarks: string;

  // Financial
  @Prop({ required: true, default: 'THB' })
  currency: string;

  @Prop({ type: Number, required: true })
  sale_amount: number;

  @Prop({ type: Number, required: true })
  payout: number;

  @Prop({ type: Number, required: false, default: 0 })
  base_payout: number;

  @Prop({ type: Number, required: false, default: 0 })
  bonus_payout: number;

  // Optional: keep original payload for audit/debug
  @Prop({ type: Object, required: false })
  raw: Record<string, any>;

  @Prop({ type: Boolean, required: false })
  add_point: boolean;

  @Prop({ type: Boolean, default: false })
  flagged: boolean;

  @Prop({ type: String, required: false })
  flag_reason: string;
}

export const ConversionSchema = SchemaFactory.createForClass(Conversion);

/** Hot path: checkWithdraw approved conversions by indexed user_id. */
ConversionSchema.index({ user_id: 1, conversion_status: 1 });
