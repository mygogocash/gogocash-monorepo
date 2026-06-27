import { Types } from 'mongoose';

/**
 * P1-COLLSCAN helper: extract the 24-hex Mongo ObjectId a conversion's legacy
 * `aff_sub1` string encodes ("user_id:<hex24>"). Used by the backfill script
 * (scripts/backfill-conversion-userid.ts) to populate the indexed
 * `conversions.user_id` field, so the hot balance read can eventually query an
 * index instead of a $regex collection scan.
 */
const AFF_SUB1_USER_ID = /^user_id:([0-9a-fA-F]{24})$/;

export function parseUserIdFromAffSub1(
  affSub1: string | null | undefined,
): string | null {
  if (!affSub1) return null;
  const match = AFF_SUB1_USER_ID.exec(affSub1.trim());
  return match ? match[1] : null;
}

function toUserObjectId(userId: string | Types.ObjectId): Types.ObjectId {
  return typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
}

/** Canonical aff_sub1 token written by deeplink + reward flows. */
export function affSub1ForUserId(userId: string | Types.ObjectId): string {
  return `user_id:${toUserObjectId(userId).toString()}`;
}

/**
 * Indexed read path for user-scoped conversion queries. Uses `user_id` when
 * populated and falls back to an exact `aff_sub1` match for legacy rows — never
 * `$regex`, which forces a collection scan on every balance check.
 */
export function buildUserConversionScopeFilter(
  userId: string | Types.ObjectId,
) {
  const oid = toUserObjectId(userId);
  return {
    $or: [{ user_id: oid }, { aff_sub1: affSub1ForUserId(oid) }],
  };
}

export function buildApprovedUserConversionsFilter(
  userId: string | Types.ObjectId,
) {
  return {
    conversion_status: 'approved',
    ...buildUserConversionScopeFilter(userId),
  };
}

/** Populate indexed `user_id` on ingest when Involve only sends aff_sub1. */
export function enrichConversionWithUserId<
  T extends { aff_sub1?: string; user_id?: Types.ObjectId },
>(conversion: T): T {
  if (conversion.user_id) {
    return conversion;
  }
  const parsed = parseUserIdFromAffSub1(conversion.aff_sub1);
  if (!parsed) {
    return conversion;
  }
  return { ...conversion, user_id: new Types.ObjectId(parsed) };
}

/** Backfill helper: derive indexed user_id from a legacy conversion row. */
export function resolveBackfillUserObjectId(
  affSub1: string | null | undefined,
): Types.ObjectId | null {
  const parsed = parseUserIdFromAffSub1(affSub1);
  return parsed ? new Types.ObjectId(parsed) : null;
}
