import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CategoryDocument = HydratedDocument<Category>;

@Schema({ timestamps: true })
export class Category {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: false })
  image: string;

  /** Optional wide image used as the category/policy default banner. */
  @Prop({ required: false })
  banner?: string;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
