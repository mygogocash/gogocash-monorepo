import { env } from "@/env";
import type { PlanId } from "@/features/subscription/types";

/** Resolves Stripe Price ID for GoGo Unlimited Starter plans (USD). */
export function resolveStarterPlanPriceId(planId: PlanId): string | undefined {
  if (planId === "starter_monthly") {
    return env.STRIPE_PRICE_STARTER_MONTHLY ?? undefined;
  }
  return env.STRIPE_PRICE_STARTER_ANNUAL ?? env.STRIPE_PRICE_STARTER_YEARLY ?? undefined;
}
