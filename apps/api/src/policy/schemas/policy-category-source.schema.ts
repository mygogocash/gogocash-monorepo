import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PolicyCategorySourceDocument =
  HydratedDocument<PolicyCategorySource>;

@Schema({
  timestamps: true,
  collection: 'policy_category_sources',
  // Index replacement is an explicit guarded migration. Boot must never drop
  // or silently replace the legacy unique category_id index.
  autoIndex: false,
})
export class PolicyCategorySource {
  @Prop({ type: Types.ObjectId, required: true })
  category_id: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    enum: ['policy-admin', 'involve', 'legacy'],
    default: 'policy-admin',
  })
  source: 'policy-admin' | 'involve' | 'legacy';

  @Prop({ required: true })
  source_key: string;

  @Prop({ required: true })
  request_key: string;

  @Prop({ required: true, default: true })
  active: boolean;

  /** Permanent no-resurrection fence. Retire and purge never remove it. */
  @Prop({ required: true, default: false, index: true })
  tombstoned: boolean;

  @Prop({ required: true, default: 1, min: 1 })
  revision: number;

  @Prop({ type: Date, required: false })
  retired_at?: Date;

  @Prop({ type: Date, required: false })
  purged_at?: Date;
}

export const PolicyCategorySourceSchema =
  SchemaFactory.createForClass(PolicyCategorySource);

PolicyCategorySourceSchema.index(
  { source: 1, source_key: 1 },
  { name: 'policy_category_source_identity_v2', unique: true },
);
PolicyCategorySourceSchema.index(
  { category_id: 1 },
  { name: 'policy_category_source_category_id_v2' },
);
