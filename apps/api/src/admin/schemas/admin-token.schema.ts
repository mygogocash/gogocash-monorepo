import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { UserAdmin } from '../user-admin/schemas/user-admin.schema';

export type AdminTokenDocument = HydratedDocument<AdminToken>;

/** What a token authorises. */
export type AdminTokenPurpose = 'invite' | 'reset';

/**
 * One-time, hashed, expiring token backing admin invite + password-reset links.
 * The raw token travels in the email link; only its SHA-256 hash is stored
 * (same rationale as OTP hashing — a DB read must not yield a usable token).
 * A TTL index removes documents at `expiresAt`.
 */
@Schema({ timestamps: true })
export class AdminToken {
  @Prop({ required: true, index: true })
  email: string;

  @Prop({ required: true, unique: true })
  tokenHash: string;

  @Prop({ type: String, required: true, enum: ['invite', 'reset'] })
  purpose: AdminTokenPurpose;

  /** Admin identity this reset token was issued for (reset tokens only). */
  @Prop({
    type: Types.ObjectId,
    ref: UserAdmin.name,
    required: false,
    index: true,
  })
  adminId?: Types.ObjectId;

  /** Credential generation this reset token is allowed to replace. */
  @Prop({ type: Number, required: false, min: 0 })
  sessionVersion?: number;

  /** Role to assign when an invite is accepted (invite tokens only). */
  @Prop({ required: false })
  role?: string;

  @Prop({ required: true })
  expiresAt: Date;

  /** Set once the token is consumed; a used token is rejected. */
  @Prop({ type: Date, required: false, default: null })
  usedAt?: Date | null;
}

export const AdminTokenSchema = SchemaFactory.createForClass(AdminToken);

// Auto-purge expired tokens.
AdminTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
