export type UserSort = "newest" | "name" | "tier" | "membership";

/** Minimal user shape the sort needs — satisfied by RegularUser and mock users. */
export interface SortableUser {
  username?: string;
  createdAt?: string | Date;
  creditScore?: number;
  membershipTier?: string;
}

/** Membership tiers ranked for sorting (higher tier first); unknown/none last. */
const MEMBERSHIP_RANK: Record<string, number> = {
  "GoGoPass Plus": 0,
  Basic: 1,
};

const membershipRank = (tier?: string): number =>
  tier && tier in MEMBERSHIP_RANK
    ? MEMBERSHIP_RANK[tier]
    : Number.POSITIVE_INFINITY;

const time = (d?: string | Date): number =>
  d ? new Date(d).getTime() || 0 : 0;

/**
 * Return a new array of users ordered by `sort` (input is not mutated):
 * - `newest` — most recent `createdAt` first (default)
 * - `name` — `username` A–Z, case-insensitive
 * - `tier` — credit score high → low (users without a score last)
 * - `membership` — GoGoPass Plus → Basic → none
 */
export function sortUsers<T extends SortableUser>(
  users: T[],
  sort: UserSort = "newest",
): T[] {
  const copy = [...users];
  switch (sort) {
    case "name":
      return copy.sort((a, b) =>
        (a.username ?? "").localeCompare(b.username ?? "", undefined, {
          sensitivity: "base",
        }),
      );
    case "tier":
      return copy.sort((a, b) => (b.creditScore ?? -1) - (a.creditScore ?? -1));
    case "membership":
      return copy.sort(
        (a, b) =>
          membershipRank(a.membershipTier) - membershipRank(b.membershipTier),
      );
    case "newest":
    default:
      return copy.sort((a, b) => time(b.createdAt) - time(a.createdAt));
  }
}
