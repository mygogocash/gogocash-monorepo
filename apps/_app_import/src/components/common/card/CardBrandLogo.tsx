/* eslint-disable @next/next/no-img-element */
"use client";

import FavoriteBorder from "@mui/icons-material/FavoriteBorder";
import { useTranslations } from "next-intl";
import { CategoryChip } from "@/components/common/card/CategoryChip";
import { FALLBACK_BANNER, getOfferCategoryRowVisual } from "@/lib/offer/offerCardVisuals";
import { cn } from "@/lib/utils";

interface IProp {
  logo: string;
  offer_name: string;
  percent: string;
  /** Comma-separated or single category from API — drives the category chip. */
  categories?: string;
  /** When true, shows the "Grab Coupon" badge on the logo tile. */
  showGrabCoupon?: boolean;
  /** Tile background color (hex). Derived per brand for visual rhythm across the grid. */
  tint?: string;
  /**
   * `full` (default) — category chip + heart + name/caption + cashback side-by-side (6-col grid).
   * `compact` — minimal meta: name + cashback stacked (8-col badge grid).
   */
  layout?: "full" | "compact";
}

/**
 * Top Brands — 1:1 brand-logo tile.
 * Image: square logo on a tinted backdrop (matches `/en/demo-top-brands-square` 6-col tile).
 * Meta: category chip + favorite, brand name + cashback %, "Cashback up to" caption.
 */
const CardBrandLogo = ({
  logo,
  offer_name,
  percent,
  categories = "",
  showGrabCoupon = false,
  tint,
  layout = "full",
}: IProp) => {
  const t = useTranslations();
  const isFallback = logo === FALLBACK_BANNER;
  const { label: categoryLabel, iconIndex } = getOfferCategoryRowVisual(categories);
  const isCompact = layout === "compact";

  return (
    <div
      className={cn(
        "group pointer-events-none relative mx-auto !box-border flex h-full min-h-0 min-w-0 w-full max-w-[280px] flex-col gap-2",
        "overflow-hidden rounded-2xl border border-(--gc-border) bg-white p-2 shadow-sm",
        "[&_*]:pointer-events-none [&_button]:pointer-events-auto"
      )}
    >
      {/* 1:1 logo tile */}
      <div className="relative w-full shrink-0">
        <div
          className="relative aspect-square w-full overflow-hidden rounded-lg"
          style={{ backgroundColor: tint ?? "var(--gc-surface-muted)" }}
        >
          <img
            src={logo}
            alt={offer_name}
            width={280}
            height={280}
            className={cn("size-full", isFallback ? "object-cover" : "object-contain p-3")}
          />
        </div>

        {!isCompact && showGrabCoupon ? (
          <div className="absolute left-1.5 top-1.5 flex h-5 max-w-[calc(100%-12px)] items-center gap-1 rounded-full border border-(--gc-border) bg-white px-1.5 py-0.5 text-[10px] font-normal leading-none text-(--gc-text) shadow-[0px_2px_2px_0px_rgba(0,0,0,0.05)]">
            <span aria-hidden className="text-[11px] leading-none">
              🧧
            </span>
            <span className="min-w-0 truncate">{t("Grab Coupon")}</span>
          </div>
        ) : null}
      </div>

      {/* Meta */}
      {isCompact ? (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1">
          <h3 className="truncate text-xs font-semibold leading-tight text-(--gc-text)">
            {offer_name}
          </h3>
          <div className="flex items-baseline justify-between gap-1">
            <p className="min-w-0 truncate text-[10px] font-normal leading-none text-(--gc-text-soft)">
              {t("Cashback up to")}
            </p>
            <span className="shrink-0 whitespace-nowrap text-right text-base font-bold leading-none tabular-nums text-(--gc-primary-strong)">
              {percent}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-1">
          <CategoryChip
            label={categoryLabel}
            iconIndex={iconIndex}
            size="sm"
            className="min-w-0 max-w-full self-start"
          />
          <h3 className="line-clamp-2 min-h-[2.5em] text-sm font-semibold leading-tight text-(--gc-text)">
            {offer_name}
          </h3>
          <div className="flex w-full items-baseline justify-between gap-2">
            <p className="min-w-0 truncate text-[11px] font-normal leading-none text-(--gc-text-soft)">
              {t("Cashback up to")}
            </p>
            <span className="shrink-0 whitespace-nowrap text-right text-lg font-bold leading-none tabular-nums text-(--gc-primary-strong) sm:text-xl">
              {percent}
            </span>
          </div>
          <button
            type="button"
            className="absolute right-3 top-3 z-[2] flex size-7 shrink-0 items-center justify-center rounded-full bg-white/90 text-(--gc-primary-strong) shadow-[0_2px_4px_rgba(0,0,0,0.06)] backdrop-blur-sm hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--gc-primary-strong)"
            aria-label={t("favoritePageAddFavorite")}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <FavoriteBorder sx={{ fontSize: 16, color: "var(--gc-primary-strong)" }} aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
};

export default CardBrandLogo;
