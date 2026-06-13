"use client";

import type { Tier } from "../utils/scoreCalculator";
import { TIERS } from "../utils/scoreCalculator";
import { useTranslations } from "next-intl";
import { useAnimatedScore } from "./useAnimatedScore";

type ScoreHeroProps = {
  score: number;
  tier: Tier;
};

export default function ScoreHero({ score, tier }: ScoreHeroProps) {
  const t = useTranslations("creditScore");
  const animated = useAnimatedScore(score, true);
  const pointsToTrusted = Math.max(0, TIERS.trusted.min - score);
  const isTrusted = tier.key === "trusted";

  return (
    <section
      className={`overflow-hidden rounded-[var(--gc-radius-md)] border bg-[var(--gc-surface)] p-5 shadow-[var(--gc-shadow)] ${
        isTrusted
          ? "border-[var(--gc-border-mint)] ring-2 ring-[var(--gc-border-mint)]"
          : "border-[var(--gc-border)]"
      }`}
    >
      <div className="mx-[-1.25rem] mt-[-1.25rem] mb-4 h-1.5 bg-[var(--gc-primary)]" aria-hidden />
      <p className="text-center text-sm text-[var(--gc-text-muted)]">{t("heroLabel")}</p>
      <div className="mt-3 flex flex-col items-center">
        <span className="text-5xl" aria-hidden>
          {tier.emoji}
        </span>
        <p
          className="text-7xl font-black leading-none text-[#103522] tabular-nums"
          aria-live="polite"
        >
          {animated}
        </p>
      </div>
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[var(--gc-surface-muted)]">
        <div
          className="h-full bg-gradient-to-r from-[var(--gc-primary-strong)] to-[var(--gc-primary)] transition-[width] duration-500"
          style={{ width: `${score}%` }}
        />
      </div>
      <p
        className={`mt-4 text-center text-lg font-semibold ${
          isTrusted ? "text-[#6c5ce7]" : "text-[var(--gc-accent)]"
        }`}
      >
        {isTrusted ? t("tierTrusted") : t("tierStarter")}
      </p>
      <p className="mt-1 text-center text-sm text-[var(--gc-text-muted)]">
        {isTrusted ? t("alreadyTrusted") : t("pointsToTrusted", { points: pointsToTrusted })}
      </p>
    </section>
  );
}
