"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import toast from "react-hot-toast";
import { formatDate } from "@/lib/dateFormat";
import { STATUS_BADGE_BASE } from "@/lib/statusBadge";
import { putMembershipUserAction } from "@/lib/api/adminModulesApi";
import type { MembershipTier, UserMembership } from "@/types/adminModules";

/** Membership benefit card (any tier) shown on the user detail "Benefits" tab. */
export default function MemberUserCard({
  membership,
  tier,
  withdrawUserId,
}: {
  membership: UserMembership | null;
  tier?: MembershipTier;
  withdrawUserId: string;
}) {
  const queryClient = useQueryClient();
  const [editingNextBilling, setEditingNextBilling] = useState(false);
  const [nextBillingDraft, setNextBillingDraft] = useState("");
  const act = useMutation({
    mutationFn: ({
      userId,
      action,
      days,
    }: {
      userId: string;
      action: "cancel" | "pause" | "resume" | "extend";
      days?: number;
    }) =>
      putMembershipUserAction(
        userId,
        action,
        action === "extend" ? { days } : undefined,
      ),
    onSuccess: () => {
      toast.success("Membership updated");
      void queryClient.invalidateQueries({
        queryKey: ["admin", "membership", "withdraw-detail", withdrawUserId],
      });
    },
  });
  const runAction = (action: string) => {
    if (!membership) return;
    if (action === "extend") {
      setNextBillingDraft(membership.expiryDate);
      setEditingNextBilling(true);
    } else if (action === "cancel") {
      if (confirm("Cancel membership?")) {
        void act.mutateAsync({ userId: membership.userId, action: "cancel" });
      }
    } else if (action === "pause" || action === "resume") {
      void act.mutateAsync({ userId: membership.userId, action });
    }
  };
  const saveNextBilling = () => {
    if (!membership || !nextBillingDraft) return;
    const days = Math.round(
      (new Date(nextBillingDraft).getTime() -
        new Date(membership.expiryDate).getTime()) /
        86400000,
    );
    if (days !== 0) {
      void act.mutateAsync({
        userId: membership.userId,
        action: "extend",
        days,
      });
    }
    setEditingNextBilling(false);
  };

  return (
    <div
      className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"
      style={
        membership
          ? { borderTopColor: tier?.color ?? "#7c3aed", borderTopWidth: 4 }
          : undefined
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {membership ? membership.tierName : "Membership"}
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Membership
          </p>
        </div>
        {membership && (
          <span
            className={`${STATUS_BADGE_BASE} ${
              membership.status === "active"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                : membership.status === "pending"
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                  : membership.status === "cancelled"
                    ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
            }`}
          >
            {membership.status}
          </span>
        )}
      </div>
      {membership ? (
        <dl className="mt-3 space-y-1.5 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-gray-500 dark:text-gray-400">Period</dt>
            <dd className="font-medium text-gray-800 dark:text-gray-200">
              {formatDate(membership.startDate)} to{" "}
              {formatDate(membership.expiryDate)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-gray-500 dark:text-gray-400">Next billing</dt>
            <dd className="font-medium text-gray-800 dark:text-gray-200">
              {editingNextBilling ? (
                <span className="flex items-center gap-1">
                  <input
                    type="date"
                    value={nextBillingDraft}
                    onChange={(e) => setNextBillingDraft(e.target.value)}
                    className="rounded border border-gray-300 px-1 py-0.5 text-xs dark:border-gray-600 dark:bg-gray-900"
                  />
                  <button
                    type="button"
                    onClick={saveNextBilling}
                    className="text-brand-600 dark:text-brand-400 text-xs font-medium"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingNextBilling(false)}
                    className="text-xs text-gray-500 dark:text-gray-400"
                  >
                    Cancel
                  </button>
                </span>
              ) : membership.autoRenew ? (
                formatDate(membership.expiryDate)
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-gray-500 dark:text-gray-400">Auto-renew</dt>
            <dd className="font-medium text-gray-800 dark:text-gray-200">
              {membership.autoRenew ? (
                <span className="text-blue-600 dark:text-blue-400">Yes</span>
              ) : (
                "No"
              )}
            </dd>
          </div>
          {tier && (
            <>
              <div className="border-t border-gray-100 pt-1.5 dark:border-gray-700" />
              <div className="flex items-center justify-between gap-3">
                <dt className="text-gray-500 dark:text-gray-400">Cashback</dt>
                <dd className="font-medium text-gray-800 dark:text-gray-200">
                  {tier.cashbackRate}%
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-gray-500 dark:text-gray-400">
                  Monthly cap
                </dt>
                <dd className="font-medium text-gray-800 dark:text-gray-200">
                  {tier.maxCashbackPerMonth.toLocaleString()} THB
                </dd>
              </div>
            </>
          )}
        </dl>
      ) : (
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          No membership.
        </p>
      )}
      <div className="mt-4 flex items-center justify-between gap-2">
        <Link
          href="/membership"
          className="text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 text-sm font-medium"
        >
          Open membership admin →
        </Link>
        {membership && (
          <select
            className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 shadow-sm transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
            value=""
            onChange={(e) => runAction(e.target.value)}
            disabled={act.isPending}
          >
            <option value="" disabled hidden>
              Actions
            </option>
            <option value="pause">Pause</option>
            <option value="resume">Resume</option>
            <option value="extend">Add days</option>
            <option value="cancel">Cancel</option>
          </select>
        )}
      </div>
    </div>
  );
}
