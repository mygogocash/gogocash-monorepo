import { QueryFilter } from 'mongoose';
import type { Quest } from '../point/schemas/quest.schema';
import { createHash } from 'node:crypto';
import { canonicalConversionIdentity } from '../quest-task-engine/conversion-provider-identity';

const IDENTITY_PART = /^[^:\s]+$/;

function identityPart(value: unknown, label: string): string {
  const normalized = String(value ?? '').trim();
  if (!IDENTITY_PART.test(normalized)) {
    throw new Error(`Invalid ${label} identity component`);
  }
  return normalized;
}

export function isLegacyRewardModel(value: unknown): boolean {
  return value === undefined || value === null || value === 'legacy_v1';
}

export function legacyQuestRewardFilter(): QueryFilter<Quest> {
  return {
    $or: [{ reward_model: { $exists: false } }, { reward_model: 'legacy_v1' }],
  } as QueryFilter<Quest>;
}

export function legacyPurchasePointKey(
  conversionOrSource: Record<string, unknown> | unknown,
  conversionId?: unknown,
  providerAccount?: unknown,
): string {
  const conversion =
    conversionOrSource && typeof conversionOrSource === 'object'
      ? (conversionOrSource as Record<string, unknown>)
      : {
          source: conversionOrSource,
          conversion_id: conversionId,
          provider_account: providerAccount ?? 'default',
        };
  return `legacy:purchase:conversion:${canonicalConversionIdentity(conversion)}`;
}

export function legacySpecialPointKey(
  questId: unknown,
  userId: unknown,
): string {
  return `legacy:quest:${identityPart(questId, 'quest')}:special-next-round:user:${identityPart(userId, 'user')}`;
}

export function legacySocialPayoutKey(
  questId: unknown,
  userId: unknown,
  type: unknown,
  action: unknown,
): string {
  return `legacy:quest:${identityPart(questId, 'quest')}:social:${identityPart(type, 'social type')}:${identityPart(action, 'social action')}:user:${identityPart(userId, 'user')}`;
}

export function legacyRankPayoutKey(
  questId: unknown,
  userId: unknown,
  rank: number,
): string {
  if (!Number.isSafeInteger(rank) || rank < 1) {
    throw new Error('Invalid quest rank');
  }
  return `legacy:quest:${identityPart(questId, 'quest')}:rank:${rank}:user:${identityPart(userId, 'user')}`;
}

export function legacySyntheticConversionId(payoutKey: string): number {
  const normalized = payoutKey.trim();
  if (!normalized) throw new Error('Invalid payout identity');
  // Network conversion ids are positive. A stable negative 48-bit hash keeps
  // synthetic quest rows deterministic across crashes while remaining a safe
  // JavaScript integer and avoiding Date.now() collisions between workers.
  const value = Number.parseInt(
    createHash('sha256').update(normalized).digest('hex').slice(0, 12),
    16,
  );
  return -(value || 1);
}
