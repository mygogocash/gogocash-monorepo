"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCreditScoreConfig } from "@/lib/api/adminModulesApi";
import PrimaryButton from "@/components/ui/button/PrimaryButton";
import { Modal } from "@/components/ui/modal";

const INFO_CARD =
  "rounded-lg border border-gray-200 bg-white/80 p-4 dark:border-gray-700 dark:bg-gray-900/40";
const CARD_HEADING =
  "mb-3 text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400";
const ROW = "flex items-center justify-between gap-2";
const ROW_LABEL = "text-gray-600 dark:text-gray-400";
const ROW_VALUE = "font-medium text-gray-900 tabular-nums dark:text-white";

/**
 * A button that opens a read-only popup of the global scoring configuration
 * (weights + tier thresholds) for a quick reference. View-only — editing lives
 * on the Credit Score admin page. The config query shares its key with that
 * page, so React Query dedupes/caches it.
 */
export default function ScoringConfigQuickView() {
  const [open, setOpen] = useState(false);
  const configQ = useQuery({
    queryKey: ["admin", "credit", "config"],
    queryFn: getCreditScoreConfig,
    enabled: open,
  });
  const cfg = configQ.data;

  return (
    <>
      <PrimaryButton onClick={() => setOpen(true)}>
        Scoring configuration
      </PrimaryButton>
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        className="max-w-2xl p-6"
      >
        <h4 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Scoring configuration
        </h4>
        {!cfg ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className={INFO_CARD}>
              <h4 className={CARD_HEADING}>Scoring weights (%)</h4>
              <div className="space-y-1.5 text-sm">
                {(
                  [
                    { label: "Transactions", value: cfg.transactionWeight },
                    { label: "Referrals", value: cfg.referralWeight },
                    { label: "Membership", value: cfg.membershipWeight },
                  ] as const
                ).map((w) => (
                  <div key={w.label} className={ROW}>
                    <span className={ROW_LABEL}>{w.label}</span>
                    <span className={`text-lg ${ROW_VALUE}`}>{w.value}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div className={INFO_CARD}>
              <h4 className={CARD_HEADING}>Tier thresholds</h4>
              <div className="space-y-1.5 text-sm">
                {cfg.tiers.map((t) => (
                  <div key={t.name} className={ROW}>
                    <span className={`${ROW_LABEL} capitalize`}>{t.name}</span>
                    <span className={ROW_VALUE}>
                      {t.min} – {t.max}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
