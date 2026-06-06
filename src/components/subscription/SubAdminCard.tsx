"use client";

import type { SubscriptionPlan } from "@/types/adminModules";
import { formatMoney } from "@/lib/currencyFormat";
import { STATUS_BADGE_BASE } from "@/lib/statusBadge";
import SecondaryButton from "@/components/ui/button/SecondaryButton";

/** Colored top-border accent per billing cycle (mirrors Membership tier colors). */
const PLAN_ACCENT: Record<SubscriptionPlan["billingCycle"], string> = {
  monthly: "#3b82f6", // blue-500
  quarterly: "#f59e0b", // amber-500
  annual: "#8b5cf6", // violet-500
};

/** Status pill colors (same palette as the Membership status badge). */
const PLAN_STATUS_BADGE: Record<SubscriptionPlan["status"], string> = {
  active:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  draft: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  archived: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
};

/** Per-cycle unit word for the price line ("149 THB / month"). */
const CYCLE_UNIT: Record<SubscriptionPlan["billingCycle"], string> = {
  monthly: "month",
  quarterly: "quarter",
  annual: "year",
};

/** Subscription plan card (admin) shown on the Subscription management page. */
export default function SubAdminCard({
  plan,
  onEdit,
  onDelete,
}: {
  plan: SubscriptionPlan;
  onEdit: (plan: SubscriptionPlan) => void;
  onDelete: (plan: SubscriptionPlan) => void;
}) {
  return (
    <div
      className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"
      style={{
        borderTopColor: PLAN_ACCENT[plan.billingCycle],
        borderTopWidth: 4,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {plan.name}
          </h3>
          <p className="mt-1 text-sm text-gray-600 capitalize dark:text-gray-400">
            {plan.billingCycle} plan
          </p>
        </div>
        <span
          className={`${STATUS_BADGE_BASE} ${PLAN_STATUS_BADGE[plan.status]}`}
        >
          {plan.status}
        </span>
      </div>
      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-gray-500 dark:text-gray-400">Price</dt>
          <dd className="font-medium text-gray-800 dark:text-gray-200">
            {formatMoney(plan.price)} / {CYCLE_UNIT[plan.billingCycle]}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-gray-500 dark:text-gray-400">Trial</dt>
          <dd className="font-medium text-gray-800 dark:text-gray-200">
            {plan.trialDays} days
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-gray-500 dark:text-gray-400">Grace period</dt>
          <dd className="font-medium text-gray-800 dark:text-gray-200">
            {plan.gracePeriodDays} days
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-gray-500 dark:text-gray-400">Subscribers</dt>
          <dd className="font-medium text-gray-800 dark:text-gray-200">
            {plan.subscriberCount.toLocaleString()}
          </dd>
        </div>
      </dl>
      <div className="mt-4 flex gap-2">
        <SecondaryButton onClick={() => onEdit(plan)}>Edit</SecondaryButton>
        <SecondaryButton onClick={() => onDelete(plan)}>Delete</SecondaryButton>
      </div>
    </div>
  );
}
