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
}

export const SocialRewardSchema = SchemaFactory.createForClass(SocialReward);
