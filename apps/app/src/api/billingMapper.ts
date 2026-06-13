import type { CustomerSubscriptionStatusResponse } from "@mobile/api/billingTypes";

export type SubscriptionStatusView = {
  currentPeriodEnd: string | null;
  /** True when the user holds a live entitlement (don't re-sell the plan). */
  isActive: boolean;
  status: string;
};

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

export function mapSubscriptionStatus(
  response: CustomerSubscriptionStatusResponse
): SubscriptionStatusView {
  return {
    currentPeriodEnd: response.currentPeriodEnd ?? null,
    isActive: response.enabled && ACTIVE_STATUSES.has(response.status),
    status: response.status,
  };
}
