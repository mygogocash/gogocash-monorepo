"use client";

import type { CSSProperties } from "react";
import type { TierDefinition } from "../utils/scoreCalculator";
import { getTierDotCount } from "../utils/scoreCalculator";
import { useTranslations } from "next-intl";
import { useAnimatedScore } from "./useAnimatedScore";
import TierBadge from "./TierBadge";

type ScoreRingProps = {
  score: number;
  tier: TierDefinition;
  pointsToNext: number | null;
};

export default function ScoreRing({ score, tier, pointsToNext }: ScoreRingProps) {
  const t = useTranslations("creditScore");
  const animated = useAnimatedScore(score, true);
  const filledDots = getTierDotCount(tier.key);
  const isDiamond = tier.key === "diamond";

  return (
    <div
      className={
        isDiamond
          ? "animate-score-shimmer overflow-hidden rounded-[var(--gc-radius-md)] border border-[var(--gc-border-mint)] bg-[var(--gc-surface)] shadow-[var(--gc-shadow)]"
          : "overflow-hidden rounded-[var(--gc-radius-md)] border border-[var(--gc-border)] bg-[var(--gc-surface)] shadow-[var(--gc-shadow)]"
      }
    >
      <div
        className="h-1.5 w-full bg-gradient-to-r from-[var(--gc-primary-strong)] via-[var(--gc-primary)] to-[#38bdf8]"
        aria-hidden
      />
      <div className="p-5 sm:p-6">
        <p className="mb-4 text-center text-sm font-medium text-[var(--gc-text-muted)]">
          {t("heroLabel")}
        </p>
        <div className="flex flex-col items-center gap-2">
          <span className="text-5xl" aria-hidden>
            {tier.emoji}
          </span>
          <span
            className="text-[64px] font-bold leading-none tracking-tight text-[#103522] tabular-nums sm:text-[4.5rem]"
            aria-live="polite"
          >
            {animated}
          </span>
          <div className="flex gap-2 py-2" aria-label={t("tierProgressDotsAria")}>
            {Array.from({ length: 5 }, (_, i) => (
              <span
                key={i}
                className={
                  i < filledDots
                    ? "size-2.5 rounded-full bg-[var(--dot-color)]"
                    : "size-2.5 rounded-full bg-[var(--gc-border)]"
                }
                style={
                  i < filledDots ? ({ "--dot-color": tier.color } as CSSProperties) : undefined
                }
              />
            ))}
          </div>
          <TierBadge tier={tier} />
          {pointsToNext != null ? (
            <p className="mt-1 max-w-sm text-center text-sm leading-snug text-[var(--gc-text-muted)]">
              {t("pointsToNext", {
                points: pointsToNext,
                tier: t(`tierName_${tier.key === "standard" ? "trusted" : "diamond"}`),
              })}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
