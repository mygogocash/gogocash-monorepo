import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BannerDocument = HydratedDocument<Banner>;

/** Separate model/collection token for the All Brands directory carousel. */
export const ALL_BRAND_BANNER_MODEL = 'AllBrandBanner';
export const ALL_BRAND_BANNER_COLLECTION = 'all_brand_banners';

@Schema({ timestamps: true })
export class Banner {
  @Prop({ required: false })
  start_date: string;

  @Prop({ required: false })
  end_date: string;

  @Prop({ default: '' })
  link_1: string;

  @Prop({ default: '' })
  link_2: string;

  @Prop({ default: '' })
  link_3: string;

  @Prop({ default: '' })
  link_4: string;

  @Prop({ default: '' })
  link_5: string;

  @Prop({ required: false })
  image_1: string;

  @Prop({ required: false })
  image_2: string;

  @Prop({ required: false })
  image_3: string;

  @Prop({ required: false })
  image_4: string;

  @Prop({ required: false })
  image_5: string;

  @Prop({ required: false })
  enabled_1: boolean;

  @Prop({ required: false })
  enabled_2: boolean;

  @Prop({ required: false })
  enabled_3: boolean;

  @Prop({ required: false })
  enabled_4: boolean;

  @Prop({ required: false })
  enabled_5: boolean;

  @Prop({ required: false })
  start_date_1: string;

  @Prop({ required: false })
  start_date_2: string;

  @Prop({ required: false })
  start_date_3: string;

  @Prop({ required: false })
  start_date_4: string;

  @Prop({ required: false })
  start_date_5: string;

  @Prop({ required: false })
  end_date_1: string;

  @Prop({ required: false })
  end_date_2: string;

  @Prop({ required: false })
  end_date_3: string;

  @Prop({ required: false })
  end_date_4: string;

  @Prop({ required: false })
  end_date_5: string;
}

export const BannerSchema = SchemaFactory.createForClass(Banner);
