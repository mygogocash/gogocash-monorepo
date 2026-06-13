// Backend DTO for GET /customer-billing/subscription (FirebaseAuthGuard).
// With STRIPE_BILLING_ENABLED unset (staging today) the service returns
// { enabled: false, status: "disabled" }; with Stripe configured, status is
// the Stripe subscription state ("none" | "active" | "trialing" | …) plus an
// optional currentPeriodEnd ISO date.
export type CustomerSubscriptionStatusResponse = {
  currentPeriodEnd?: string;
  enabled: boolean;
  status: string;
};

/** Narrow an unknown backend payload to the subscription status shape. */
export function isCustomerSubscriptionStatus(
  payload: unknown
): payload is CustomerSubscriptionStatusResponse {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return false;
  }
  const candidate = payload as { enabled?: unknown; status?: unknown };
  return typeof candidate.enabled === "boolean" && typeof candidate.status === "string";
}
