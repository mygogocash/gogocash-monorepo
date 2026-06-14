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
