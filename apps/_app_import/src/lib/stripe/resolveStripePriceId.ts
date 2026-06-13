import { env } from "@/env";

export type StripePlanTier = "starter" | "plus" | "pro";
export type StripeBillingInterval = "month" | "year";

function sharedThbMonthlyForTier(tier: StripePlanTier): string | undefined {
  if (tier === "starter" || tier === "plus") {
    const thb = env.STRIPE_PRICE_THB_MONTHLY;
    if (thb && thb.length > 0) {
      return thb;
    }
  }
  if (tier === "starter") {
    return env.STRIPE_PRICE_STARTER_MONTHLY;
  }
  if (tier === "plus") {
    return env.STRIPE_PRICE_PLUS_MONTHLY;
  }
  return env.STRIPE_PRICE_PRO_MONTHLY;
}

function sharedThbYearlyForTier(tier: StripePlanTier): string | undefined {
  if (tier === "starter" || tier === "plus") {
    const thb = env.STRIPE_PRICE_THB_ANNUAL;
    if (thb && thb.length > 0) {
      return thb;
    }
  }
  if (tier === "starter") {
    return env.STRIPE_PRICE_STARTER_ANNUAL ?? env.STRIPE_PRICE_STARTER_YEARLY;
  }
  if (tier === "plus") {
    return env.STRIPE_PRICE_PLUS_YEARLY;
  }
  return env.STRIPE_PRICE_PRO_YEARLY;
}

/**
 * Maps membership tier + billing interval to Stripe Price IDs from env.
 * When `STRIPE_PRICE_THB_*` is set, starter and plus tiers use those THB prices.
 * Returns `undefined` when the corresponding env var is unset.
 */
export function resolveStripePriceId(
  tier: StripePlanTier,
  interval: StripeBillingInterval
): string | undefined {
  const id = interval === "month" ? sharedThbMonthlyForTier(tier) : sharedThbYearlyForTier(tier);
  return id && id.length > 0 ? id : undefined;
}
