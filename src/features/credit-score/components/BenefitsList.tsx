"use client";

import type { TierKey } from "../utils/scoreCalculator";
import {
  getActiveBenefitIds,
  getFutureBenefitIds,
  getNextTierExclusiveBenefitIds,
  type BenefitId,
} from "../utils/benefitsCatalog";
import { useTranslations } from "next-intl";

type BenefitsListProps = {
  tierKey: TierKey;
};

function BenefitCard({
  benefitId,
  active,
  coming,
}: {
  benefitId: BenefitId;
  active: boolean;
  coming: boolean;
}) {
  const t = useTranslations("creditScore");
  const title = t(`benefit_${benefitId}`);

  return (
    <div
      className={
        active
          ? "flex flex-wrap items-center justify-between gap-2 rounded-[var(--gc-radius-md)] border border-[var(--gc-border)] bg-[var(--gc-surface)] p-4 shadow-[var(--gc-shadow)]"
          : "flex flex-wrap items-center justify-between gap-2 rounded-[var(--gc-radius-md)] border border-[var(--gc-border)] bg-[var(--gc-surface)] p-4 opacity-55 shadow-[var(--gc-shadow)]"
      }
    >
      <p className="min-w-0 text-sm font-medium text-[var(--gc-text)]">{title}</p>
      {coming ? (
        <span className="shrink-0 rounded-full bg-[var(--gc-surface-muted)] px-2 py-0.5 text-xs font-semibold text-[var(--gc-text-muted)] ring-1 ring-[var(--gc-border)]">
          {t("benefitComing")}
        </span>
      ) : active ? (
        <span className="shrink-0 rounded-full bg-[var(--gc-primary-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--gc-accent)] ring-1 ring-[var(--gc-border-mint)]">
          {t("benefitActive")}
        </span>
      ) : (
        <span className="shrink-0 rounded-full bg-[var(--gc-surface-muted)] px-2 py-0.5 text-xs font-semibold text-[var(--gc-text-muted)] ring-1 ring-[var(--gc-border)]">
          {t("benefitLocked")}
        </span>
      )}
    </div>
  );
}

export default function BenefitsList({ tierKey }: BenefitsListProps) {
  const t = useTranslations("creditScore");
  const activeIds = getActiveBenefitIds(tierKey);
  const lockedNextIds = getNextTierExclusiveBenefitIds(tierKey);
  const futureIds = getFutureBenefitIds();

  return (
    <section className="flex flex-col gap-4" aria-labelledby="benefits-title">
      <h2
        id="benefits-title"
        className="text-lg font-semibold tracking-tight text-[#103522] sm:text-[1.25rem]"
      >
        {t("benefitsTitle")}
      </h2>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--gc-text-muted)]">
          {t("benefitsActiveHeading")}
        </p>
        <ul className="flex flex-col gap-2">
          {activeIds.map((id) => (
            <li key={id}>
              <BenefitCard benefitId={id} active coming={false} />
            </li>
          ))}
        </ul>
      </div>

      {lockedNextIds.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--gc-text-muted)]">
            {t("benefitsUnlockHeading")}
          </p>
          <ul className="flex flex-col gap-2">
            {lockedNextIds.map((id) => (
              <li key={id}>
                <BenefitCard benefitId={id} active={false} coming={false} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--gc-text-muted)]">
          {t("benefitsFutureHeading")}
        </p>
        <ul className="flex flex-col gap-2">
          {futureIds.map((id) => (
            <li key={id}>
              <BenefitCard benefitId={id} active={false} coming />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
