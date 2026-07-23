import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type FeeRateDocument = HydratedDocument<FeeRate>;

@Schema({ _id: false })
export class FeeRegionRule {
  @Prop({ type: String, required: true })
  id: string;

  @Prop({
    type: String,
    required: true,
    uppercase: true,
    minlength: 2,
    maxlength: 2,
  })
  countryCode: string;

  @Prop({
    type: String,
    required: true,
    uppercase: true,
    minlength: 3,
    maxlength: 8,
  })
  currency: string;

  @Prop({ type: Number, required: true, min: 0 })
  feeWithdraw: number;

  @Prop({ type: Number, required: true, min: 0 })
  minimumWithdraw: number;

  @Prop({ type: String, enum: ['percent', 'fixed'], default: 'percent' })
  max_cap_mode: 'percent' | 'fixed';

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  max_cap_percent: number;

  @Prop({ type: Number, default: 0, min: 0 })
  max_cap_amount: number;

  @Prop({ type: String, uppercase: true, minlength: 3, maxlength: 8 })
  max_cap_currency: string;
}

export const FeeRegionRuleSchema = SchemaFactory.createForClass(FeeRegionRule);

@Schema({ timestamps: true })
export class FeeRate {
  @Prop({ required: false })
  system: number;

  @Prop({ required: false })
  store: number;

  @Prop({ required: false })
  minimum_withdraw: number;

  @Prop({ required: false })
  minimum_withdraw_thb: number;

  @Prop({ required: false })
  minimum_withdraw_usd: number;

  @Prop({ required: false })
  fee_withdraw_thb: number;

  @Prop({ required: false })
  fee_withdraw_usd: number;

  @Prop({ required: false })
  max_cap: number;

  @Prop({ type: [FeeRegionRuleSchema], default: [] })
  withdraw_regions: FeeRegionRule[];

  @Prop({ type: String, enum: ['percent', 'fixed'], default: 'percent' })
  global_max_cap_mode: 'percent' | 'fixed';

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  global_max_cap_percent: number;

  @Prop({ type: Number, default: 0, min: 0 })
  global_max_cap_amount: number;

  @Prop({
    type: String,
    default: 'THB',
    uppercase: true,
    minlength: 3,
    maxlength: 8,
  })
  global_max_cap_currency: string;

  @Prop({ type: Number, required: false, min: 0 })
  global_withdraw_fee?: number;

  @Prop({ type: Number, required: false, min: 0 })
  global_minimum_withdraw?: number;

  @Prop({
    type: String,
    required: false,
    uppercase: true,
    minlength: 3,
    maxlength: 8,
  })
  global_withdraw_currency?: string;

  /**
   * Referral bonus payout rate (MONEY / R0): the referrer earns this percentage
   * of a referred friend's approved cashback. Single source of truth for the
   * referral bonus engine (see point/referral-bonus.ts). Default mirrors the
   * customer "10% Cashback Bonus" copy; edited via the superadmin Fee screen.
   */
  @Prop({ type: Number, default: 10, min: 0, max: 100 })
  referral_bonus_percent: number;
}

export const FeeRateSchema = SchemaFactory.createForClass(FeeRate);
