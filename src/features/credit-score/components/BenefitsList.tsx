"use client";

import type { Tier } from "../utils/scoreCalculator";
import { useTranslations } from "next-intl";

type BenefitsListProps = {
  tier: Tier;
};

type BenefitItem = {
  id: string;
  icon: string;
  label: string;
  note?: string;
};

function BenefitCard({
  item,
  active,
  locked,
  coming,
}: {
  item: BenefitItem;
  active: boolean;
  locked: boolean;
  coming: boolean;
}) {
  const t = useTranslations("creditScore");

  return (
    <div
      className={
        active
          ? "flex items-center justify-between gap-3 rounded-[var(--gc-radius-md)] border border-[var(--gc-border)] bg-[var(--gc-surface)] p-4 shadow-[var(--gc-shadow)]"
          : locked
            ? "flex items-center justify-between gap-3 rounded-[var(--gc-radius-md)] border border-[var(--gc-border)] bg-[var(--gc-surface)] p-4 opacity-55 shadow-[var(--gc-shadow)]"
            : "flex items-center justify-between gap-3 rounded-[var(--gc-radius-md)] border border-[var(--gc-border)] bg-[var(--gc-surface)] p-4 shadow-[var(--gc-shadow)]"
      }
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--gc-text)]">
          <span className="mr-2" aria-hidden>
            {item.icon}
          </span>
          {item.label}
        </p>
        {item.note ? (
          <p className="mt-0.5 text-xs text-[var(--gc-text-muted)]">{item.note}</p>
        ) : null}
      </div>
      {coming ? (
        <span className="rounded-full bg-[var(--gc-surface-muted)] px-2 py-0.5 text-xs text-[var(--gc-text-soft)]">
          {t("chipComing")}
        </span>
      ) : active ? (
        <span className="rounded-full bg-[var(--gc-primary-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--gc-accent)]">
          {t("chipActive")}
        </span>
      ) : (
        <span className="text-sm" aria-hidden>
          🔒
        </span>
      )}
    </div>
  );
}

export default function BenefitsList({ tier }: BenefitsListProps) {
  const t = useTranslations("creditScore");
  const starterItems: BenefitItem[] = [
    { id: "starter-cashback", icon: "💰", label: "Cashback on every purchase" },
    { id: "starter-payout", icon: "📦", label: "Standard payout (2–5 days)" },
    { id: "starter-quests", icon: "🎯", label: "Access to all GoGo Quests" },
  ];
  const trustedItems: BenefitItem[] = [
    { id: "trusted-support", icon: "🎧", label: "Priority customer support" },
    { id: "trusted-exclusive-quests", icon: "🎯", label: "Access to Exclusive Quests" },
    {
      id: "trusted-badge",
      icon: "👑",
      label: "Free GoGoPass for 12 months",
      note: "Unlock when you stay Trusted for 3 consecutive months",
    },
  ];
  const comingItems: BenefitItem[] = [
    { id: "future-credit", icon: "💳", label: "Micro-credit access" },
  ];
  const isTrusted = tier.key === "trusted";

  return (
    <section className="flex flex-col gap-4" aria-labelledby="benefits-title">
      <h2 id="benefits-title" className="text-[32px] font-semibold tracking-tight text-[#103522]">
        {t("benefitsTitle")}
      </h2>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--gc-text-muted)]">
          {t("sectionActive")}
        </p>
        <ul className="flex flex-col gap-2">
          {starterItems.map((item) => (
            <li key={item.id}>
              <BenefitCard item={item} active locked={false} coming={false} />
            </li>
          ))}
          {isTrusted
            ? trustedItems.map((item) => (
                <li key={item.id}>
                  <BenefitCard item={item} active locked={false} coming={false} />
                </li>
              ))
            : null}
        </ul>
      </div>

      {!isTrusted ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--gc-text-muted)]">
            {t("sectionLocked")}
          </p>
          <ul className="flex flex-col gap-2">
            {trustedItems.map((item) => (
              <li key={item.id}>
                <BenefitCard item={item} active={false} locked coming={false} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--gc-text-muted)]">
          {t("sectionComing")}
        </p>
        <ul className="flex flex-col gap-2">
          {comingItems.map((item) => (
            <li key={item.id}>
              <BenefitCard item={item} active={false} locked={false} coming />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
