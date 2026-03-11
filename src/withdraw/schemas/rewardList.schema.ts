import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RewardListDocument = HydratedDocument<RewardList>;

@Schema({ timestamps: true })
export class RewardList {
  @Prop({ required: false })
  name: string;

  @Prop({ required: false })
  data: RewardData[];
}

export class RewardData {
  @Prop({ required: false })
  rank: number;

  @Prop({ required: false })
  reward: number;

  @Prop({ required: false })
  currency: string;
}

export const RewardListSchema = SchemaFactory.createForClass(RewardList);
