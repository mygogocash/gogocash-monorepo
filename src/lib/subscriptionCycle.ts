import type { SubscriptionPlan } from "@/types/adminModules";

export type BillingCycle = SubscriptionPlan["billingCycle"];

/**
 * Derive the billing cycle from a plan name such as "Monthly Premium" or
 * "Annual Premium". A `Subscription` only carries `planName`, not the cycle,
 * so we infer it from keywords and fall back to monthly.
 */
export function planCycle(planName: string): BillingCycle {
  const n = (planName ?? "").toLowerCase();
  if (n.includes("annual") || n.includes("year")) return "annual";
  if (n.includes("quarter")) return "quarterly";
  return "monthly";
}

/** Human label for a billing cycle (note "Annually", not "Annual"). */
export const CYCLE_LABEL: Record<BillingCycle, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  annual: "Annually",
};

/** Tailwind badge colors per billing cycle (shared by the subscription and
 * user tables; mirrors the plan-card accent colors). */
export const CYCLE_BADGE: Record<BillingCycle, string> = {
  monthly: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  quarterly:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  annual:
    "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200",
};
