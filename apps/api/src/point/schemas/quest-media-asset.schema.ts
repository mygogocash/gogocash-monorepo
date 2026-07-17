import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import type { CommandOwnedStoredMediaAsset } from 'src/media/stored-media.service';

@Schema({ _id: false })
export class QuestMediaAsset implements CommandOwnedStoredMediaAsset {
  @Prop({ required: true, enum: ['r2'] })
  provider: 'r2';

  @Prop({ required: true, enum: ['command-owned'] })
  ownership: 'command-owned';

  @Prop({ required: true })
  owner_key: string;

  @Prop({ required: true })
  owner_attempt_token: string;

  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  bucket: string;

  @Prop({ required: true })
  object_key: string;

  @Prop({ required: true })
  sha256: string;

  @Prop({ required: true })
  original_name: string;

  @Prop({ required: false })
  content_type?: string;

  @Prop({ type: Date, required: false })
  uploaded_at?: Date;
}

export const QuestMediaAssetSchema =
  SchemaFactory.createForClass(QuestMediaAsset);
