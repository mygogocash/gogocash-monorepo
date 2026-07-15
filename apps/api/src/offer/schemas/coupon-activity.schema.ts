import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Coupon } from './coupon.schema';

export const COUPON_ACTIVITY_TYPES = ['view', 'copy', 'redemption'] as const;
export type CouponActivityType = (typeof COUPON_ACTIVITY_TYPES)[number];
export type CouponActivityDocument = HydratedDocument<CouponActivity>;

/**
 * Append-only coupon analytics facts.
 *
 * `dedupe_key` makes client retries and merchant redemption retries
 * idempotent. Customer clients may create only view/copy facts; redemption
 * facts are accepted exclusively by the admin-authenticated endpoint.
 */
@Schema({
  collection: 'coupon_activities',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class CouponActivity {
  @Prop({ index: true, ref: Coupon.name, required: true, type: Types.ObjectId })
  coupon_id: Types.ObjectId;

  @Prop({
    enum: COUPON_ACTIVITY_TYPES,
    index: true,
    required: true,
    type: String,
  })
  event_type: CouponActivityType;

  @Prop({ index: true, required: true, unique: true })
  dedupe_key: string;

  @Prop({ required: false, type: String })
  reference_id?: string;

  @Prop({ required: false, type: String })
  user_id?: string;

  @Prop({ required: false, type: String })
  user_email?: string;

  @Prop({ default: Date.now, index: true, required: true, type: Date })
  occurred_at: Date;
}

export const CouponActivitySchema =
  SchemaFactory.createForClass(CouponActivity);

CouponActivitySchema.index({ coupon_id: 1, event_type: 1, occurred_at: -1 });
