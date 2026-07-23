import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  SEARCH_RULE_TREATMENTS,
  type SearchRuleTreatment,
} from '../search-rule.contract';

@Schema({ timestamps: true })
export class SearchBoostRule {
  @Prop({ required: true })
  offer_id: string;

  @Prop({ type: String, enum: SEARCH_RULE_TREATMENTS, default: 'boost' })
  treatment: SearchRuleTreatment;

  @Prop({ type: [String], default: [] })
  keywords: string[];

  @Prop({ type: Number, required: false, min: 0 })
  weight?: number;

  /** Legacy field retained for existing boost-rule records and endpoints. */
  @Prop({ type: Number, default: 1 })
  boost_weight: number;

  @Prop({ type: String, required: false })
  reason: string;

  @Prop({ type: Boolean, default: true })
  is_active: boolean;
}

export const SearchBoostRuleSchema =
  SchemaFactory.createForClass(SearchBoostRule);
