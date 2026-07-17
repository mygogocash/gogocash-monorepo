import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type QuestTaskProgressDocument = HydratedDocument<QuestTaskProgress>;

@Schema({
  timestamps: true,
  collection: 'quest_task_progress',
  autoIndex: false,
  autoCreate: false,
})
export class QuestTaskProgress {
  @Prop({ type: Types.ObjectId, required: true, immutable: true, ref: 'Quest' })
  quest_id: Types.ObjectId;

  @Prop({ type: String, required: true, immutable: true })
  task_key: string;

  @Prop({ type: String, required: true, immutable: true })
  progress_scope_key: string;

  @Prop({ type: Types.ObjectId, required: true, immutable: true, ref: 'User' })
  beneficiary_user_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: false, immutable: true, ref: 'User' })
  referee_user_id?: Types.ObjectId;

  @Prop({ type: String, required: true, immutable: true })
  task_type: string;

  @Prop({ type: Number, required: true, default: 0 })
  current_value: number;

  @Prop({ type: Number, required: true, min: 1 })
  target_value: number;

  @Prop({ type: Boolean, required: true, default: false })
  completed: boolean;

  @Prop({ type: Boolean, required: true, default: false })
  active_award: boolean;

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  award_epoch: number;

  @Prop({ type: Boolean, required: true, default: false })
  cap_reached: boolean;

  @Prop({
    type: String,
    required: false,
    default: null,
    enum: ['max_awards_per_user', 'max_referrals_per_user', null],
  })
  cap_reason?: 'max_awards_per_user' | 'max_referrals_per_user' | null;

  @Prop({ type: Number, required: true, immutable: true, min: 0 })
  config_revision: number;

  @Prop({ type: Date, required: false })
  completed_at?: Date;

  @Prop({ type: Date, required: false })
  compensated_at?: Date;
}

export const QuestTaskProgressSchema =
  SchemaFactory.createForClass(QuestTaskProgress);
QuestTaskProgressSchema.index(
  { quest_id: 1, task_key: 1, progress_scope_key: 1 },
  { name: 'uniq_quest_task_progress', unique: true },
);
QuestTaskProgressSchema.index(
  { beneficiary_user_id: 1, quest_id: 1 },
  { name: 'quest_progress_customer_read' },
);
