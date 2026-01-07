import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BannerDocument = HydratedDocument<Banner>;

@Schema({ timestamps: true })
export class Banner {
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
}

export const BannerSchema = SchemaFactory.createForClass(Banner);
