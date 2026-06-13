"use client";

import type { Tier, UserCreditData } from "../utils/scoreCalculator";
import { getScoreBreakdown } from "../utils/scoreCalculator";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

type ScoreBreakdownProps = {
  user: UserCreditData;
  tier: Tier;
};

export default function ScoreBreakdown({ user, tier }: ScoreBreakdownProps) {
  const t = useTranslations("creditScore");
  const rows = getScoreBreakdown(user).map((row) => ({
    ...row,
    label: t(`row_${row.id}`),
    subLabel:
      row.id === "spend"
        ? t("row_spend_sub", {
            amount: Math.max(0, Math.round(user.monthlySpend)).toLocaleString("en-US"),
          })
        : row.id === "transactions"
          ? t("row_transactions_sub", {
              count: Math.max(0, Math.floor(user.monthlyTransactionCount)),
            })
          : row.subLabel,
  }));
  const completeRows = rows.filter((row) => row.isComplete);
  const todoRows = rows.filter((row) => !row.isComplete);

  return (
    <section className="flex flex-col gap-3" aria-labelledby="score-breakdown-title">
      <h2
        id="score-breakdown-title"
        className="text-4xl font-semibold tracking-tight text-[#103522]"
      >
        {tier.key === "trusted" ? t("breakdownTitle_trusted") : t("breakdownTitle_starter")}
      </h2>

      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gc-text-muted)]">
        {t("sectionComplete")}
      </p>
      <ul className="flex flex-col gap-3">
        {completeRows.map((row) => (
          <li
            key={row.id}
            className="rounded-[var(--gc-radius-md)] border border-[var(--gc-border)] bg-[var(--gc-surface)] p-4 shadow-[var(--gc-shadow)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--gc-text)]">✅ {row.label}</p>
                {row.subLabel ? (
                  <p className="mt-0.5 text-sm text-[var(--gc-text-muted)]">{row.subLabel}</p>
                ) : null}
              </div>
              <span className="text-sm font-semibold text-[var(--gc-accent)]">
                +{row.maxPts} pts
              </span>
            </div>
          </li>
        ))}
      </ul>

      {todoRows.length > 0 ? (
        <>
          <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-[var(--gc-text-muted)]">
            {t("sectionTodo")}
          </p>
          <ul className="flex flex-col gap-3">
            {todoRows.map((row) => (
              <li
                key={row.id}
                className="rounded-[var(--gc-radius-md)] border border-[var(--gc-border)] bg-[var(--gc-surface-muted)] p-4 shadow-[var(--gc-shadow)]"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--gc-text)]">🔒 {row.label}</p>
                    {row.subLabel ? (
                      <p className="mt-0.5 text-sm text-[var(--gc-text-muted)]">{row.subLabel}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--gc-accent)]">
                      +{row.maxPts} pts
                    </span>
                    {row.ctaLabel && row.ctaHref ? (
                      <Link
                        href={row.ctaHref}
                        className="inline-flex h-11 items-center rounded-full border border-[var(--gc-primary)] bg-white px-3 text-xs font-semibold text-[var(--gc-accent)] no-underline"
                      >
                        {row.id === "email"
                          ? t("ctaVerifyEmail")
                          : row.id === "phone"
                            ? t("ctaVerifyPhone")
                            : row.id === "profile"
                              ? t("ctaCompleteProfile")
                              : t("boostCta")}
                      </Link>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
