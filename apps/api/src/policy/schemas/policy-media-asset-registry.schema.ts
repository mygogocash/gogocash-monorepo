import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export const POLICY_MEDIA_ASSET_STATES = [
  'active',
  'deleting',
  'deleted',
] as const;

export type PolicyMediaAssetState = (typeof POLICY_MEDIA_ASSET_STATES)[number];
export type PolicyMediaAssetRegistryDocument =
  HydratedDocument<PolicyMediaAssetRegistry>;

/**
 * Transactional lifecycle fence for a verified command-owned media URL.
 *
 * Absence is intentional: legacy string-only media is never inserted here and
 * therefore can never become eligible for automatic physical deletion.
 */
@Schema({
  timestamps: true,
  collection: 'policy_media_asset_registry',
  // The guarded category-integrity migration owns these safety-critical
  // indexes. Application boot must not create a weaker lookalike index.
  autoIndex: false,
})
export class PolicyMediaAssetRegistry {
  @Prop({ required: true })
  url_hash: string;

  @Prop({ required: true })
  url: string;

  @Prop({ type: String, required: true, enum: POLICY_MEDIA_ASSET_STATES })
  state: PolicyMediaAssetState;

  @Prop({ required: true, default: 1, min: 1 })
  revision: number;

  @Prop({ type: String, required: true, enum: ['r2'] })
  provider: 'r2';

  @Prop({ type: String, required: true, enum: ['command-owned'] })
  ownership: 'command-owned';

  @Prop({ required: true })
  owner_key: string;

  @Prop({ required: true })
  owner_attempt_token: string;

  @Prop({ required: true })
  bucket: string;

  @Prop({ required: true })
  object_key: string;

  @Prop({ required: true })
  content_sha256: string;

  @Prop({ required: true })
  original_name: string;

  @Prop({ required: false })
  content_type?: string;

  /** Rotating token held by exactly one physical-deletion worker. */
  @Prop({ required: false })
  delete_token?: string;

  @Prop({ type: Date, required: false })
  delete_lease_expires_at?: Date;

  @Prop({ type: Date, required: false })
  deleting_at?: Date;

  @Prop({ type: Date, required: false })
  deleted_at?: Date;

  @Prop({ type: Date, required: false })
  last_failure_at?: Date;

  @Prop({ required: false })
  last_error?: string;
}

export const PolicyMediaAssetRegistrySchema = SchemaFactory.createForClass(
  PolicyMediaAssetRegistry,
);

PolicyMediaAssetRegistrySchema.index(
  { url_hash: 1 },
  { name: 'policy_media_asset_registry_url_hash_v1', unique: true },
);
PolicyMediaAssetRegistrySchema.index(
  { state: 1, delete_lease_expires_at: 1 },
  { name: 'policy_media_asset_registry_state_lease_v1' },
);
