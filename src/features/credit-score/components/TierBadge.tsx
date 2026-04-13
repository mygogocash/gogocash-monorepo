"use client";

import type { TierDefinition } from "../utils/scoreCalculator";
import { useTranslations } from "next-intl";

type TierBadgeProps = {
  tier: TierDefinition;
};

export default function TierBadge({ tier }: TierBadgeProps) {
  const t = useTranslations("creditScore");
  return (
    <span className="text-base font-semibold" style={{ color: tier.color }}>
      {t(`tierName_${tier.key}`)}
    </span>
  );
}
