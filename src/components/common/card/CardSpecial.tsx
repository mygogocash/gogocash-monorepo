/* eslint-disable @next/next/no-img-element */
"use client";

import FavoriteBorder from "@mui/icons-material/FavoriteBorder";
import ScheduleOutlined from "@mui/icons-material/ScheduleOutlined";
import { useTranslations } from "next-intl";
import { CategoryChip } from "@/components/common/card/CategoryChip";
import { getOfferCategoryRowVisual, FALLBACK_BANNER } from "@/lib/offer/offerCardVisuals";
import { cn } from "@/lib/utils";

/**
 * GoGoCash 1.1 — Shop Cards (featured)
 * https://www.figma.com/design/jFDx8MnbCtlCaTQxlhpJIp/GoGoCash-1.1?node-id=9711-194922
 */

interface IProp {
  banner: string;
  offer_name: string;
  percent: string;
  /** Comma-separated or single category from API — maps to shop explore label + icon */
  categories?: string;
  /** When set, shows the expiry pill */
  expiresInDays?: number | null;
  /**
   * Shop/category explore grids: 2+ columns — fill cell width and use slightly smaller type on narrow viewports.
   */
  directoryGrid?: boolean;
  /** When true, show the "Grab Coupon" badge on the banner (offer has an available coupon). */
  showGrabCoupon?: boolean;
}

const CardSpecial = ({
  banner,
  offer_name,
  percent,
  categories = "",
  expiresInDays,
  directoryGrid = false,
  showGrabCoupon = false,
}: IProp) => {
  const t = useTranslations();
  const showExpiry = expiresInDays != null && expiresInDays >= 0;
  const { label: categoryLabel, iconIndex } = getOfferCategoryRowVisual(categories);

  return (
    <div
      className={cn(
        "pointer-events-none flex h-full min-h-0 w-full flex-col gap-2 overflow-hidden rounded-2xl border border-(--gc-border) bg-white p-2",
        directoryGrid ? "max-w-none" : "mx-auto max-w-[280px]",
        "[&_*]:pointer-events-none [&_button]:pointer-events-auto"
      )}
    >
      <div className="relative w-full shrink-0">
        <div className="relative aspect-272/153 w-full overflow-hidden rounded-lg bg-(--gc-text-soft)">
          <img
            src={banner}
            alt={offer_name}
            width={272}
            height={153}
            className={`size-full ${banner === FALLBACK_BANNER ? "object-fill" : "object-cover"}`}
          />
        </div>

        {showGrabCoupon ? (
          <div className="absolute left-2 top-1.5 flex h-6 max-w-[calc(100%-16px)] items-center gap-2 rounded-2xl border border-(--gc-border) bg-white px-2 py-1 text-xs font-normal leading-normal text-(--gc-text) shadow-[0px_2px_2px_0px_rgba(0,0,0,0.05)]">
            <span
              aria-hidden
              className="flex size-[13px] shrink-0 items-center justify-center text-[13px] leading-none"
            >
              🧧
            </span>
            <span className="min-w-0 truncate">{t("Grab Coupon")}</span>
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1">
        <div className="flex w-full items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <CategoryChip
              label={categoryLabel}
              iconIndex={iconIndex}
              size="md"
              className="min-w-0 max-w-full shrink-0"
            />
            {showExpiry ? (
              <div className="inline-flex max-w-[min(100%,11rem)] shrink-0 items-center gap-1 rounded-full bg-[#ffe8e9] px-1 py-0.5 text-[10px] font-normal leading-normal text-(--gc-danger)">
                <ScheduleOutlined sx={{ fontSize: 10 }} aria-hidden />
                <span className="flex flex-wrap items-center gap-0.5">
                  <span>{t("Expires in")}</span>
                  <span>{expiresInDays}</span>
                  <span>{t("Day(s)")}</span>
                </span>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="relative z-[2] flex size-5 shrink-0 items-center justify-center rounded-full text-(--gc-primary-strong) hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--gc-primary-strong)"
            aria-label={t("favoritePageAddFavorite")}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <FavoriteBorder sx={{ fontSize: 18, color: "var(--gc-primary-strong)" }} aria-hidden />
          </button>
        </div>

        <div
          className={cn(
            "flex w-full items-end justify-between gap-2",
            directoryGrid ? "min-h-10 sm:min-h-[47px]" : "min-h-[47px]"
          )}
        >
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1">
            <p
              className={cn(
                "line-clamp-2 font-medium leading-tight text-(--gc-text)",
                directoryGrid ? "text-[15px] sm:text-xl" : "text-xl"
              )}
            >
              {offer_name}
            </p>
            <p
              className={cn(
                "font-normal leading-normal text-(--gc-text-soft)",
                directoryGrid ? "text-xs sm:text-sm" : "text-sm"
              )}
            >
              {t("Cashback up to")}
            </p>
          </div>
          <p
            className={cn(
              "max-w-[45%] shrink-0 text-right font-semibold leading-none tabular-nums text-(--gc-primary-strong)",
              directoryGrid ? "text-xl sm:text-2xl md:text-[32px]" : "text-[32px]"
            )}
          >
            {percent}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CardSpecial;
