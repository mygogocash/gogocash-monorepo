import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type WithdrawFeeCouponDocument = HydratedDocument<WithdrawFeeCoupon>;

export const WITHDRAW_FEE_DISCOUNT_MODES = ['fixed', 'percent', 'waive'] as const;
export type WithdrawFeeDiscountMode =
  (typeof WITHDRAW_FEE_DISCOUNT_MODES)[number];

@Schema({ collection: 'withdraw_fee_coupons', timestamps: true })
export class WithdrawFeeCoupon {
  @Prop({ required: true, unique: true, uppercase: true, trim: true, index: true })
  code!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: false, trim: true })
  description?: string;

  @Prop({
    type: String,
    required: true,
    enum: WITHDRAW_FEE_DISCOUNT_MODES,
  })
  discount_mode!: WithdrawFeeDiscountMode;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  discount_value!: number;

  @Prop({
    type: String,
    required: true,
    uppercase: true,
    default: 'THB',
    minlength: 3,
    maxlength: 8,
  })
  currency!: string;

  @Prop({ type: Date, required: true })
  start_at!: Date;

  @Prop({ type: Date, required: true })
  end_at!: Date;

  @Prop({ type: Boolean, default: false, index: true })
  disabled!: boolean;

  @Prop({ type: Number, required: false, min: 0 })
  quantity?: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  quantity_used!: number;

  @Prop({ type: Boolean, default: true })
  unlimited_quantity!: boolean;

  @Prop({ type: Number, required: true, min: 1, default: 1 })
  usage_per_user!: number;

  @Prop({ type: [String], default: ['bank_transfer'] })
  applies_to!: string[];

  @Prop({ type: Number, required: false, min: 0 })
  min_withdraw_amount?: number;
}

export const WithdrawFeeCouponSchema =
  SchemaFactory.createForClass(WithdrawFeeCoupon);

WithdrawFeeCouponSchema.index({ disabled: 1, start_at: 1, end_at: 1 });
