"use client";

import { TIERS, getPointsToTrusted } from "../utils/scoreCalculator";
import { useTranslations } from "next-intl";

type ProgressBarProps = {
  score: number;
};

export default function ProgressBar({ score }: ProgressBarProps) {
  const t = useTranslations("creditScore");
  const points = getPointsToTrusted(score);
  if (points == null) return null;
  const pct = Math.min(100, Math.max(0, (score / TIERS.trusted.min) * 100));

  return (
    <section className="rounded-[var(--gc-radius-md)] border border-[var(--gc-border)] bg-[var(--gc-surface)] p-5 shadow-[var(--gc-shadow)]">
      <p className="mb-3 text-center text-base font-semibold text-[var(--gc-accent)]">
        {`⭐ ${t("tierStarter")} — 💜 ${t("tierTrusted")}`}
      </p>
      <div className="h-3 w-full rounded-full bg-[var(--gc-surface-muted)] ring-1 ring-[var(--gc-border)]">
        <div
          className="h-3 rounded-full bg-gradient-to-r from-[var(--gc-primary-strong)] to-[var(--gc-primary)] transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-3 text-center text-base font-semibold text-[var(--gc-text)]">
        {t("progressLabel", { current: score })}
      </p>
      <p className="mt-1 text-center text-sm text-[var(--gc-text-muted)]">
        {points <= 8 ? t("progressEncourage") : t("pointsToTrusted", { points })}
      </p>
    </section>
  );
}
