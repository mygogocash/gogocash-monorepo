/* eslint-disable @next/next/no-img-element */
"use client";

import FavoriteBorder from "@mui/icons-material/FavoriteBorder";
import { useTranslations } from "next-intl";
import { CategoryChip } from "@/components/common/card/CategoryChip";
import { getOfferCategoryRowVisual, FALLBACK_BANNER } from "@/lib/offer/offerCardVisuals";
import { cn } from "@/lib/utils";

/**
 * GoGoCash 1.1 — Shop Card mobile default (ENG=True, Size=Mobile, Design=Default)
 * https://www.figma.com/design/jFDx8MnbCtlCaTQxlhpJIp/GoGoCash-1.1?node-id=8079-67033
 * 8px padding, 16px radius; banner 144×144 / 8px radius; Grab Coupon; category + fav; title + cashback + %.
 */

interface CardShopMobileDefaultProps {
  banner: string;
  offer_name: string;
  percent: string;
  categories?: string;
  /** When true, show the "Grab Coupon" badge on the banner. */
  showGrabCoupon?: boolean;
}

const CardShopMobileDefault = ({
  banner,
  offer_name,
  percent,
  categories = "",
  showGrabCoupon = false,
}: CardShopMobileDefaultProps) => {
  const t = useTranslations();
  const { label: categoryLabel, iconIndex } = getOfferCategoryRowVisual(categories);

  return (
    <div
      className={cn(
        "pointer-events-none flex w-full min-w-0 flex-col gap-2 overflow-hidden rounded-2xl border border-(--gc-border) bg-white p-2",
        "[&_*]:pointer-events-none [&_button]:pointer-events-auto"
      )}
    >
      <div className="relative w-full shrink-0">
        <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-(--gc-text-soft)">
          <img
            src={banner}
            alt={offer_name}
            width={144}
            height={144}
            className={`size-full ${banner === FALLBACK_BANNER ? "object-fill" : "object-cover"}`}
          />
        </div>

        {showGrabCoupon ? (
          <div className="absolute left-1.5 top-1.5 flex h-[22px] max-w-[calc(100%-12px)] items-center gap-1 rounded-2xl border border-(--gc-border) bg-white px-2 py-1 text-[10px] font-normal leading-normal text-(--gc-text) shadow-[0px_2px_2px_0px_rgba(0,0,0,0.05)]">
            <span
              aria-hidden
              className="flex size-2.5 shrink-0 items-center justify-center text-[10px] leading-none"
            >
              🧧
            </span>
            <span className="min-w-0 truncate">{t("Grab Coupon")}</span>
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 w-full flex-col gap-1">
        <div className="flex w-full items-start justify-between gap-1">
          <CategoryChip
            label={categoryLabel}
            iconIndex={iconIndex}
            size="sm"
            className="min-w-0 max-w-[calc(100%-2.25rem)] shrink"
          />
          <button
            type="button"
            className="relative z-[2] -m-3 flex size-10 shrink-0 items-center justify-center rounded-full text-(--gc-primary-strong) hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--gc-primary-strong)"
            aria-label={t("favoritePageAddFavorite")}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <FavoriteBorder sx={{ fontSize: 16, color: "var(--gc-primary-strong)" }} aria-hidden />
          </button>
        </div>

        <div className="flex w-full items-start justify-between gap-2">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-0.5">
            <p className="line-clamp-2 text-sm font-medium leading-tight text-(--gc-text)">
              {offer_name}
            </p>
            <p className="text-[8px] font-normal leading-normal text-(--gc-text-soft)">
              {t("Cashback up to")}
            </p>
          </div>
          <p className="shrink-0 self-start pt-0.5 text-right text-2xl font-semibold leading-none tabular-nums text-(--gc-primary-strong)">
            {percent}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CardShopMobileDefault;
