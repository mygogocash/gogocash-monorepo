import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MembershipTierDocument = HydratedDocument<MembershipTier>;

@Schema({ timestamps: true })
export class MembershipTier {
  @Prop({ required: true })
  name: string;

  @Prop({ type: Number, default: 0 })
  price: number;

  @Prop({ default: 'THB' })
  currency: string;

  @Prop({ type: [String], default: [] })
  benefits: string[];

  @Prop({ type: Number, default: 0 })
  cashback_bonus_percent: number;

  @Prop({ type: Boolean, default: true })
  is_active: boolean;

  @Prop({ type: Number, default: 0 })
  sort_order: number;
}

export const MembershipTierSchema =
  SchemaFactory.createForClass(MembershipTier);
