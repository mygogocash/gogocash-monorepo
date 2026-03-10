import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type FacebookRewardDocument = HydratedDocument<FacebookReward>;

@Schema({ timestamps: true })
export class FacebookReward {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  user_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: 'Quest' })
  quest_id: Types.ObjectId;

  @Prop({ required: true, default: false })
  reward_status: boolean;
}

export const FacebookRewardSchema =
  SchemaFactory.createForClass(FacebookReward);
