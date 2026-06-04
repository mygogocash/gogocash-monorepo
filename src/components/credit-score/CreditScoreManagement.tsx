"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCreditScoreAudit,
  getCreditScoreConfig,
  getCreditScoreDetail,
  getCreditScores,
  putCreditScoreConfig,
  putCreditScoreOverride,
} from "@/lib/api/adminModulesApi";
import type {
  CreditScore,
  CreditTier,
  ScoringConfig,
} from "@/types/adminModules";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import Input from "@/components/form/input/InputField";
import { AdminPaginationBar } from "@/components/common/AdminPaginationBar";
import { AdminQueryError } from "@/components/common/AdminQueryError";
import { AdminTableSkeleton } from "@/components/common/AdminTableSkeleton";
import toast from "react-hot-toast";
import { validateBoundedAmount } from "@/lib/formValidation";
import { formatDate, formatDateTime } from "@/lib/dateFormat";
import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/** Metal-themed badge colors per credit tier. */
const CREDIT_TIER_BADGE: Record<CreditTier, string> = {
  bronze:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
  silver: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  gold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200",
  platinum: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200",
};

export default function CreditScoreManagement() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState("");
  const [tierDraft, setTierDraft] = useState("");
  const [minDraft, setMinDraft] = useState("");
  const [maxDraft, setMaxDraft] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    tier: "",
    minScore: "",
    maxScore: "",
  });
  const [userId, setUserId] = useState<string | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [cfgDraft, setCfgDraft] = useState<ScoringConfig | null>(null);
  const [overrideScore, setOverrideScore] = useState("");
  const [overrideReason, setOverrideReason] = useState("support_adjustment");

  const listQ = useQuery({
    queryKey: ["admin", "credit", "list", page, filters],
    queryFn: () =>
      getCreditScores({
        page,
        limit: 10,
        search: filters.search,
        tier: filters.tier || undefined,
        minScore: filters.minScore ? Number(filters.minScore) : undefined,
        maxScore: filters.maxScore ? Number(filters.maxScore) : undefined,
      }),
  });
  const detailQ = useQuery({
    queryKey: ["admin", "credit", "detail", userId],
    queryFn: () => getCreditScoreDetail(userId!),
    enabled: Boolean(userId),
  });
  const auditQ = useQuery({
    queryKey: ["admin", "credit", "audit", userId],
    queryFn: () => getCreditScoreAudit(userId!),
    enabled: Boolean(userId),
  });

  const overrideM = useMutation({
    mutationFn: () =>
      putCreditScoreOverride(userId!, {
        newScore: Number(overrideScore),
        reason: overrideReason,
        adminId: "admin",
      }),
    onSuccess: () => {
      toast.success("Override saved");
      void qc.invalidateQueries({ queryKey: ["admin", "credit"] });
    },
    onError: () => toast.error("Override failed"),
  });

  const saveCfg = useMutation({
    mutationFn: (cfg: ScoringConfig) => putCreditScoreConfig(cfg),
    onSuccess: () => {
      toast.success("Config saved");
      void qc.invalidateQueries({ queryKey: ["admin", "credit"] });
      setConfigOpen(false);
    },
  });

  const submitOverride = () => {
    const err = validateBoundedAmount(overrideScore, "Score", 0, 1000);
    if (err) {
      toast.error(err);
      return;
    }
    void overrideM.mutateAsync();
  };

  const submitConfig = () => {
    if (!cfgDraft) return;
    const weights = [
      cfgDraft.transactionWeight,
      cfgDraft.referralWeight,
      cfgDraft.membershipWeight,
    ];
    if (weights.some((w) => !Number.isFinite(w) || w < 0)) {
      toast.error("Weights must be numbers (0 or greater).");
      return;
    }
    if (
      cfgDraft.tiers.some(
        (t) =>
          !Number.isFinite(t.min) || !Number.isFinite(t.max) || t.min > t.max,
      )
    ) {
      toast.error("Each tier needs a valid min ≤ max.");
      return;
    }
    void saveCfg.mutateAsync(cfgDraft);
  };

  if (listQ.isLoading) return <AdminTableSkeleton />;

  const rows = listQ.data?.data ?? [];

  const exportCsv = () => {
    const header = "userId,userName,email,score,tier,lastUpdated\n";
    const lines = rows
      .map(
        (r) =>
          `${r.userId},${r.userName.replace(/,/g, " ")},${r.email},${r.currentScore},${r.tier},${r.lastUpdated}`,
      )
      .join("\n");
    const blob = new Blob([header + lines], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "credit-scores.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export started");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search…"
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          className="max-w-xs"
        />
        <select
          className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
          value={tierDraft}
          onChange={(e) => setTierDraft(e.target.value)}
        >
          <option value="">All tiers</option>
          {(["bronze", "silver", "gold", "platinum"] as CreditTier[]).map(
            (t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ),
          )}
        </select>
        <Input
          placeholder="Min score"
          className="w-24"
          value={minDraft}
          onChange={(e) => setMinDraft(e.target.value)}
        />
        <Input
          placeholder="Max score"
          className="w-24"
          value={maxDraft}
          onChange={(e) => setMaxDraft(e.target.value)}
        />
        <Button
          size="sm"
          onClick={() => {
            setPage(1);
            setFilters({
              search: searchDraft,
              tier: tierDraft,
              minScore: minDraft,
              maxScore: maxDraft,
            });
          }}
        >
          Apply filters
        </Button>
        <Button size="sm" variant="outline" onClick={exportCsv}>
          Export CSV
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            void (async () => {
              const c = await getCreditScoreConfig();
              setCfgDraft(c);
              setConfigOpen(true);
            })();
          }}
        >
          Scoring config
        </Button>
      </div>

      {listQ.isError ? (
        <AdminQueryError
          title="Could not load credit scores"
          onRetry={() => void listQ.refetch()}
        />
      ) : !rows.length ? (
        <p className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
          No rows for this filter.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Score</th>
                  <th className="px-4 py-3 font-medium">Tier</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {rows.map((r: CreditScore) => (
                  <tr
                    key={r.userId}
                    className="text-gray-800 dark:text-gray-200"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.userName}</div>
                      <div className="text-xs text-gray-500">{r.email}</div>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{r.currentScore}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${CREDIT_TIER_BADGE[r.tier]}`}
                      >
                        {r.tier}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {formatDate(r.lastUpdated)}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setUserId(r.userId)}
                      >
                        Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {listQ.data && (
            <AdminPaginationBar
              page={listQ.data.page}
              totalPages={listQ.data.totalPages}
              total={listQ.data.total}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      <Modal
        isOpen={Boolean(userId)}
        onClose={() => setUserId(null)}
        className="max-h-[90vh] max-w-2xl overflow-y-auto p-6"
      >
        {detailQ.isLoading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : detailQ.data ? (
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                {detailQ.data.userName} — {detailQ.data.currentScore} (
                {detailQ.data.tier})
              </h4>
              <div className="mt-4 h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={detailQ.data.history}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-gray-200 dark:stroke-gray-700"
                    />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
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
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                Factors
              </p>
              <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                {detailQ.data.factors.map((f) => (
                  <li key={f.name}>
                    {f.name}: weight {f.weight} · contribution{" "}
                    {Math.round(f.contribution)}
                  </li>
                ))}
              </ul>
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
                </select>
              </div>
              <Button
                className="mt-3"
                size="sm"
                onClick={submitOverride}
                disabled={!overrideScore}
              >
                Apply override
              </Button>
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Audit</p>
              <div className="mt-2 max-h-40 overflow-y-auto text-xs">
                {(auditQ.data ?? []).map((a, i) => (
                  <div
                    key={i}
                    className="border-b border-gray-100 py-1 dark:border-gray-800"
                  >
                    {formatDateTime(a.timestamp)}: {a.fromScore} → {a.toScore} (
                    {a.reason}) by {a.adminId}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={configOpen}
        onClose={() => setConfigOpen(false)}
        className="max-w-lg p-6"
      >
        {!cfgDraft ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : (
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 dark:text-white">
              Scoring weights (%)
            </h4>
            <label className="text-sm text-gray-600 dark:text-gray-400">
              Transactions
            </label>
            <Input
              type="number"
              value={String(cfgDraft.transactionWeight)}
              onChange={(e) =>
                setCfgDraft({
                  ...cfgDraft,
                  transactionWeight: Number(e.target.value),
                })
              }
            />
            <label className="text-sm text-gray-600 dark:text-gray-400">
              Referrals
            </label>
            <Input
              type="number"
              value={String(cfgDraft.referralWeight)}
              onChange={(e) =>
                setCfgDraft({
                  ...cfgDraft,
                  referralWeight: Number(e.target.value),
                })
              }
            />
            <label className="text-sm text-gray-600 dark:text-gray-400">
              Membership
            </label>
            <Input
              type="number"
              value={String(cfgDraft.membershipWeight)}
              onChange={(e) =>
                setCfgDraft({
                  ...cfgDraft,
                  membershipWeight: Number(e.target.value),
                })
              }
            />
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Tier thresholds
            </p>
            {cfgDraft.tiers.map((t, idx) => (
              <div key={t.name} className="grid grid-cols-3 gap-2 text-xs">
                <span className="py-2 text-gray-600 capitalize dark:text-gray-400">
                  {t.name}
                </span>
                <Input
                  type="number"
                  value={String(t.min)}
                  onChange={(e) => {
                    const tiers = [...cfgDraft.tiers];
                    tiers[idx] = { ...tiers[idx], min: Number(e.target.value) };
                    setCfgDraft({ ...cfgDraft, tiers });
                  }}
                />
                <Input
                  type="number"
                  value={String(t.max)}
                  onChange={(e) => {
                    const tiers = [...cfgDraft.tiers];
                    tiers[idx] = { ...tiers[idx], max: Number(e.target.value) };
                    setCfgDraft({ ...cfgDraft, tiers });
                  }}
                />
              </div>
            ))}
            <Button onClick={submitConfig}>Save config</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
