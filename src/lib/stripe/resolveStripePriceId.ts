import { env } from "@/env";

export type StripePlanTier = "starter" | "plus" | "pro";
export type StripeBillingInterval = "month" | "year";

/**
 * Maps membership tier + billing interval to Stripe Price IDs from env.
 * Returns `undefined` when the corresponding env var is unset.
 */
export function resolveStripePriceId(
  tier: StripePlanTier,
  interval: StripeBillingInterval
): string | undefined {
  const map: Record<StripePlanTier, Record<StripeBillingInterval, string | undefined>> = {
    starter: {
      month: env.STRIPE_PRICE_STARTER_MONTHLY,
      year: env.STRIPE_PRICE_STARTER_YEARLY,
    },
    plus: {
      month: env.STRIPE_PRICE_PLUS_MONTHLY,
      year: env.STRIPE_PRICE_PLUS_YEARLY,
    },
    pro: {
      month: env.STRIPE_PRICE_PRO_MONTHLY,
      year: env.STRIPE_PRICE_PRO_YEARLY,
    },
  };
  const id = map[tier]?.[interval];
  return id && id.length > 0 ? id : undefined;
}
