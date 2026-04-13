"use client";

import type { DiscoverFilters } from "@/features/discover/types";
import { DISCOVER_CASHBACK_OPTIONS, DISCOVER_CATEGORIES } from "@/features/discover/types";
import { cn } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";

export interface DiscoverSidebarProps {
  filters: DiscoverFilters;
  onChange: (next: DiscoverFilters) => void;
}

export function DiscoverSidebar({ filters, onChange }: DiscoverSidebarProps) {
  const t = useTranslations();
  const locale = useLocale();

  const categoryLabel = (value: (typeof DISCOVER_CATEGORIES)[number]) =>
    locale.toLowerCase().startsWith("th") ? value.labelTh : value.label;

  const cashbackLabel = (value: number) => {
    if (value === 0) return t("discoverCashbackAny");
    return t("discoverCashbackPlus", { n: value });
  };

  const filterRowClass = (active: boolean) =>
    cn(
      "w-full rounded-2xl px-4 py-3 text-left text-base font-medium transition-colors",
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gc-primary-strong)]",
      active
        ? "bg-[var(--gc-primary-strong)] text-white"
        : "bg-transparent text-[var(--gc-text)] hover:bg-[var(--gc-primary-soft)] hover:text-[var(--gc-primary-strong)]"
    );

  return (
    <aside className="sticky top-[80px] hidden w-full shrink-0 self-start lg:block lg:w-[280px] lg:max-w-[280px]">
      <div className="flex flex-col gap-4 rounded-[var(--gc-radius-lg)] border border-[var(--gc-border)] bg-[#fafafa] p-6 shadow-[var(--gc-shadow)]">
        <p className="gc-kicker">{t("discoverSectionAllCategories")}</p>
        <nav className="flex flex-col gap-2" aria-label={t("discoverSectionAllCategories")}>
          {DISCOVER_CATEGORIES.map((cat) => (
            <button
              key={cat.value || "all"}
              type="button"
              onClick={() => onChange({ ...filters, category: cat.value })}
              className={filterRowClass(filters.category === cat.value)}
            >
              {categoryLabel(cat)}
            </button>
          ))}
        </nav>

        <div className="h-px w-full shrink-0 border-0 border-t border-[var(--gc-border)]" aria-hidden />

        <p className="gc-kicker">{t("discoverSectionCashbackRate")}</p>
        <div className="flex flex-col gap-2" role="group" aria-label={t("discoverSectionCashbackRate")}>
          {DISCOVER_CASHBACK_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ ...filters, minCashback: opt.value })}
              className={filterRowClass(filters.minCashback === opt.value)}
            >
              {cashbackLabel(opt.value)}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
