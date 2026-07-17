import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import {
  CategoryMediaAsset,
  CategoryMediaAssetSchema,
} from 'src/offer/schemas/category.schema';

export type PolicyMediaCleanupDocument = HydratedDocument<PolicyMediaCleanup>;

@Schema({ timestamps: true, collection: 'policy_media_cleanup' })
export class PolicyMediaCleanup {
  @Prop({ type: Types.ObjectId, required: false, index: true })
  category_id?: Types.ObjectId;

  @Prop({ type: String, required: false, enum: ['category', 'offer'] })
  owner_type?: 'category' | 'offer';

  @Prop({ type: Types.ObjectId, required: false, index: true })
  owner_id?: Types.ObjectId;

  @Prop({ required: true, index: true })
  request_key: string;

  @Prop({ required: true, index: true })
  payload_hash: string;

  @Prop({ required: true, index: true })
  attempt_token: string;

  @Prop({
    type: String,
    required: true,
    enum: [
      'precommit-failure',
      'replaced-after-commit',
      'retired-purge',
      'content-delete',
      'category-purge',
      'legacy-category-replaced',
      'offer-replaced',
      'ambiguous-upload',
    ],
  })
  reason:
    | 'precommit-failure'
    | 'replaced-after-commit'
    | 'retired-purge'
    | 'content-delete'
    | 'category-purge'
    | 'legacy-category-replaced'
    | 'offer-replaced'
    | 'ambiguous-upload';

  @Prop({ type: CategoryMediaAssetSchema, required: true })
  asset: CategoryMediaAsset;

  @Prop({
    type: String,
    required: true,
    enum: ['pending', 'deleted'],
    default: 'pending',
  })
  status: 'pending' | 'deleted';

  @Prop({ required: true, default: 0 })
  attempts: number;

  /**
   * True when ownership cannot be proven strongly enough for automatic
   * physical deletion. These rows remain pending for explicit reconciliation
   * and are excluded from the automatic retry worker.
   */
  @Prop({ required: true, default: false, index: true })
  reconciliation_required: boolean;

  /** Current compensation worker allowed to mutate this tombstone. */
  @Prop({ required: false, index: true })
  worker_token?: string;

  @Prop({ type: Date, required: false, index: true })
  lease_expires_at?: Date;

  @Prop({ required: false })
  last_error?: string;

  @Prop({ type: Date, required: false })
  deleted_at?: Date;
}

export const PolicyMediaCleanupSchema =
  SchemaFactory.createForClass(PolicyMediaCleanup);

PolicyMediaCleanupSchema.index(
  {
    request_key: 1,
    payload_hash: 1,
    attempt_token: 1,
    reason: 1,
    'asset.object_key': 1,
  },
  {
    name: 'request_key_1_payload_hash_1_attempt_token_1_reason_1_asset.object_key_1',
    unique: true,
    partialFilterExpression: { 'asset.object_key': { $type: 'string' } },
  },
);
