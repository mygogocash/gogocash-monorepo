/* eslint-disable @next/next/no-img-element */
"use client";

import FavoriteBorder from "@mui/icons-material/FavoriteBorder";
import ScheduleOutlined from "@mui/icons-material/ScheduleOutlined";
import { useTranslations } from "next-intl";
import { ShopExploreMenuTapIcon } from "@/components/nav/ShopExploreMenuTapIcon";
import { designSystemColor } from "@/constants/design-system";
import { getOfferCategoryRowVisual } from "@/lib/offer/offerCardVisuals";
import { cn } from "@/lib/utils";

/** Compact category chip: same row height as the favorite control (`size-5` = 20px). */
const cardCategoryChipClass =
  "inline-flex h-5 max-h-5 min-h-0 items-center gap-1 overflow-hidden rounded-full border border-[#e4e4e4] bg-[#f6f6f6] px-2 py-0 text-[10px] font-medium leading-none text-[#3b3b3b] shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#ececec] sm:text-xs";

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
}

const CardSpecial = ({ banner, offer_name, percent, categories = "", expiresInDays }: IProp) => {
  const t = useTranslations();
  const showExpiry = expiresInDays != null && expiresInDays >= 0;
  const { label: categoryLabel, iconIndex } = getOfferCategoryRowVisual(categories);

  return (
    <div
      className={cn(
        "mx-auto flex h-full min-h-0 w-full max-w-[280px] flex-col gap-2 overflow-hidden rounded-2xl border border-[#e4e4e4] bg-white p-2",
        /* Stretch-link parent: clicks must pass through to overlay `<a>` except the favorite control */
        "[&_*]:pointer-events-none [&_button]:pointer-events-auto"
      )}
    >
      <div className="relative w-full shrink-0">
        <div className="relative aspect-272/153 w-full overflow-hidden rounded-lg bg-[#989898]">
          <img
            src={banner}
            alt={offer_name}
            width={272}
            height={153}
            className={`size-full ${banner === "/home/banner.webp" ? "object-fill" : "object-cover"}`}
          />
        </div>

        <div className="absolute left-2 top-1.5 flex h-6 max-w-[calc(100%-16px)] items-center gap-2 rounded-2xl border border-[#e4e4e4] bg-white px-2 py-1 text-xs font-normal leading-normal text-[#3b3b3b] shadow-[0px_2px_2px_0px_rgba(0,0,0,0.05)]">
          <span
            aria-hidden
            className="flex size-[13px] shrink-0 items-center justify-center text-[13px] leading-none"
          >
            🧧
          </span>
          <span className="min-w-0 truncate">{t("Grab Coupon")}</span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1">
        <div className="flex w-full items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {/* Compact chip — height matches favorite `size-5` (20px); span only (card is inside shop Link) */}
            <span className={cn(cardCategoryChipClass, "min-w-0 max-w-full shrink-0")}>
              <span className="flex size-[18px] shrink-0 items-center justify-center text-[#3b3b3b]">
                <ShopExploreMenuTapIcon
                  variant="category"
                  categoryIndex={iconIndex}
                  className="size-[18px] lg:size-[18px]"
                />
              </span>
              <span className="min-w-0 truncate">{categoryLabel}</span>
            </span>
            {showExpiry ? (
              <div className="inline-flex max-w-[min(100%,11rem)] shrink-0 items-center gap-1 rounded-full bg-[#ffe8e9] px-1 py-0.5 text-[10px] font-normal leading-normal text-[#cd0d0d]">
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
            <FavoriteBorder sx={{ fontSize: 18, color: designSystemColor.green2 }} aria-hidden />
          </button>
        </div>

        <div className="flex min-h-[47px] w-full items-end justify-between gap-2">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1">
            <p className="line-clamp-2 text-xl font-medium leading-tight text-[#3b3b3b]">
              {offer_name}
            </p>
            <p className="text-sm font-normal leading-normal text-[#989898]">
              {t("Cashback up to")}
            </p>
          </div>
          <p
            className="max-w-[45%] shrink-0 text-right text-[32px] font-semibold leading-none tabular-nums"
            style={{ color: designSystemColor.green2 }}
          >
            {percent}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CardSpecial;
