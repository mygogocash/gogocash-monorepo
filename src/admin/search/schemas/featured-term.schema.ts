import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class FeaturedSearchTerm {
  @Prop({ required: true })
  term: string;

  @Prop({ type: Number, default: 0 })
  sort_order: number;

  @Prop({ type: Boolean, default: true })
  is_active: boolean;
}

export const FeaturedSearchTermSchema =
  SchemaFactory.createForClass(FeaturedSearchTerm);
