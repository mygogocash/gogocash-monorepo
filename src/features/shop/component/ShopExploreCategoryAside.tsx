"use client";

import { ShopExploreMenuTapIcon } from "@/components/nav/ShopExploreMenuTapIcon";
import { Link } from "@/i18n/navigation";
import { cn, pathImage } from "@/lib/utils";
import { trackCategorySelect } from "@/lib/analytics";
import { useTranslations } from "next-intl";
import {
  normalizeCategoryKey,
  type ShopExploreCategoryRow,
} from "@/features/shop/shopExploreCategoryMenu";

/** Figma 8123:68218 — desktop row: 52px height, 16px padding & radius, 16px gap icon→label */
const asideDesktopRow =
  "lg:grid lg:h-[52px] lg:max-h-[52px] lg:w-full lg:grid-cols-[24px_minmax(0,1fr)] lg:items-center lg:gap-4 lg:rounded-2xl lg:p-4 lg:text-base lg:leading-normal";

/** Fixed 24×24 (20×20 mobile) icon column so All + category thumbnails share one alignment axis */
const asideCategoryIconCell =
  "flex size-5 shrink-0 items-center justify-center self-center overflow-hidden lg:size-6";

function rowClassName(active: boolean) {
  return cn(
    "group flex items-center text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00aa80]",
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

export type ShopExploreCategoryAsideMode =
  | {
      mode: "inPageFilter";
      onSelectCategory: (filterName: string) => void;
    }
  | {
      mode: "navigate";
      allHref: string;
      categoryHref: (filterName: string) => string;
    };

function categoryRowActive(
  activeCategory: string,
  filterName: string,
  mode: "exact" | "normalized"
): boolean {
  if (mode === "exact") return activeCategory === filterName;
  return normalizeCategoryKey(activeCategory) === normalizeCategoryKey(filterName);
}

export default function ShopExploreCategoryAside({
  categoryMenuRows,
  activeCategory,
  activeCategoryMatch = "exact",
  asideMode,
}: {
  categoryMenuRows: ShopExploreCategoryRow[];
  activeCategory: string;
  /** Use `normalized` on `/category/[name]` when the URL segment should match API names case-insensitively. */
  activeCategoryMatch?: "exact" | "normalized";
  asideMode: ShopExploreCategoryAsideMode;
}) {
  const t = useTranslations();

  const allActive = activeCategory === "";

  const allRow = (
    <>
      <span
        className={cn(
          asideCategoryIconCell,
          allActive ? "text-white" : "text-[#005D46] group-hover:text-[#00aa80]"
        )}
        aria-hidden
      >
        <ShopExploreMenuTapIcon variant="all" />
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 whitespace-nowrap leading-none lg:min-w-0 lg:leading-normal",
          allActive && "text-white visited:text-white"
        )}
      >
        {t("shopCategoryAll")}
      </span>
    </>
  );

  return (
    <aside
      className={cn(
        "flex w-full shrink-0 flex-col gap-4 rounded-[24px]",
        "lg:w-[280px] lg:max-w-[280px] lg:gap-4 lg:border lg:border-[#e4e4e4] lg:bg-[#fafafa] lg:p-6"
      )}
    >
      <div className="flex w-full items-center lg:h-6 lg:min-h-6">
        <h3 className="text-xl font-semibold leading-none text-[#3b3b3b] lg:text-2xl lg:leading-none lg:text-[#005d46]">
          {t("shopCategoriesHeading")}
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
        aria-label={t("shopCategoriesHeading")}
      >
        {asideMode.mode === "navigate" ? (
          <Link href={asideMode.allHref} className={cn(rowClassName(allActive), "no-underline")}>
            {allRow}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => asideMode.onSelectCategory("")}
            className={rowClassName(allActive)}
          >
            {allRow}
          </button>
        )}

        {categoryMenuRows.map((row) => {
          const active = categoryRowActive(activeCategory, row.filterName, activeCategoryMatch);
          const rowInner = (
            <>
              <span
                className={cn(
                  asideCategoryIconCell,
                  active ? "text-white" : "text-[#005D46] group-hover:text-[#00aa80]"
                )}
                aria-hidden
              >
                {row.tapIconIndex != null ? (
                  <ShopExploreMenuTapIcon variant="category" categoryIndex={row.tapIconIndex} />
                ) : (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element -- API category art */}
                    <img
                      src={row.image ? pathImage(row.image) : "/home/banner.webp"}
                      alt=""
                      width={24}
                      height={24}
                      className={cn(
                        "block h-full w-full object-contain object-center",
                        active && "brightness-0 invert"
                      )}
                    />
                  </>
                )}
              </span>
              <span
                className={cn(
                  "line-clamp-1 min-w-0 flex-1 self-center whitespace-normal text-left leading-none max-lg:whitespace-nowrap lg:min-w-0 lg:leading-normal",
                  active && "text-white visited:text-white"
                )}
              >
                {row.menuLabel}
              </span>
            </>
          );

          if (asideMode.mode === "navigate") {
            return (
              <Link
                key={row.rowKey}
                href={asideMode.categoryHref(row.filterName)}
                className={cn(rowClassName(active), "no-underline")}
                onClick={() =>
                  trackCategorySelect({
                    categoryName: row.filterName,
                    source: "category_explore_nav",
                  })
                }
              >
                {rowInner}
              </Link>
            );
          }

          return (
            <button
              key={row.rowKey}
              type="button"
              onClick={() => {
                trackCategorySelect({
                  categoryName: row.filterName,
                  source: "shop_explore",
                });
                asideMode.onSelectCategory(row.filterName);
              }}
              className={rowClassName(active)}
            >
              {rowInner}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
