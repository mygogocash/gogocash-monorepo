import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type DiscoverSectionDocument = HydratedDocument<DiscoverSection>;

@Schema({ _id: false })
export class DiscoverSectionItem {
  @Prop({ required: true })
  offer_id: string;

  @Prop({ type: Number, default: 0 })
  sort_order: number;

  @Prop({ type: String, default: '' })
  custom_title: string;
}

export const DiscoverSectionItemSchema =
  SchemaFactory.createForClass(DiscoverSectionItem);

@Schema({ timestamps: true })
export class DiscoverSection {
  @Prop({ required: true, unique: true })
  type: string; // trending | featured | seasonal | new

  @Prop({ required: true })
  title: string;

  @Prop({ type: Number, default: 0 })
  sort_order: number;

  @Prop({ type: Boolean, default: true })
  is_active: boolean;

  @Prop({ type: [DiscoverSectionItemSchema], default: [] })
  items: DiscoverSectionItem[];
}

export const DiscoverSectionSchema =
  SchemaFactory.createForClass(DiscoverSection);
