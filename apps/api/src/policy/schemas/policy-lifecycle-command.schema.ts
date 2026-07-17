import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

import {
  CategoryMediaAsset,
  CategoryMediaAssetSchema,
} from 'src/offer/schemas/category.schema';

export type PolicyLifecycleCommandDocument =
  HydratedDocument<PolicyLifecycleCommand>;

@Schema({ timestamps: true, collection: 'policy_lifecycle_commands' })
export class PolicyLifecycleCommand {
  @Prop({ required: true })
  request_key: string;

  @Prop({ required: true })
  payload_hash: string;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  category_id: Types.ObjectId;

  @Prop({
    type: String,
    required: false,
    enum: ['aggregate-save', 'delete-content', 'retire', 'purge'],
    default: 'aggregate-save',
    index: true,
  })
  operation?: 'aggregate-save' | 'delete-content' | 'retire' | 'purge';

  @Prop({
    type: String,
    required: true,
    enum: ['processing', 'compensating', 'committed', 'failed'],
    default: 'processing',
    index: true,
  })
  status: 'processing' | 'compensating' | 'committed' | 'failed';

  /** Immutable fence for one delivery attempt. Replaced on every clean retry. */
  @Prop({ required: true, index: true })
  attempt_token: string;

  /** Rotating ownership fence for one compensation worker lease. */
  @Prop({ required: false, index: true })
  compensation_token?: string;

  @Prop({ type: Date, required: false })
  compensation_claimed_at?: Date;

  @Prop({ type: Date, required: false, index: true })
  lease_expires_at?: Date;

  @Prop({ required: true, default: 0, min: 0 })
  attempts: number;

  @Prop({
    type: String,
    required: false,
    enum: ['planned', 'confirmed'],
  })
  upload_state?: 'planned' | 'confirmed';

  /** Persisted before PutObject so uncertain uploads are exactly recoverable. */
  @Prop({ type: CategoryMediaAssetSchema, required: false })
  planned_asset?: CategoryMediaAsset;

  @Prop({ type: SchemaTypes.Mixed, required: false })
  response?: Record<string, unknown>;

  @Prop({ required: false })
  last_error?: string;
}

export const PolicyLifecycleCommandSchema = SchemaFactory.createForClass(
  PolicyLifecycleCommand,
);

PolicyLifecycleCommandSchema.index(
  { request_key: 1 },
  { name: 'request_key_1', unique: true },
);
