import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CatalogBannerDocument = HydratedDocument<CatalogBanner>;
export type CatalogBannerStatus = 'draft' | 'published' | 'archived';
export type CatalogBannerPlacement =
  'home_hero' | 'home_grid' | 'shop_list' | 'product_detail' | 'modal';
export type CatalogBannerDevice = 'all' | 'mobile' | 'tablet' | 'desktop';
export type CatalogBannerCtaType =
  'none' | 'shop' | 'product' | 'offer' | 'url';

@Schema({ collection: 'catalog_banners', timestamps: true })
export class CatalogBanner {
  @Prop({ required: true, trim: true, maxlength: 140 })
  title!: string;

  @Prop({ trim: true, maxlength: 280 })
  subtitle?: string;

  @Prop({ required: true, trim: true })
  image_url!: string;

  @Prop({ trim: true })
  image_alt?: string;

  @Prop({
    type: String,
    required: true,
    enum: ['home_hero', 'home_grid', 'shop_list', 'product_detail', 'modal'],
    index: true,
  })
  placement!: CatalogBannerPlacement;

  @Prop({ default: 'all', trim: true, index: true })
  locale!: string;

  @Prop({
    type: String,
    default: 'all',
    enum: ['all', 'mobile', 'tablet', 'desktop'],
    index: true,
  })
  device!: CatalogBannerDevice;

  @Prop({
    type: String,
    default: 'none',
    enum: ['none', 'shop', 'product', 'offer', 'url'],
  })
  cta_type!: CatalogBannerCtaType;

  @Prop({ trim: true })
  cta_value?: string;

  @Prop({ default: 0, min: 0, index: true })
  priority!: number;

  @Prop({
    type: String,
    default: 'draft',
    enum: ['draft', 'published', 'archived'],
    index: true,
  })
  status!: CatalogBannerStatus;

  @Prop({ type: Date, index: true })
  starts_at?: Date;

  @Prop({ type: Date, index: true })
  ends_at?: Date;

  @Prop({ trim: true })
  created_by?: string;

  @Prop({ trim: true })
  updated_by?: string;
}

export const CatalogBannerSchema = SchemaFactory.createForClass(CatalogBanner);

CatalogBannerSchema.index({ placement: 1, status: 1, priority: -1 });
CatalogBannerSchema.index({ status: 1, starts_at: 1, ends_at: 1 });
