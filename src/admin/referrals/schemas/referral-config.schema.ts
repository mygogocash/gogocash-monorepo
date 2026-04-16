import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ReferralConfigDocument = HydratedDocument<ReferralConfig>;

@Schema({ timestamps: true })
export class ReferralConfig {
  @Prop({ type: Boolean, default: true })
  enabled: boolean;

  @Prop({ default: 'points' })
  reward_type: string;

  @Prop({ type: Number, default: 100 })
  referrer_reward: number;

  @Prop({ type: Number, default: 50 })
  referee_reward: number;

  @Prop({ default: 'points' })
  currency: string;

  @Prop({ type: Number, default: 0 })
  max_referrals_per_user: number; // 0 = unlimited

  @Prop({ type: Boolean, default: false })
  require_approval: boolean;
}

export const ReferralConfigSchema =
  SchemaFactory.createForClass(ReferralConfig);
