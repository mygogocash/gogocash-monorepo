"use client";

import type { MembershipTier } from "@/types/adminModules";
import { formatMoney } from "@/lib/currencyFormat";
import { STATUS_BADGE_BASE } from "@/lib/statusBadge";
import SecondaryButton from "@/components/ui/button/SecondaryButton";

/** Membership tier card (admin) shown on the Membership management page. */
export default function MemberAdminCard({
  tier,
  onEdit,
  onDelete,
}: {
  tier: MembershipTier;
  onEdit: (tier: MembershipTier) => void;
  onDelete: (tier: MembershipTier) => void;
}) {
  return (
    <div
      className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"
      style={{ borderTopColor: tier.color, borderTopWidth: 4 }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {tier.name}
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {tier.description}
          </p>
        </div>
        <span
          className={`${STATUS_BADGE_BASE} ${tier.isActive ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"}`}
        >
          {tier.isActive ? "Active" : "Inactive"}
        </span>
      </div>
      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex items-start justify-between gap-3">
          <dt className="text-gray-500 dark:text-gray-400">Price</dt>
          <dd className="text-right font-medium text-gray-800 dark:text-gray-200">
            <div>{tier.monthlyPrice.toLocaleString()} THB / month</div>
            <div>{tier.annualPrice.toLocaleString()} THB / year</div>
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-gray-500 dark:text-gray-400">Cashback</dt>
          <dd className="font-medium text-gray-800 dark:text-gray-200">
            {tier.cashbackRate}%
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-gray-500 dark:text-gray-400">Monthly cap</dt>
          <dd className="font-medium text-gray-800 dark:text-gray-200">
            {formatMoney(tier.maxCashbackPerMonth)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-gray-500 dark:text-gray-400">Members</dt>
          <dd className="font-medium text-gray-800 dark:text-gray-200">
            {tier.memberCount.toLocaleString()}
          </dd>
        </div>
      </dl>
      <div className="mt-4 flex gap-2">
        <SecondaryButton onClick={() => onEdit(tier)}>Edit</SecondaryButton>
        <SecondaryButton onClick={() => onDelete(tier)}>Delete</SecondaryButton>
      </div>
    </div>
  );
}
