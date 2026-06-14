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
  status: string; // 'open' | 'close' — cron matches 'close' (TasksService.getSpacialPointNextRound)

  @Prop({ required: true, default: false })
  reward_status: boolean;

  @Prop({ required: false })
  facebook_post: string;

  @Prop({ required: false })
  facebook_page: string;

  @Prop({ required: false })
  line: string;

  @Prop({ required: false })
  banner_en: string;

  @Prop({ required: false })
  banner_th: string;

  @Prop({ required: false })
  sub_banner_en: string;

  @Prop({ required: false })
  sub_banner_th: string;
}

export const QuestSchema = SchemaFactory.createForClass(Quest);
