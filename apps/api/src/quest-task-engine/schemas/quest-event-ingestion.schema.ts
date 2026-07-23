import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type QuestEventIngestionDocument = HydratedDocument<QuestEventIngestion>;

@Schema({
  timestamps: true,
  collection: 'quest_event_ingestions',
  autoIndex: false,
  autoCreate: false,
})
export class QuestEventIngestion {
  @Prop({ type: String, required: true, immutable: true })
  source_type: string;

  @Prop({ type: String, required: true, immutable: true })
  source_event_id: string;

  @Prop({
    type: String,
    required: true,
    enum: ['processing', 'completed', 'retryable', 'ignored', 'quarantined'],
  })
  status: string;

  @Prop({ type: MongooseSchema.Types.Mixed, required: false })
  outcome?: Record<string, unknown>;

  @Prop({ type: String, required: false })
  error_code?: string;

  @Prop({ type: Date, required: false })
  completed_at?: Date;
}

export const QuestEventIngestionSchema =
  SchemaFactory.createForClass(QuestEventIngestion);
QuestEventIngestionSchema.index(
  { source_type: 1, source_event_id: 1 },
  { name: 'uniq_quest_event_ingestion', unique: true },
);
