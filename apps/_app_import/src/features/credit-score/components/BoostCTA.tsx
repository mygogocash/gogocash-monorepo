"use client";

import { getPointsToTrusted } from "../utils/scoreCalculator";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

type BoostCTAProps = {
  score: number;
};

export default function BoostCTA({ score }: BoostCTAProps) {
  const t = useTranslations("creditScore");
  const points = getPointsToTrusted(score);
  if (points == null) return null;

  return (
    <section className="rounded-[var(--gc-radius-md)] border border-[var(--gc-border-mint)] bg-[var(--gc-primary-soft)] p-5">
      <p className="text-center text-base font-semibold text-[var(--gc-accent)]">
        {t("boostTitle", { points })}
      </p>
      <p className="mt-2 text-center text-sm leading-relaxed text-[var(--gc-text)]">
        {t("boostBody")}
      </p>
      <Link
        href="/"
        className="mt-4 flex h-12 w-full items-center justify-center rounded-xl bg-[var(--gc-primary-strong)] text-base font-semibold text-white no-underline transition-[filter] hover:brightness-110"
        style={{ color: "#fff" }}
      >
        {t("boostCta")}
      </Link>
    </section>
  );
}
