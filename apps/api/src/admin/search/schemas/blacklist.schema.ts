import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class SearchBlacklist {
  @Prop({ required: true, unique: true })
  term: string;

  @Prop({ type: String, required: false })
  reason: string;
}

export const SearchBlacklistSchema =
  SchemaFactory.createForClass(SearchBlacklist);
