import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class SearchBoostRule {
  @Prop({ required: true })
  offer_id: string;

  @Prop({ type: Number, default: 1 })
  boost_weight: number;

  @Prop({ type: String, required: false })
  reason: string;

  @Prop({ type: Boolean, default: true })
  is_active: boolean;
}

export const SearchBoostRuleSchema =
  SchemaFactory.createForClass(SearchBoostRule);
