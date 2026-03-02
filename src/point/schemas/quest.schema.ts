import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type QuestDocument = HydratedDocument<Quest>;

@Schema({ timestamps: true })
export class Quest {
  @Prop({ required: true })
  start_date: Date;

  @Prop({ required: true })
  end_date: Date;

  @Prop({ required: true })
  status: string; // open, closed

  @Prop({ required: true, default: false })
  reward_status: boolean;
}

export const QuestSchema = SchemaFactory.createForClass(Quest);
