import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BrandDocument = HydratedDocument<Brand>;

/**
 * Brand parent entity that groups country-specific Offer variants.
 *
 * Commerce catalog uses the same Brand as the shop source of truth. Shop fields
 * are optional so existing cashback/affiliate brand records remain valid until
 * an admin explicitly publishes a shop profile.
 */
@Schema({ timestamps: true })
export class Brand {
  @Prop({ required: true, trim: true })
  brand_name: string;

  @Prop({ required: true, trim: true, lowercase: true })
  brand_slug: string;

  @Prop({ trim: true })
  default_country?: string;

  @Prop({ default: false })
  is_global: boolean;

  @Prop({ trim: true })
  logo: string;

  @Prop({ trim: true })
  logo_circle: string;

  @Prop({ trim: true })
  banner: string;

  @Prop({ trim: true })
  description: string;

  @Prop({ type: [String], default: [] })
  categories: string[];

  @Prop({ trim: true, lowercase: true })
  shop_slug?: string;

  @Prop({ default: 'draft', enum: ['draft', 'published', 'archived'] })
  shop_status?: 'draft' | 'published' | 'archived';

  @Prop({ default: false })
  shop_visible?: boolean;

  @Prop({ default: 'gogocash', enum: ['gogocash'] })
  fulfillment_owner?: 'gogocash';

  @Prop({ trim: true })
  support_email?: string;

  @Prop({ trim: true })
  support_url?: string;

  @Prop({ trim: true })
  return_policy?: string;

  @Prop({ trim: true })
  shipping_policy?: string;

  @Prop({ default: false })
  disabled: boolean;
}

export const BrandSchema = SchemaFactory.createForClass(Brand);

BrandSchema.index({ brand_slug: 1 }, { unique: true, sparse: true });
BrandSchema.index({ shop_slug: 1 }, { unique: true, sparse: true });
BrandSchema.index({ disabled: 1, brand_name: 1 });
BrandSchema.index({ is_global: 1 });
BrandSchema.index({ shop_status: 1, shop_visible: 1 });
