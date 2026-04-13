"use client";

import type { DiscoverFilters } from "@/features/discover/types";
import { DISCOVER_CASHBACK_OPTIONS, DISCOVER_CATEGORIES } from "@/features/discover/types";
import { cn } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";

export interface DiscoverMobileFilterChipsProps {
  filters: DiscoverFilters;
  onChange: (next: DiscoverFilters) => void;
}

export function DiscoverMobileFilterChips({ filters, onChange }: DiscoverMobileFilterChipsProps) {
  const t = useTranslations();
  const locale = useLocale();
  const isTh = locale.toLowerCase().startsWith("th");

  const categoryLabel = (value: (typeof DISCOVER_CATEGORIES)[number]) =>
    isTh ? value.labelTh : value.label;

  const cashbackLabel = (value: number) => {
    if (value === 0) return t("discoverCashbackAny");
    return t("discoverCashbackPlus", { n: value });
  };

  return (
    <div className="flex flex-col gap-2 lg:hidden">
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {DISCOVER_CATEGORIES.map((cat) => (
          <button
            key={cat.apiCategory || "all"}
            type="button"
            onClick={() => onChange({ ...filters, category: cat.apiCategory })}
            className={cn(
              "shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors",
              filters.category === cat.apiCategory
                ? "border-[var(--gc-primary-strong)] bg-[var(--gc-primary-strong)] text-white"
                : "border-[var(--gc-border)] bg-[var(--gc-surface)] text-[var(--gc-text)] hover:border-[var(--gc-primary-strong)] hover:text-[var(--gc-primary-strong)]"
            )}
          >
            {categoryLabel(cat)}
          </button>
        ))}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {DISCOVER_CASHBACK_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange({ ...filters, minCashback: opt.value })}
            className={cn(
              "shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors",
              filters.minCashback === opt.value
                ? "border-[var(--gc-primary-strong)] bg-[var(--gc-primary-soft)] text-[var(--gc-primary-strong)]"
                : "border-[var(--gc-border)] bg-[var(--gc-surface)] text-[var(--gc-text)] hover:border-[var(--gc-primary-strong)] hover:text-[var(--gc-primary-strong)]"
            )}
          >
            {cashbackLabel(opt.value)}
          </button>
        ))}
      </div>
    </div>
  );
}
