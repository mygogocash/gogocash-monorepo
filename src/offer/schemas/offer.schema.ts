import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OfferDocument = HydratedDocument<Offer>;

@Schema({ timestamps: true })
export class Offer {
  @Prop({ required: true, unique: true })
  offer_id: number;

  @Prop({ required: true })
  merchant_id: number;

  @Prop({ required: true })
  offer_name: string;

  @Prop()
  description: string;

  @Prop()
  preview_url: string;

  @Prop({ default: 0 })
  is_require_approval: number;

  @Prop()
  currency: string;

  @Prop()
  logo: string;

  @Prop()
  lookup_value: string;

  @Prop()
  validation_terms: number;

  @Prop()
  payment_terms: number;

  @Prop()
  datetime_updated: Date;

  @Prop()
  datetime_created: Date;

  @Prop({ default: false })
  marketplace_store_offer: boolean;

  @Prop()
  categories: string;

  @Prop()
  countries: string;

  @Prop()
  commissions: { [key: string]: string }[];

  @Prop()
  special_commissions: any[]; // Adjust type if specific structure is known

  @Prop()
  tracking_link: string;

  @Prop()
  commission_tracking: string;

  @Prop()
  tracking_type: string;

  @Prop()
  directory_page: string;

  @Prop()
  logo_desktop: string;

  @Prop()
  logo_mobile: string;

  @Prop()
  offer_name_display: string;

  @Prop()
  banner: string;

  @Prop()
  logo_circle: string;

  @Prop()
  disabled: boolean;

  @Prop()
  commission_store: number;

  @Prop()
  max_cap: number;

  @Prop()
  banner_mobile: string;

  @Prop()
  type: string; // old / new

  @Prop()
  extra_store: boolean;

  @Prop({ default: 1 })
  extra_point: number;
}

export const OfferSchema = SchemaFactory.createForClass(Offer);
