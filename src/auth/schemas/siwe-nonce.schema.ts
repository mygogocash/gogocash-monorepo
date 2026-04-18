import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SiweNonceDocument = HydratedDocument<SiweNonce>;

/**
 * Short-lived single-use nonce for EIP-4361 (SIWE) sign-in.
 *
 * Written by `GET /auth/siwe-nonce`, consumed (deleted) inside
 * `signInMiniPaySiwe` when the verified SIWE message's `Nonce:` field matches
 * a pending record. The TTL index anchored on the Mongoose `createdAt`
 * timestamp expires orphaned nonces automatically so nothing piles up; the
 * unique index ensures random collisions would fail the insert rather than
 * silently overwrite.
 */
@Schema({ timestamps: true })
export class SiweNonce {
  @Prop({ required: true, unique: true, index: true })
  nonce: string;
}

export const SIWE_NONCE_TTL_SECONDS = 5 * 60;

export const SiweNonceSchema = SchemaFactory.createForClass(SiweNonce);

// TTL on Mongoose's `createdAt` (supplied by `timestamps: true`) — one
// timestamp field instead of two keeps the insert path simple and can't
// drift out of sync.
SiweNonceSchema.index({ createdAt: 1 }, { expireAfterSeconds: SIWE_NONCE_TTL_SECONDS });
