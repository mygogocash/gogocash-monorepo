import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { Offer } from 'src/offer/schemas/offer.schema';

export type QuestDocument = HydratedDocument<Quest>;

@Schema({ _id: false })
export class QuestTask {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Offer.name,
    required: true,
  })
  offer: Types.ObjectId;

  @Prop({ required: true })
  offer_id: number;

  @Prop({ required: true })
  merchant_id: number;

  @Prop({ required: true, min: 2, max: 10000 })
  extra_point: number;

  @Prop({ required: true, default: 0 })
  sort_order: number;

  @Prop({ required: true, default: true })
  enabled: boolean;

  @Prop({ required: false, default: '', maxlength: 140 })
  wording: string;

  @Prop({ required: false, default: '', maxlength: 140 })
  wording_en: string;

  @Prop({ required: false, default: '', maxlength: 140 })
  wording_th: string;

  @Prop({ required: false, default: '' })
  notes: string;
}

export const QuestTaskSchema = SchemaFactory.createForClass(QuestTask);

@Schema({ _id: false })
export class QuestReward {
  @Prop({ required: true, min: 1 })
  rank: number;

  @Prop({ required: true, min: 0 })
  reward: number;

  @Prop({ required: true, default: 'THB' })
  currency: string;
}

export const QuestRewardSchema = SchemaFactory.createForClass(QuestReward);

export type QuestRewardDistributionMode =
  'manual' | 'campaign_end' | 'after_days';

@Schema({ timestamps: true })
export class Quest {
  @Prop({ required: true })
  start_date: Date;

  @Prop({ required: true })
  end_date: Date;

  @Prop({ required: true })
  status: string; // 'open' | 'close' | 'scheduled'

  @Prop({ required: true, default: false })
  reward_status: boolean;

  @Prop({ type: String, required: true, default: 'campaign_end' })
  reward_distribution_mode: QuestRewardDistributionMode;

  @Prop({ required: true, default: 0 })
  reward_distribution_delay_days: number;

  @Prop({ type: Date, required: false, default: null })
  reward_distribution_scheduled_at: Date | null;

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

  @Prop({ type: [QuestTaskSchema], default: [] })
  tasks: QuestTask[];

  @Prop({ type: [QuestRewardSchema], default: [] })
  rewards: QuestReward[];
}

export const QuestSchema = SchemaFactory.createForClass(Quest);
