"use client";

import type { TierDefinition } from "../utils/scoreCalculator";
import { getNextTierKey, getPointsToNextTier } from "../utils/scoreCalculator";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

type BoostCTAProps = {
  score: number;
  tier: TierDefinition;
};

export default function BoostCTA({ score, tier }: BoostCTAProps) {
  const t = useTranslations("creditScore");
  const points = getPointsToNextTier(score);
  const nextKey = getNextTierKey(tier.key);

  if (points == null || nextKey == null) return null;

  return (
    <div className="rounded-[var(--gc-radius-md)] border border-[var(--gc-border-mint)] bg-[var(--gc-primary-soft)] p-5 sm:p-6">
      <p className="text-center text-base font-semibold text-[#103522]">
        {t("boostTitle", {
          points,
          tier: t(`tierName_${nextKey}`),
        })}
      </p>
      <p className="mt-2 text-center text-sm leading-relaxed text-[var(--gc-text)]">
        {t("boostBody")}
      </p>
      <Link
        href="/"
        className="mt-4 flex h-12 w-full items-center justify-center rounded-xl bg-[var(--gc-primary-strong)] text-base font-semibold text-white no-underline transition-[filter] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gc-primary)]"
      >
        {t("cta_shop")}
      </Link>
    </div>
  );
}
