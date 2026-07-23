"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCreditScoreAudit,
  getCreditScoreDetail,
  putCreditScoreOverride,
} from "@/lib/api/adminModulesApi";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import toast from "react-hot-toast";
import { validateBoundedAmount } from "@/lib/formValidation";
import { formatMonthYear } from "@/lib/dateFormat";
import NoData from "@/components/common/NoData";
import StackedDateTime from "@/components/common/StackedDateTime";
import { CREDIT_TIER_BADGE } from "@/lib/creditTier";
import { usePermissions } from "@/hooks/usePermissions";
import { ROLE_LABELS, roleBadgeClass, type Role } from "@/lib/rbac/roles";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * A single user's credit-score detail — score/tier/updated stat cards, history
 * chart, factors, manual override, and the override audit trail. Self-contained:
 * fetches its own detail + audit by `userId` and owns the override mutation
 * (React Query dedupes the shared keys across mount points). Rendered as the
 * "Scoring" section of the withdraw-detail "Benefits & Scoring" tab.
 */
export default function UserScoringPanel({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { role } = usePermissions();
  const [overrideScore, setOverrideScore] = useState("");
  const [overrideReason, setOverrideReason] = useState("support_adjustment");
  const [customReason, setCustomReason] = useState("");

  const detailQ = useQuery({
    queryKey: ["admin", "credit", "detail", userId],
    queryFn: () => getCreditScoreDetail(userId),
    enabled: Boolean(userId),
  });
  const auditQ = useQuery({
    queryKey: ["admin", "credit", "audit", userId],
    queryFn: () => getCreditScoreAudit(userId),
    enabled: Boolean(userId),
  });

  const overrideM = useMutation({
    mutationFn: () =>
      putCreditScoreOverride(userId, {
        newScore: Number(overrideScore),
        reason:
          overrideReason === "other" ? customReason.trim() : overrideReason,
        adminId: "admin",
      }),
    onSuccess: () => {
      toast.success("Override saved");
      setOverrideScore("");
      setCustomReason("");
      void qc.invalidateQueries({ queryKey: ["admin", "credit"] });
    },
    onError: () =>
      toast.error(
        "Couldn't save the score override. Please try again, or contact an administrator if it continues.",
      ),
  });

  const submitOverride = () => {
    const err = validateBoundedAmount(overrideScore, "Score", 0, 1000);
    if (err) {
      toast.error(err);
      return;
    }
    if (overrideReason === "other" && !customReason.trim()) {
      toast.error("Please enter a reason.");
      return;
    }
    void overrideM.mutateAsync();
  };

  if (detailQ.isLoading) {
    return <p className="text-sm text-gray-500">Loading…</p>;
  }
  if (!detailQ.data) {
    return <NoData>No score data for this user.</NoData>;
  }

  const detail = detailQ.data;
  const history = Array.isArray(detail.history) ? detail.history : [];
  const factors = Array.isArray(detail.factors) ? detail.factors : [];
  const maxContribution = Math.max(1, ...factors.map((f) => f.contribution));
  const tierBadge = CREDIT_TIER_BADGE[detail.tier] ?? CREDIT_TIER_BADGE.bronze;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[245.33px_245.33px]">
        <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900/40">
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300">
            Credit score
          </div>
          <p className="mt-1 text-base font-semibold text-gray-900 dark:text-white">
            {detail.currentScore ?? 0}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900/40">
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300">
            Tier
          </div>
          <div className="mt-1">
            <span
              className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold capitalize ${tierBadge}`}
            >
              {detail.tier ?? "bronze"}
            </span>
          </div>
        </div>
      </div>
      <div>
        <p className="mb-2 font-medium text-gray-900 dark:text-white">
          Score history
        </p>
        {history.length > 0 ? (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={history.slice(-10)}
                margin={{ top: 5, right: 24, bottom: 0, left: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-gray-200 dark:stroke-gray-700"
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  interval={0}
                  tickFormatter={(d) => formatMonthYear(d)}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip labelFormatter={(d) => formatMonthYear(d)} />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <NoData>No score history recorded for this user.</NoData>
        )}
      </div>
      <div>
        <p className="font-medium text-gray-900 dark:text-white">Factors</p>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          Weight = how much each factor counts · contribution = points it added.
        </p>
        {factors.length > 0 ? (
          <div className="mt-3 space-y-3">
            {factors.map((f) => (
              <div key={f.name}>
                <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {f.name}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    weight {Math.round(f.weight * 100)}% ·{" "}
                    <span className="font-semibold text-gray-900 tabular-nums dark:text-white">
                      +{Math.round(f.contribution)} pts
                    </span>
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className="bg-brand-500 h-full rounded-full"
                    style={{
                      width: `${(f.contribution / maxContribution) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <NoData>No score factors recorded for this user.</NoData>
        )}
      </div>
      <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
        <p className="font-medium text-gray-900 dark:text-white">
          Manual override
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Input
            type="number"
            placeholder="New score"
            value={overrideScore}
            onChange={(e) => setOverrideScore(e.target.value)}
          />
          <select
            className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
          >
            <option value="support_adjustment">Support adjustment</option>
            <option value="fraud_review">Fraud review</option>
            <option value="goodwill">Goodwill</option>
            <option value="other">Other reason</option>
          </select>
        </div>
        {overrideReason === "other" && (
          <Input
            className="mt-3"
            placeholder="Type the reason"
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
          />
        )}
        <Button
          className="mt-3"
          size="sm"
          onClick={submitOverride}
          disabled={
            !overrideScore ||
            (overrideReason === "other" && !customReason.trim())
          }
        >
          Apply override
        </Button>
      </div>
      <div>
        <p className="font-medium text-gray-900 dark:text-white">Audit</p>
        <div className="mt-2">
          {(auditQ.data ?? []).length === 0 ? (
            <NoData>No overrides yet.</NoData>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Date
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Change
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Reason
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      By
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {(auditQ.data ?? []).map((a, i) => (
                    <tr key={i} className="text-gray-800 dark:text-gray-200">
                      <td className="px-3 py-3">
                        <StackedDateTime value={a.timestamp} />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap tabular-nums">
                        {a.fromScore} → {a.toScore}
                      </td>
                      <td className="px-3 py-3 capitalize">
                        {a.reason.replace(/_/g, " ")}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span>{a.adminId}</span>
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${roleBadgeClass(role)}`}
                          >
                            {ROLE_LABELS[role as Role] ?? role}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
