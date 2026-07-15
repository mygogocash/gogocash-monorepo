import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AdminInviteStateDocument = HydratedDocument<AdminInviteState>;

/**
 * Authoritative invite generation and short-lived delivery lease for one
 * normalized admin email. Token rows remain the expiring bearer credentials;
 * this record selects the only generation that may currently be accepted.
 */
@Schema({ timestamps: true, collection: 'admin_invite_states' })
export class AdminInviteState {
  @Prop({ required: true, lowercase: true, trim: true })
  email: string;

  @Prop({ type: String, required: false, default: null })
  activeTokenHash?: string | null;

  @Prop({ type: String, required: false, default: null })
  leaseOwner?: string | null;

  @Prop({ type: Date, required: false, default: null })
  leaseExpiresAt?: Date | null;
}

export const AdminInviteStateSchema =
  SchemaFactory.createForClass(AdminInviteState);

// The lease acquisition relies on a duplicate-key race to reject a concurrent
// upsert, so uniqueness is a correctness boundary rather than an optimization.
AdminInviteStateSchema.index({ email: 1 }, { unique: true });
