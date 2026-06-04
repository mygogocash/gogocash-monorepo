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
