import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SocialRewardDocument = HydratedDocument<SocialReward>;

@Schema({ timestamps: true })
export class SocialReward {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  user_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: 'Quest' })
  quest_id: Types.ObjectId;

  @Prop({ required: true, default: false })
  reward_status: boolean;

  @Prop({ required: false })
  type: string;

  @Prop({ required: false })
  action: string;

  /**
   * Stable legacy `(quest,user,reward)` payout identity. Historical rows stay
   * unkeyed until reconciliation proves their lineage, so the unique index is
   * deliberately partial rather than sparse/defaulted.
   */
  @Prop({ required: false, trim: true })
  legacy_payout_key?: string;
}

export const SocialRewardSchema = SchemaFactory.createForClass(SocialReward);

SocialRewardSchema.index(
  { legacy_payout_key: 1 },
  {
    name: 'uniq_social_reward_legacy_payout_key',
    unique: true,
    partialFilterExpression: {
      legacy_payout_key: { $type: 'string', $gt: '' },
    },
  },
);
