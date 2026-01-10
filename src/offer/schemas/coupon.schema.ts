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

  @Prop({ type: Types.ObjectId, ref: 'Offer' })
  offer_id: Types.ObjectId;

  @Prop({ required: true })
  start_date: string;

  @Prop({ required: true })
  end_date: string;

  @Prop({ required: false, type: String })
  eligibility: string;

  @Prop({ required: false, type: String })
  min_spend: string;

  @Prop({ required: false, type: Number })
  discount: number;

  @Prop({ required: false, type: Number })
  quantity: number;

  @Prop({ type: Boolean, default: false })
  disabled: boolean;
}

export const CouponSchema = SchemaFactory.createForClass(Coupon);
