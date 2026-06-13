import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type GogosenseMerchantDocument = HydratedDocument<GogosenseMerchant>;

@Schema({ timestamps: true, collection: 'gogosense_merchants' })
export class GogosenseMerchant {
  @Prop({ required: true, unique: true, trim: true })
  merchant_id: string;

  @Prop({ required: true, trim: true })
  brand_id: string;

  @Prop({ required: true, trim: true, lowercase: true })
  brand_slug: string;

  @Prop({ required: true, trim: true })
  merchant_name: string;

  @Prop({ type: [String], default: [] })
  android_packages: string[];

  @Prop({ type: [String], default: [] })
  domains: string[];

  @Prop({ required: true, type: Number })
  offer_id: number;

  @Prop({ required: true, type: Number })
  network_merchant_id: number;

  @Prop({ default: '' })
  cashback_rate: string;

  @Prop({ default: 'involve' })
  affiliate_network: string;

  @Prop({ type: [String], default: ['android', 'ios', 'web', 'line'] })
  supported_platforms: string[];

  @Prop({ default: true })
  enabled: boolean;

  @Prop({ default: 0.75, type: Number })
  confidence_threshold: number;
}

export const GogosenseMerchantSchema =
  SchemaFactory.createForClass(GogosenseMerchant);

GogosenseMerchantSchema.index({ enabled: 1 });
GogosenseMerchantSchema.index({ android_packages: 1 });
GogosenseMerchantSchema.index({ domains: 1 });
