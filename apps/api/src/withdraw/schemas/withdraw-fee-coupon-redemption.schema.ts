import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type WithdrawFeeCouponRedemptionDocument =
  HydratedDocument<WithdrawFeeCouponRedemption>;

@Schema({ collection: 'withdraw_fee_coupon_redemptions', timestamps: true })
export class WithdrawFeeCouponRedemption {
  @Prop({
    type: Types.ObjectId,
    ref: 'WithdrawFeeCoupon',
    required: true,
    index: true,
  })
  coupon_id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  user_id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Withdraw', required: true, index: true })
  withdraw_id!: Types.ObjectId;

  @Prop({ required: true, uppercase: true, trim: true })
  code_snapshot!: string;

  @Prop({ type: Number, required: true, min: 0 })
  base_fee!: number;

  @Prop({ type: Number, required: true, min: 0 })
  discount_amount!: number;

  @Prop({ type: Number, required: true, min: 0 })
  final_fee!: number;
}

export const WithdrawFeeCouponRedemptionSchema = SchemaFactory.createForClass(
  WithdrawFeeCouponRedemption,
);

WithdrawFeeCouponRedemptionSchema.index(
  { coupon_id: 1, user_id: 1, withdraw_id: 1 },
  { unique: true },
);

WithdrawFeeCouponRedemptionSchema.index({ coupon_id: 1, user_id: 1 });
