export type MyCashbackSort = "newest" | "name" | "balance";

/** Minimal shapes the helpers need — satisfied by MyCashbackResponse and mock rows. */
export interface FilterableMcbUser {
  banned?: boolean;
}
export interface SortableMcbUser {
  createdAt?: string | Date;
  firstName?: string;
  lastName?: string;
  email?: string;
  balance?: { amount?: number }[];
}

const balanceOf = (u: SortableMcbUser): number => u.balance?.[0]?.amount ?? 0;

const nameOf = (u: SortableMcbUser): string =>
  `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || (u.email ?? "");

const timeOf = (d?: string | Date): number =>
  d ? new Date(d).getTime() || 0 : 0;

/**
 * Filter MyCashBack users by derived status (input not mutated):
 * - `active` — not banned
 * - `banned` — banned
 * - anything else (e.g. "") — no filter
 */
export function filterMyCashbackByStatus<T extends FilterableMcbUser>(
  users: T[],
  status: string,
): T[] {
  if (status === "active") return users.filter((u) => !u.banned);
  if (status === "banned") return users.filter((u) => u.banned);
  return users;
}

/**
 * Return a new array of MyCashBack users ordered by `sort` (input not mutated):
 * - `newest` — most recent `createdAt` first (default)
 * - `name` — full name (or email) A–Z, case-insensitive
 * - `balance` — primary balance amount high → low
 */
export function sortMyCashback<T extends SortableMcbUser>(
  users: T[],
  sort: MyCashbackSort = "newest",
): T[] {
  const copy = [...users];
  switch (sort) {
    case "name":
      return copy.sort((a, b) =>
        nameOf(a).localeCompare(nameOf(b), undefined, { sensitivity: "base" }),
      );
    case "balance":
      return copy.sort((a, b) => balanceOf(b) - balanceOf(a));
    case "newest":
    default:
      return copy.sort((a, b) => timeOf(b.createdAt) - timeOf(a.createdAt));
  }
}
