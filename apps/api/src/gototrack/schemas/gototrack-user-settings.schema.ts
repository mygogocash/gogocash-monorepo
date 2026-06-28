import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type GototrackUserSettingsDocument =
  HydratedDocument<GototrackUserSettings>;

@Schema({ timestamps: true, collection: 'gogosense_user_settings' })
export class GototrackUserSettings {
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

export const GototrackUserSettingsSchema = SchemaFactory.createForClass(
  GototrackUserSettings,
);
