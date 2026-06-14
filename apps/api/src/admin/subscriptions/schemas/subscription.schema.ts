import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SubscriptionDocument = HydratedDocument<Subscription>;

@Schema({ timestamps: true })
export class Subscription {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User', index: true })
  user_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: 'SubscriptionPlan' })
  plan_id: Types.ObjectId;

  @Prop({ default: 'active' })
  status: string; // active | paused | cancelled | expired

  @Prop({ type: Date, required: true })
  current_period_start: Date;

  @Prop({ type: Date, required: true })
  current_period_end: Date;

  @Prop({ type: Date, required: false, default: null })
  paused_at: Date;

  @Prop({ type: Date, required: false, default: null })
  cancelled_at: Date;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);
