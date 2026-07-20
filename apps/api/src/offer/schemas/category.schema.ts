import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CategoryDocument = HydratedDocument<Category>;

// Keep this list in sync with the admin renderer
// (apps/admin/src/components/policy/CategoryIcon.tsx CATEGORY_ICON_KEYS + PATHS):
// a key here that the admin can't render would show the default icon, and a
// key the admin offers that is missing here is rejected on save.
export const CATEGORY_ICON_KEYS = [
  'shopping',
  'travel',
  'food',
  'finance',
  'entertainment',
  'electronics',
  'fashion',
  'beauty',
  'health',
  'home',
  'education',
  'gift',
  'sports',
  'pets',
  'baby',
  'auto',
  'services',
  'default',
] as const;
export type CategoryIconKey = (typeof CATEGORY_ICON_KEYS)[number];

export const CATEGORY_LIFECYCLE_STATES = [
  'active',
  'retired',
  'purging',
] as const;

@Schema({ _id: false })
export class CategoryMediaAsset {
  @Prop({ type: String, required: true, enum: ['r2', 'legacy-unverified'] })
  provider: 'r2' | 'legacy-unverified';

  @Prop({
    type: String,
    required: true,
    enum: ['command-owned', 'legacy-unverified'],
  })
  ownership: 'command-owned' | 'legacy-unverified';

  @Prop({ required: false })
  owner_key?: string;

  @Prop({ required: false })
  owner_attempt_token?: string;

  @Prop({ required: true })
  url: string;

  @Prop({ required: false })
  bucket?: string;

  @Prop({ required: false })
  object_key?: string;

  @Prop({ required: false })
  sha256?: string;

  @Prop({ required: false })
  original_name?: string;

  @Prop({ required: false })
  content_type?: string;

  @Prop({ type: Date, required: false })
  uploaded_at?: Date;
}

export const CategoryMediaAssetSchema =
  SchemaFactory.createForClass(CategoryMediaAsset);

@Schema({ timestamps: true })
export class Category {
  @Prop({ required: true, unique: true })
  name: string;

  /** Canonical exact identity for duplicate/source checks. Legacy rows may lack it. */
  @Prop({ required: false })
  name_normalized?: string;

  @Prop({ type: String, required: false, enum: CATEGORY_ICON_KEYS })
  icon_key?: CategoryIconKey;

  @Prop({
    type: String,
    required: false,
    enum: CATEGORY_LIFECYCLE_STATES,
    default: 'active',
    index: true,
  })
  lifecycle_status?: (typeof CATEGORY_LIFECYCLE_STATES)[number];

  @Prop({ required: false, default: 1, min: 1 })
  revision?: number;

  @Prop({ type: Date, required: false })
  retired_at?: Date;

  @Prop({ type: Date, required: false })
  purge_after?: Date;

  @Prop({ required: false })
  image: string;

  @Prop({ type: CategoryMediaAssetSchema, required: false })
  image_asset?: CategoryMediaAsset;

  /** Optional wide image used as the category/policy default banner. */
  @Prop({ required: false })
  banner?: string;

  @Prop({ type: CategoryMediaAssetSchema, required: false })
  banner_asset?: CategoryMediaAsset;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

CategorySchema.index(
  { name_normalized: 1 },
  {
    name: 'policy_category_name_normalized_v2',
    unique: true,
    partialFilterExpression: { name_normalized: { $type: 'string' } },
  },
);
