"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCreditScoreConfig,
  getCreditScores,
  putCreditScoreConfig,
} from "@/lib/api/adminModulesApi";
import type {
  CreditScore,
  CreditTier,
  ScoringConfig,
} from "@/types/adminModules";
import PrimaryButton from "@/components/ui/button/PrimaryButton";
import SecondaryButton from "@/components/ui/button/SecondaryButton";
import Input from "@/components/form/input/InputField";
import { AdminPaginationBar } from "@/components/common/AdminPaginationBar";
import { AdminQueryError } from "@/components/common/AdminQueryError";
import { AdminTableSkeleton } from "@/components/common/AdminTableSkeleton";
import SupportButton from "@/components/ui/button/SupportButton";
import SortByDropdown from "@/components/ui/button/SortByDropdown";
import SearchBar from "@/components/ui/button/SearchBar";
import toast from "react-hot-toast";
import { formatDate } from "@/lib/dateFormat";
import { CREDIT_TIER_BADGE } from "@/lib/creditTier";
import { useState } from "react";

// Compact numeric filter input (matches the SearchBar/SortByDropdown header style).
const SCORE_INPUT =
  "h-9 w-[72px] rounded-lg border border-gray-300 bg-white px-2 text-xs text-gray-500 placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-400 dark:placeholder:text-gray-500";

// WithdrawDetail-style sub-card (read-only info / editable form share the frame).
const INFO_CARD =
  "rounded-lg border border-gray-200 bg-white/80 p-4 dark:border-gray-700 dark:bg-gray-900/40";
const CARD_HEADING =
  "mb-3 text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400";

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
  // Local edits to the scoring config; falls back to the loaded server config.
  const [cfgEdits, setCfgEdits] = useState<ScoringConfig | null>(null);
  const [editingCfg, setEditingCfg] = useState(false);

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
  const configQ = useQuery({
    queryKey: ["admin", "credit", "config"],
    queryFn: getCreditScoreConfig,
  });
  // Show local edits if any, otherwise the loaded config (no effect needed).
  const cfg = cfgEdits ?? configQ.data ?? null;

  const saveCfg = useMutation({
    mutationFn: (config: ScoringConfig) => putCreditScoreConfig(config),
    onSuccess: () => {
      toast.success("Config saved");
      void qc.invalidateQueries({ queryKey: ["admin", "credit"] });
      setEditingCfg(false);
    },
  });

  const submitConfig = () => {
    if (!cfg) return;
    const weights = [
      cfg.transactionWeight,
      cfg.referralWeight,
      cfg.membershipWeight,
    ];
    if (weights.some((w) => !Number.isFinite(w) || w < 0)) {
      toast.error("Weights must be numbers (0 or greater).");
      return;
    }
    if (
      cfg.tiers.some(
        (t) =>
          !Number.isFinite(t.min) || !Number.isFinite(t.max) || t.min > t.max,
      )
    ) {
      toast.error("Each tier needs a valid min ≤ max.");
      return;
    }
    void saveCfg.mutateAsync(cfg);
  };

  const cancelEdit = () => {
    setCfgEdits(null);
    setEditingCfg(false);
  };

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
      <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Scoring configuration
          </h2>
          {!editingCfg ? (
            <SecondaryButton
              onClick={() => setEditingCfg(true)}
              disabled={!cfg}
            >
              Edit
            </SecondaryButton>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <SecondaryButton onClick={cancelEdit}>Cancel</SecondaryButton>
              <SecondaryButton variant="blue" onClick={submitConfig}>
                Save
              </SecondaryButton>
            </div>
          )}
        </div>

        {!cfg ? (
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Loading…
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className={INFO_CARD}>
              <h4 className={CARD_HEADING}>Scoring weights (%)</h4>
              {editingCfg ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-sm text-gray-600 dark:text-gray-400">
                      Transactions
                    </label>
                    <div className="w-24">
                      <Input
                        type="number"
                        value={String(cfg.transactionWeight)}
                        onChange={(e) =>
                          setCfgEdits({
                            ...cfg,
                            transactionWeight: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-sm text-gray-600 dark:text-gray-400">
                      Referrals
                    </label>
                    <div className="w-24">
                      <Input
                        type="number"
                        value={String(cfg.referralWeight)}
                        onChange={(e) =>
                          setCfgEdits({
                            ...cfg,
                            referralWeight: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-sm text-gray-600 dark:text-gray-400">
                      Membership
                    </label>
                    <div className="w-24">
                      <Input
                        type="number"
                        value={String(cfg.membershipWeight)}
                        onChange={(e) =>
                          setCfgEdits({
                            ...cfg,
                            membershipWeight: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 text-sm">
                  {(
                    [
                      { label: "Transactions", value: cfg.transactionWeight },
                      { label: "Referrals", value: cfg.referralWeight },
                      { label: "Membership", value: cfg.membershipWeight },
                    ] as const
                  ).map((w) => (
                    <div
                      key={w.label}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="text-gray-600 dark:text-gray-400">
                        {w.label}
                      </span>
                      <span className="text-lg font-medium text-gray-900 tabular-nums dark:text-white">
                        {w.value}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={INFO_CARD}>
              <h4 className={CARD_HEADING}>Tier thresholds</h4>
              {editingCfg ? (
                <div className="space-y-2">
                  {cfg.tiers.map((t, idx) => (
                    <div
                      key={t.name}
                      className="grid grid-cols-[5rem_1fr_1fr] items-center gap-2 text-xs"
                    >
                      <span className="text-gray-600 capitalize dark:text-gray-400">
                        {t.name}
                      </span>
                      <Input
                        type="number"
                        value={String(t.min)}
                        onChange={(e) => {
                          const tiers = [...cfg.tiers];
                          tiers[idx] = {
                            ...tiers[idx],
                            min: Number(e.target.value),
                          };
                          setCfgEdits({ ...cfg, tiers });
                        }}
                      />
                      <Input
                        type="number"
                        value={String(t.max)}
                        onChange={(e) => {
                          const tiers = [...cfg.tiers];
                          tiers[idx] = {
                            ...tiers[idx],
                            max: Number(e.target.value),
                          };
                          setCfgEdits({ ...cfg, tiers });
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-1.5 text-sm">
                  {cfg.tiers.map((t) => (
                    <div
                      key={t.name}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="text-gray-600 capitalize dark:text-gray-400">
                        {t.name}
                      </span>
                      <span className="font-medium text-gray-900 tabular-nums dark:text-white">
                        {t.min} – {t.max}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Credit scores
          </h2>
          <div className="flex items-center gap-2">
            <PrimaryButton onClick={exportCsv}>Export CSV</PrimaryButton>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <SearchBar
            placeholder="Search name or email…"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
          />
          <SortByDropdown
            aria-label="Filter by tier"
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
          </SortByDropdown>
          <input
            className={SCORE_INPUT}
            placeholder="Min score"
            value={minDraft}
            onChange={(e) => setMinDraft(e.target.value)}
          />
          <input
            className={SCORE_INPUT}
            placeholder="Max score"
            value={maxDraft}
            onChange={(e) => setMaxDraft(e.target.value)}
          />
          <SecondaryButton
            variant="blue"
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
          </SecondaryButton>
        </div>

        {listQ.isLoading ? (
          <AdminTableSkeleton rows={5} />
        ) : listQ.isError ? (
          <AdminQueryError
            title="Could not load credit scores"
            onRetry={() => void listQ.refetch()}
          />
        ) : !rows.length ? (
          <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            No rows for this filter.
          </p>
        ) : (
          <>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      User
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Score
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Tier
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Updated
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {rows.map((r: CreditScore) => (
                    <tr
                      key={r.userId}
                      className="text-gray-800 dark:text-gray-200"
                    >
                      <td className="px-3 py-3">
                        <div className="font-medium">{r.userName}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {r.email}
                        </div>
                      </td>
                      <td className="px-3 py-3 tabular-nums">
                        {r.currentScore}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${CREDIT_TIER_BADGE[r.tier]}`}
                        >
                          {r.tier}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(r.lastUpdated)}
                      </td>
                      <td className="px-3 py-3">
                        <SupportButton
                          href={`/withdraw/${r.userId}?tab=subscription&section=scoring`}
                        >
                          View
                        </SupportButton>
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
                limit={listQ.data.limit}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </section>
    </div>
  );
}
