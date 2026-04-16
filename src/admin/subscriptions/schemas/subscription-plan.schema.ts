import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SubscriptionPlanDocument = HydratedDocument<SubscriptionPlan>;

@Schema({ timestamps: true })
export class SubscriptionPlan {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, type: Number })
  price: number;

  @Prop({ default: 'THB' })
  currency: string;

  @Prop({ required: true })
  billing_cycle: string; // monthly | quarterly | yearly

  @Prop({ type: [String], default: [] })
  features: string[];

  @Prop({ type: Number, default: 0 })
  trial_days: number;

  @Prop({ type: Boolean, default: true })
  is_active: boolean;
}

export const SubscriptionPlanSchema =
  SchemaFactory.createForClass(SubscriptionPlan);
