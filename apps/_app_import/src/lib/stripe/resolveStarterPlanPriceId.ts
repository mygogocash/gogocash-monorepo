import { env } from "@/env";
import type { PlanId } from "@/features/subscription/types";

/** Resolves Stripe Price ID for GoGo Unlimited THB plans (legacy Starter env names remain as fallback). */
export function resolveStarterPlanPriceId(planId: PlanId): string | undefined {
  if (planId === "thb_monthly_49") {
    return env.STRIPE_PRICE_THB_MONTHLY ?? env.STRIPE_PRICE_STARTER_MONTHLY ?? undefined;
  }
  return (
    env.STRIPE_PRICE_THB_ANNUAL ??
    env.STRIPE_PRICE_STARTER_ANNUAL ??
    env.STRIPE_PRICE_STARTER_YEARLY ??
    undefined
  );
}
