import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type QuestAccountTransitionDocument =
  HydratedDocument<QuestAccountTransition>;

@Schema({
  timestamps: true,
  collection: 'quest_account_transitions',
  autoIndex: false,
  autoCreate: false,
})
export class QuestAccountTransition {
  @Prop({ type: String, required: true, immutable: true })
  transition_id: string;

  @Prop({ type: Types.ObjectId, required: true, immutable: true, ref: 'User' })
  user_id: Types.ObjectId;

  @Prop({ type: Number, required: true, immutable: true, default: 1 })
  version: number;

  @Prop({ type: String, required: true, immutable: true })
  registration_source: string;

  @Prop({ type: Types.ObjectId, required: false, immutable: true, ref: 'User' })
  referrer_id?: Types.ObjectId;

  @Prop({ type: Date, required: true, immutable: true })
  occurred_at: Date;

  @Prop({ type: String, required: true, immutable: true })
  payload_hash: string;
}

export const QuestAccountTransitionSchema = SchemaFactory.createForClass(
  QuestAccountTransition,
);
QuestAccountTransitionSchema.index(
  { user_id: 1, version: 1 },
  { name: 'uniq_quest_account_transition', unique: true },
);
QuestAccountTransitionSchema.index(
  { transition_id: 1 },
  { name: 'uniq_quest_account_transition_id', unique: true },
);
QuestAccountTransitionSchema.index(
  { occurred_at: 1 },
  { name: 'idx_quest_account_transition_occurred_at' },
);
