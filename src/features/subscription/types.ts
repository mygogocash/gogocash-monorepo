export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "none";

export type PlanId = "thb_monthly_49" | "thb_annual_490";

export interface SubscriptionState {
  status: SubscriptionStatus;
  planId: PlanId | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}
