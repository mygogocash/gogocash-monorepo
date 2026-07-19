import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AdminActivityEventDocument = HydratedDocument<AdminActivityEvent>;

export const ADMIN_ACTIVITY_ACTOR_TYPES = [
  'admin',
  'customer',
  'system',
] as const;
export type AdminActivityActorType =
  (typeof ADMIN_ACTIVITY_ACTOR_TYPES)[number];

@Schema({ collection: 'admin_activity_events', timestamps: false })
export class AdminActivityEvent {
  @Prop({ type: Date, required: true, index: true })
  occurred_at!: Date;

  @Prop({
    type: String,
    required: true,
    enum: ADMIN_ACTIVITY_ACTOR_TYPES,
    index: true,
  })
  actor_type!: AdminActivityActorType;

  @Prop({ type: String, required: false, index: true })
  actor_id?: string;

  @Prop({ type: String, required: false })
  actor_label?: string;

  @Prop({ type: String, required: true, index: true })
  action!: string;

  @Prop({ type: String, required: true, index: true })
  entity_type!: string;

  @Prop({ type: String, required: false, index: true })
  entity_id?: string;

  @Prop({ type: String, required: true })
  summary!: string;

  @Prop({ type: Object, required: false, default: {} })
  metadata?: Record<string, unknown>;
}

export const AdminActivityEventSchema =
  SchemaFactory.createForClass(AdminActivityEvent);

AdminActivityEventSchema.index({ occurred_at: -1 });
AdminActivityEventSchema.index({ actor_id: 1, occurred_at: -1 });
AdminActivityEventSchema.index({
  entity_type: 1,
  entity_id: 1,
  occurred_at: -1,
});
AdminActivityEventSchema.index({ action: 1, occurred_at: -1 });
