import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type QuestOutboxDocument = HydratedDocument<QuestOutbox>;

@Schema({
  timestamps: true,
  collection: 'quest_outbox',
  autoIndex: false,
  autoCreate: false,
})
export class QuestOutbox {
  @Prop({ type: String, required: true, immutable: true })
  source_type: string;

  @Prop({ type: String, required: true, immutable: true })
  source_event_id: string;

  @Prop({ type: String, required: true, immutable: true })
  aggregate_id: string;

  @Prop({ type: String, required: true, immutable: true })
  event_type: string;

  @Prop({ type: Number, required: true, immutable: true, min: 1 })
  transition_version: number;

  @Prop({ type: Date, required: true, immutable: true })
  occurred_at: Date;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true, immutable: true })
  payload: Record<string, unknown>;

  @Prop({
    type: String,
    required: true,
    default: 'pending',
    enum: ['pending', 'leased', 'retryable', 'completed', 'quarantined'],
  })
  status: string;

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  attempts: number;

  @Prop({ type: String, required: false })
  lease_token?: string;

  @Prop({ type: Date, required: false })
  lease_expires_at?: Date;

  @Prop({ type: Date, required: false })
  available_at?: Date;

  @Prop({ type: Date, required: false })
  completed_at?: Date;

  @Prop({ type: String, required: false })
  last_error?: string;
}

export const QuestOutboxSchema = SchemaFactory.createForClass(QuestOutbox);
QuestOutboxSchema.index(
  { source_type: 1, source_event_id: 1 },
  { name: 'uniq_quest_outbox_source_event', unique: true },
);
QuestOutboxSchema.index(
  { status: 1, available_at: 1, lease_expires_at: 1, createdAt: 1 },
  { name: 'quest_outbox_dispatch' },
);
