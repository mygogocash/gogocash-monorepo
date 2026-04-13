"use client";

import { ShopExploreMenuTapIcon } from "@/components/nav/ShopExploreMenuTapIcon";
import type { DiscoverFilters } from "@/features/discover/types";
import { DISCOVER_CATEGORIES } from "@/features/discover/types";
import { cn } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";

/** Align with `ShopExploreCategoryAside` — Figma 8123:68218 */
const asideDesktopRow =
  "lg:grid lg:h-[52px] lg:max-h-[52px] lg:w-full lg:grid-cols-[24px_minmax(0,1fr)] lg:items-center lg:gap-4 lg:rounded-2xl lg:p-4 lg:text-base lg:leading-normal";

const asideCategoryIconCell =
  "flex size-5 shrink-0 items-center justify-center self-center overflow-hidden lg:size-6";

function rowClassName(active: boolean) {
  return cn(
    "group flex w-full items-center text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00aa80]",
    "max-lg:h-10 max-lg:shrink-0 max-lg:gap-2 max-lg:rounded-lg max-lg:px-4 max-lg:py-1 max-lg:text-sm max-lg:leading-normal",
    asideDesktopRow,
    active
      ? "bg-[#00aa80] text-white visited:text-white max-lg:font-normal lg:font-medium lg:hover:bg-[#00aa80]"
      : cn(
          "bg-transparent font-normal text-[#3b3b3b]",
          "max-lg:hover:bg-[#d8f8ef] max-lg:hover:text-[#00aa80]",
          "lg:hover:bg-[#d8f8ef] lg:hover:text-[#00aa80]"
        )
  );
}

export interface DiscoverSidebarProps {
  filters: DiscoverFilters;
  onChange: (next: DiscoverFilters) => void;
}

export function DiscoverSidebar({ filters, onChange }: DiscoverSidebarProps) {
  const t = useTranslations();
  const locale = useLocale();

  const categoryLabel = (value: (typeof DISCOVER_CATEGORIES)[number]) =>
    locale.toLowerCase().startsWith("th") ? value.labelTh : value.label;

  return (
    <aside className="sticky top-[80px] hidden w-full shrink-0 self-start lg:block lg:w-[280px] lg:max-w-[280px]">
      <div
        className={cn(
          "flex w-full shrink-0 flex-col gap-4 rounded-[24px]",
          "border border-[#e4e4e4] bg-[#fafafa] p-6"
        )}
      >
        <div className="flex w-full items-center lg:h-6 lg:min-h-6">
          <h3 className="text-xl font-semibold leading-none text-[#3b3b3b] lg:text-2xl lg:leading-none lg:text-[#005d46]">
            {t("discoverSectionAllCategories")}
          </h3>
        </div>
        <div
          className="hidden h-px w-full shrink-0 border-0 border-t border-[#e4e4e4] lg:block"
          aria-hidden
        />
        <nav
          className={cn(
            "flex w-full gap-2",
            "max-lg:flex-row max-lg:flex-nowrap max-lg:overflow-x-auto max-lg:border-b max-lg:border-[#e4e4e4] max-lg:pb-2 max-lg:[scrollbar-width:none] [&::-webkit-scrollbar]:max-lg:hidden",
            "lg:flex-col lg:gap-2 lg:overflow-visible lg:border-0 lg:pb-0"
          )}
          aria-label={t("discoverSectionAllCategories")}
        >
          {DISCOVER_CATEGORIES.map((cat) => {
            const active = filters.category === cat.apiCategory;
            const isAll = cat.apiCategory === "";

            return (
              <button
                key={cat.apiCategory || "all"}
                type="button"
                onClick={() => onChange({ ...filters, category: cat.apiCategory })}
                className={rowClassName(active)}
              >
                <span
                  className={cn(
                    asideCategoryIconCell,
                    active ? "text-white" : "text-[#005D46] group-hover:text-[#00aa80]"
                  )}
                  aria-hidden
                >
                  {isAll ? (
                    <ShopExploreMenuTapIcon variant="all" />
                  ) : (
                    <ShopExploreMenuTapIcon variant="category" categoryIndex={cat.tapIndex} />
                  )}
                </span>
                <span
                  className={cn(
                    "line-clamp-1 min-w-0 flex-1 self-center whitespace-normal text-left leading-none max-lg:whitespace-nowrap lg:min-w-0 lg:leading-normal",
                    active && "text-white visited:text-white"
                  )}
                >
                  {categoryLabel(cat)}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
