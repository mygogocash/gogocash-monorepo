import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type QuestContributionDocument = HydratedDocument<QuestContribution>;

@Schema({
  timestamps: true,
  collection: 'quest_task_contributions',
  autoIndex: false,
  autoCreate: false,
})
export class QuestContribution {
  @Prop({ type: Types.ObjectId, required: true, immutable: true, ref: 'Quest' })
  quest_id: Types.ObjectId;

  @Prop({ type: String, required: true, immutable: true })
  task_key: string;

  @Prop({ type: String, required: true, immutable: true })
  progress_scope_key: string;

  @Prop({ type: String, required: true, immutable: true })
  source_type: string;

  @Prop({ type: String, required: true, immutable: true })
  source_aggregate_id: string;

  @Prop({ type: Number, required: true, immutable: true, min: 1 })
  source_transition_version: number;

  @Prop({ type: String, required: true, immutable: true })
  source_event_id: string;

  @Prop({ type: Number, required: true, immutable: true })
  delta_value: number;

  @Prop({ type: Number, required: false, immutable: true })
  original_amount_minor?: number;

  @Prop({ type: String, required: false, immutable: true })
  original_currency?: string;

  @Prop({ type: Number, required: false, immutable: true })
  fx_rate_to_thb?: number;

  @Prop({ type: Date, required: false, immutable: true })
  fx_as_of?: Date;

  @Prop({ type: String, required: false, immutable: true })
  fx_source?: string;

  @Prop({ type: Number, required: false, immutable: true })
  normalized_thb_minor?: number;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true, immutable: true })
  snapshot: Record<string, unknown>;
}

export const QuestContributionSchema =
  SchemaFactory.createForClass(QuestContribution);
QuestContributionSchema.index(
  {
    quest_id: 1,
    task_key: 1,
    progress_scope_key: 1,
    source_type: 1,
    source_aggregate_id: 1,
    source_transition_version: 1,
  },
  { name: 'uniq_quest_contribution_transition', unique: true },
);
