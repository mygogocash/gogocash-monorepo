import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CouponDocument = HydratedDocument<Coupon>;

@Schema({ timestamps: true })
export class Coupon {
  @Prop({ required: true })
  name: string;

  @Prop({ required: false })
  description: string;

  @Prop({ required: false })
  code: string;

  @Prop({ required: false, type: Boolean })
  code_enabled?: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Offer' })
  offer_id: Types.ObjectId;

  @Prop({ required: true })
  start_date: string;

  @Prop({ required: true })
  end_date: string;

  @Prop({ required: false, type: String })
  start_time?: string;

  @Prop({ required: false, type: String })
  end_time?: string;

  @Prop({ required: false, type: String })
  eligibility: string;

  @Prop({ required: false, type: String })
  min_spend: string;

  @Prop({ required: false, type: String })
  min_spend_currency?: string;

  @Prop({ required: false, type: Number })
  max_cap?: number;

  @Prop({ required: false, type: Boolean })
  max_cap_enabled?: boolean;

  @Prop({ required: false, type: String })
  max_cap_currency?: string;

  @Prop({ required: false, type: Number })
  discount: number;

  @Prop({ required: false, type: String, enum: ['percent', 'cash'] })
  discount_type?: 'percent' | 'cash';

  @Prop({ required: false, type: String })
  discount_currency?: string;

  @Prop({ required: false, type: Number })
  quantity: number;

  @Prop({ required: false, type: Boolean })
  unlimited_amount_enabled?: boolean;

  @Prop({ required: false, type: Boolean })
  one_time_use_enabled?: boolean;

  @Prop({ required: false, type: Number })
  usage_per_user?: number;

  @Prop({ default: 0, min: 0, type: Number })
  quantity_used: number;

  @Prop({ type: Boolean, default: false })
  disabled: boolean;

  @Prop({ type: String, default: false })
  link: string;

  @Prop({ required: false, type: String })
  terms_and_conditions?: string;
}

export const CouponSchema = SchemaFactory.createForClass(Coupon);
