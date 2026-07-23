import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';

export type PolicyIntegrityStateDocument =
  HydratedDocument<PolicyIntegrityState>;

@Schema({ timestamps: true, collection: 'policy_integrity_states' })
export class PolicyIntegrityState {
  @Prop({ required: true })
  key: string;

  @Prop({ required: true, min: 1 })
  migration_version: number;

  @Prop({
    required: true,
    enum: ['applying', 'ready', 'failed'],
    index: true,
  })
  status: 'applying' | 'ready' | 'failed';

  @Prop({ type: Date, required: false })
  applied_at?: Date;

  /** Fences one explicit migration apply attempt from concurrent operators. */
  @Prop({ required: false, index: true })
  migration_attempt_token?: string;

  @Prop({ type: Date, required: false, index: true })
  migration_lease_expires_at?: Date;

  @Prop({ type: SchemaTypes.Mixed, required: false })
  counts?: Record<string, number>;

  @Prop({ type: [SchemaTypes.Mixed], required: false, default: undefined })
  quarantine?: Record<string, unknown>[];

  @Prop({ required: false })
  last_error?: string;

  /** Transactional writer fence; migration acquisition updates this same row. */
  @Prop({ required: true, default: 0, min: 0 })
  write_epoch: number;
}

export const PolicyIntegrityStateSchema =
  SchemaFactory.createForClass(PolicyIntegrityState);

PolicyIntegrityStateSchema.index(
  { key: 1 },
  { name: 'policy_integrity_state_key_v2', unique: true },
);
