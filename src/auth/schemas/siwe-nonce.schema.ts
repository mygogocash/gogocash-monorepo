import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SiweNonceDocument = HydratedDocument<SiweNonce>;

/**
 * Short-lived single-use nonce for EIP-4361 (SIWE) sign-in.
 *
 * Written by `GET /auth/siwe-nonce`, consumed (deleted) inside
 * `signInMiniPaySiwe` when the verified SIWE message's `Nonce:` field matches
 * a pending record. The TTL index expires orphaned nonces automatically so
 * nothing piles up; the unique index ensures random collisions would fail
 * the insert rather than silently overwrite.
 */
@Schema({ timestamps: true })
export class SiweNonce {
  @Prop({ required: true, unique: true, index: true })
  nonce: string;

  /**
   * TTL anchor. MongoDB prunes the document `expiresAfterSeconds` after this
   * value. Set to `new Date()` on insert so the document lives exactly
   * `NONCE_TTL_SECONDS` beyond issuance.
   */
  @Prop({ required: true })
  issuedAt: Date;
}

export const SIWE_NONCE_TTL_SECONDS = 5 * 60;

export const SiweNonceSchema = SchemaFactory.createForClass(SiweNonce);

SiweNonceSchema.index({ issuedAt: 1 }, { expireAfterSeconds: SIWE_NONCE_TTL_SECONDS });
