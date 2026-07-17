import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

import {
  CategoryMediaAsset,
  CategoryMediaAssetSchema,
} from 'src/offer/schemas/category.schema';

export type PolicyMediaWriteCommandDocument =
  HydratedDocument<PolicyMediaWriteCommand>;

@Schema({ _id: false })
export class PolicyMediaWritePlan {
  @Prop({ required: true })
  role: string;

  @Prop({ required: true, enum: ['brands', 'categories'] })
  folder: 'brands' | 'categories';

  @Prop({ type: CategoryMediaAssetSchema, required: true })
  asset: CategoryMediaAsset;

  @Prop({ required: true, enum: ['planned', 'confirmed'] })
  upload_state: 'planned' | 'confirmed';
}

export const PolicyMediaWritePlanSchema =
  SchemaFactory.createForClass(PolicyMediaWritePlan);

/**
 * Durable intent for non-aggregate media writers. The owner id and exact object
 * plans exist before the first PutObject, and the owner mutation plus committed
 * transition happen in one MongoDB transaction.
 */
@Schema({
  timestamps: true,
  collection: 'policy_media_write_commands',
  // Safety-critical uniqueness and ownership lookup indexes are installed by
  // the guarded category-integrity migration before readiness is published.
  autoIndex: false,
})
export class PolicyMediaWriteCommand {
  @Prop({ required: true })
  request_key: string;

  @Prop({ required: true })
  payload_hash: string;

  @Prop({ required: true, enum: ['category', 'offer'] })
  owner_type: 'category' | 'offer';

  @Prop({ type: Types.ObjectId, required: true, index: true })
  owner_id: Types.ObjectId;

  @Prop({
    required: true,
    enum: ['offer-create', 'offer-update', 'category-update'],
  })
  operation: 'offer-create' | 'offer-update' | 'category-update';

  @Prop({
    required: true,
    enum: ['uploading', 'committing', 'compensating', 'committed', 'failed'],
    index: true,
  })
  status: 'uploading' | 'committing' | 'compensating' | 'committed' | 'failed';

  @Prop({ required: true, index: true })
  attempt_token: string;

  @Prop({ required: false, index: true })
  compensation_token?: string;

  @Prop({ type: Date, required: false, index: true })
  lease_expires_at?: Date;

  @Prop({ required: true, default: 1, min: 1 })
  attempts: number;

  @Prop({ type: [PolicyMediaWritePlanSchema], required: true, default: [] })
  planned_assets: PolicyMediaWritePlan[];

  @Prop({ type: SchemaTypes.Mixed, required: false })
  response?: Record<string, unknown>;

  @Prop({ required: false })
  last_error?: string;
}

export const PolicyMediaWriteCommandSchema = SchemaFactory.createForClass(
  PolicyMediaWriteCommand,
);

PolicyMediaWriteCommandSchema.index(
  { request_key: 1 },
  { name: 'request_key_1', unique: true },
);

PolicyMediaWriteCommandSchema.index(
  {
    'planned_assets.asset.owner_key': 1,
    'planned_assets.asset.owner_attempt_token': 1,
    'planned_assets.asset.object_key': 1,
  },
  {
    name: 'planned_asset_owner_1_attempt_1_object_1',
    partialFilterExpression: {
      'planned_assets.asset.object_key': { $type: 'string' },
    },
  },
);
