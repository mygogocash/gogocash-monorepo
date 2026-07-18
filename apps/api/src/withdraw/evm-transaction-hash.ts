import { BadRequestException } from '@nestjs/common';

export const EVM_TRANSACTION_HASH_PATTERN = /^0x[0-9a-fA-F]{64}$/;

/**
 * Mongo string uniqueness is case-sensitive by default, while an EVM
 * transaction hash is not. Every persistence boundary must therefore use one
 * lowercase representation or the same payout could be recorded twice by
 * changing only hex casing.
 */
export function requireCanonicalEvmTransactionHash(value: unknown): string {
  if (typeof value !== 'string') {
    throw new BadRequestException(
      'tx_hash must be a 0x-prefixed 64-char hex string',
    );
  }
  const trimmed = value.trim();
  if (!EVM_TRANSACTION_HASH_PATTERN.test(trimmed)) {
    throw new BadRequestException(
      'tx_hash must be a 0x-prefixed 64-char hex string',
    );
  }
  return trimmed.toLowerCase();
}
