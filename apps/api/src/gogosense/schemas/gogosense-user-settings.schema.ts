import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type GogosenseUserSettingsDocument =
  HydratedDocument<GogosenseUserSettings>;

@Schema({ timestamps: true, collection: 'gogosense_user_settings' })
export class GogosenseUserSettings {
  @Prop({ required: true, unique: true, index: true })
  user_id: string;

  @Prop({ default: false })
  enabled: boolean;

  @Prop({ default: false })
  usage_stats_enabled: boolean;

  @Prop({ default: false })
  notification_listener_enabled: boolean;

  @Prop({ default: true })
  screenshot_recovery_enabled: boolean;
}

export const GogosenseUserSettingsSchema = SchemaFactory.createForClass(
  GogosenseUserSettings,
);
