"use client";

import type { CreditScoreInput, ScoreBreakdownRow } from "../utils/scoreCalculator";
import { getScoreBreakdown } from "../utils/scoreCalculator";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

type ScoreBreakdownProps = {
  user: CreditScoreInput;
  isDiamondTier: boolean;
};

function ctaForRow(
  id: ScoreBreakdownRow["id"]
): { href: string; labelKey: "cta_verify" | "cta_complete" | "cta_shop" } | null {
  switch (id) {
    case "transactions":
      return { href: "/", labelKey: "cta_shop" };
    case "phone":
      return { href: "/profile/verify-phone", labelKey: "cta_verify" };
    case "email":
      return { href: "/profile/info", labelKey: "cta_verify" };
    case "profile":
      return { href: "/profile/info", labelKey: "cta_complete" };
    default:
      return null;
  }
}

const rowBase =
  "flex flex-col gap-2 rounded-[var(--gc-radius-md)] border p-4 shadow-[var(--gc-shadow)] sm:flex-row sm:items-center sm:justify-between";
const rowComplete = `${rowBase} border-[var(--gc-border)] bg-[var(--gc-surface)]`;
const rowIncomplete = `${rowBase} border-[var(--gc-border)] bg-[var(--gc-surface-muted)]`;

export default function ScoreBreakdown({ user, isDiamondTier }: ScoreBreakdownProps) {
  const t = useTranslations("creditScore");
  const rows = getScoreBreakdown(user);

  return (
    <section className="flex flex-col gap-3" aria-labelledby="score-breakdown-title">
      <h2
        id="score-breakdown-title"
        className="text-lg font-semibold tracking-tight text-[#103522] sm:text-[1.25rem]"
      >
        {isDiamondTier ? t("breakdownTitle_complete") : t("breakdownTitle_incomplete")}
      </h2>
      <ul className="flex flex-col gap-3">
        {rows.map((row) => {
          const maybeCta = ctaForRow(row.id);
          const cta = !row.isComplete && maybeCta ? maybeCta : null;
          const earnedDisplay =
            row.earnedPts === Math.floor(row.earnedPts)
              ? String(row.earnedPts)
              : row.earnedPts.toFixed(1);

          return (
            <li key={row.id} className={row.isComplete ? rowComplete : rowIncomplete}>
              <div className="flex min-w-0 items-start gap-3">
                <span className="shrink-0 text-xl leading-none" aria-hidden>
                  {row.isComplete ? "\u2705" : "\u{1F512}"}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--gc-text)]">
                    {t(`row_${row.id}`)}
                  </p>
                  {row.id === "transactions" && row.transactionCount != null ? (
                    <p className="mt-0.5 text-sm text-[var(--gc-text-muted)]">
                      {t("row_transactions_sub", { count: row.transactionCount })}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                <span className="text-sm font-semibold tabular-nums text-[var(--gc-text)]">
                  {row.isComplete
                    ? `+${row.maxPts} ${t("ptsSuffix")}`
                    : `+${earnedDisplay} / ${row.maxPts} ${t("ptsSuffix")}`}
                </span>
                {cta ? (
                  <Link
                    href={cta.href}
                    className="inline-flex min-h-10 items-center justify-center rounded-full bg-[var(--gc-primary-strong)] px-4 py-2 text-sm font-semibold text-white no-underline transition-[filter] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gc-primary)]"
                  >
                    {t(cta.labelKey)}
                  </Link>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
