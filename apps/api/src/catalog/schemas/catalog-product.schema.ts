import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type CatalogProductDocument = HydratedDocument<CatalogProduct>;
export type CatalogProductStatus = 'draft' | 'published' | 'archived';

@Schema({ _id: false })
export class CatalogProductVariant {
  @Prop({ required: true, trim: true })
  sku!: string;

  @Prop({ trim: true })
  title?: string;

  @Prop({ type: Object, default: {} })
  attributes!: Record<string, string>;

  @Prop({ required: true, min: 0 })
  price_amount!: number;

  @Prop({ required: true, uppercase: true, minlength: 3, maxlength: 3 })
  currency!: string;

  @Prop({ default: 0, min: 0 })
  inventory_quantity!: number;

  @Prop({ default: 0, min: 0 })
  reserved_quantity!: number;

  @Prop({ default: true })
  active!: boolean;

  @Prop({ trim: true })
  image_url?: string;
}

@Schema({ collection: 'catalog_products', timestamps: true })
export class CatalogProduct {
  @Prop({ required: true, trim: true, maxlength: 160 })
  title!: string;

  @Prop({
    required: true,
    trim: true,
    lowercase: true,
    unique: true,
    index: true,
  })
  slug!: string;

  @Prop({ trim: true, maxlength: 2000 })
  description?: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Brand',
    required: true,
    index: true,
  })
  brand_id!: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Offer', index: true })
  offer_id?: Types.ObjectId;

  @Prop({ trim: true, index: true })
  shop_slug?: string;

  @Prop({ required: true, trim: true })
  default_sku!: string;

  @Prop({ required: true, min: 0 })
  price_amount!: number;

  @Prop({ required: true, uppercase: true, minlength: 3, maxlength: 3 })
  currency!: string;

  @Prop({ default: 0, min: 0 })
  inventory_quantity!: number;

  @Prop({ default: 0, min: 0 })
  reserved_quantity!: number;

  @Prop({ type: [String], default: [] })
  images!: string[];

  @Prop({ type: [CatalogProductVariant], default: [] })
  variants!: CatalogProductVariant[];

  @Prop({ type: [String], default: [] })
  tags!: string[];

  @Prop({
    default: 'draft',
    enum: ['draft', 'published', 'archived'],
    index: true,
  })
  status!: CatalogProductStatus;

  @Prop({ type: Date, index: true })
  published_at?: Date;

  @Prop({ type: Date, index: true })
  scheduled_start_at?: Date;

  @Prop({ type: Date, index: true })
  scheduled_end_at?: Date;

  @Prop({ trim: true, maxlength: 80 })
  seo_title?: string;

  @Prop({ trim: true, maxlength: 180 })
  seo_description?: string;

  @Prop({ trim: true })
  created_by?: string;

  @Prop({ trim: true })
  updated_by?: string;
}

export const CatalogProductSchema =
  SchemaFactory.createForClass(CatalogProduct);

CatalogProductSchema.index({
  status: 1,
  scheduled_start_at: 1,
  scheduled_end_at: 1,
});
CatalogProductSchema.index({ brand_id: 1, status: 1 });
CatalogProductSchema.index({ shop_slug: 1, status: 1 });
