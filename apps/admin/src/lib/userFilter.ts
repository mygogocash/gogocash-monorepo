import { tierFromScore } from "@/lib/creditTier";

export interface UserFilters {
  /** Credit tier id: "bronze" | "silver" | "gold" | "platinum". */
  tier?: string;
  /** Membership tier name, e.g. "Basic" | "GoGoPass Plus". */
  membership?: string;
  /** Subscription: "monthly" | "annual" | "none" (no plan). */
  subscription?: string;
}

/** Minimal user shape the filter needs — satisfied by RegularUser and mock users. */
export interface FilterableUser {
  creditScore?: number;
  membershipTier?: string;
  subscriptionPlan?: string;
}

/** Subscription dropdown value → the stored plan name. */
const SUBSCRIPTION_PLAN: Record<string, string> = {
  monthly: "Monthly Premium",
  annual: "Annual Premium",
};

/**
 * Return users matching every provided filter (AND); input is not mutated.
 * Empty / omitted filter fields are ignored (no narrowing on that dimension).
 * - `tier` — credit tier via tierFromScore (users without a score never match)
 * - `membership` — exact membership tier name
 * - `subscription` — "monthly"/"annual" map to plan names; "none" = no plan
 */
export function filterUsers<T extends FilterableUser>(
  users: T[],
  filters: UserFilters,
): T[] {
  let out = users;
  if (filters.tier) {
    out = out.filter(
      (u) =>
        u.creditScore != null && tierFromScore(u.creditScore) === filters.tier,
    );
  }
  if (filters.membership) {
    out = out.filter((u) => u.membershipTier === filters.membership);
  }
  if (filters.subscription === "none") {
    out = out.filter((u) => !u.subscriptionPlan);
  } else if (filters.subscription) {
    const plan = SUBSCRIPTION_PLAN[filters.subscription];
    out = out.filter((u) => u.subscriptionPlan === plan);
  }
  return out;
}
