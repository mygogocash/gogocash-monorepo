"use client";

import type { TierDefinition } from "../utils/scoreCalculator";
import {
  TIERS,
  getNextTierKey,
  getNextTierThreshold,
  getTierProgressRatio,
} from "../utils/scoreCalculator";
import { useTranslations } from "next-intl";

type ProgressBarProps = {
  score: number;
  tier: TierDefinition;
};

export default function ProgressBar({ score, tier }: ProgressBarProps) {
  const t = useTranslations("creditScore");
  const nextKey = getNextTierKey(tier.key);
  const nextThreshold = getNextTierThreshold(score);
  const ratio = getTierProgressRatio(score);

  if (nextKey == null || nextThreshold == null) return null;

  const pct = Math.round(ratio * 100);
  const fillClass =
    nextKey === "diamond"
      ? "bg-gradient-to-r from-[var(--gc-primary)] to-amber-400"
      : "bg-[var(--gc-primary)]";

  return (
    <div className="overflow-hidden rounded-[var(--gc-radius-md)] border border-[var(--gc-border)] bg-[var(--gc-surface)] shadow-[var(--gc-shadow)]">
      <div className="h-1 w-full bg-[var(--gc-primary-soft)]" aria-hidden />
      <div className="p-5 sm:p-6">
        <p className="mb-3 text-center text-sm font-semibold text-[var(--gc-text)]">
          {t("progressTierRow", {
            currentEmoji: tier.emoji,
            current: t(`tierName_${tier.key}`),
            nextEmoji: TIERS[nextKey].emoji,
            next: t(`tierName_${nextKey}`),
          })}
        </p>
        <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--gc-surface-muted)] ring-1 ring-[var(--gc-border)]">
          <div
            className={`h-full rounded-full transition-[width] duration-500 ease-out ${fillClass}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-3 text-center text-sm font-medium text-[var(--gc-text)]">
          {t("progressLabel", { current: score, max: nextThreshold })}
        </p>
        <p className="mt-1 text-center text-sm text-[var(--gc-text-muted)]">
          {t("progressEncourage", { remaining: nextThreshold - score })}
        </p>
      </div>
    </div>
  );
}
