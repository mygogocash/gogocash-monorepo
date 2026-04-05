/* eslint-disable @next/next/no-img-element */
"use client";

import FavoriteBorder from "@mui/icons-material/FavoriteBorder";
import { useTranslations } from "next-intl";
import { ShopExploreMenuTapIcon } from "@/components/nav/ShopExploreMenuTapIcon";
import { designSystemColor } from "@/constants/design-system";
import { getOfferCategoryRowVisual } from "@/lib/offer/offerCardVisuals";
import { cn } from "@/lib/utils";

/**
 * GoGoCash 1.1 — Shop Card mobile default (ENG=True, Size=Mobile, Design=Default)
 * https://www.figma.com/design/jFDx8MnbCtlCaTQxlhpJIp/GoGoCash-1.1?node-id=8079-67033
 * 8px padding, 16px radius; banner 144×144 / 8px radius; Grab Coupon; category + fav; title + cashback + %.
 */

const chipClass =
  "inline-flex h-4 max-h-4 min-h-0 items-center gap-1 overflow-hidden rounded-full border border-[#e4e4e4] bg-[#f6f6f6] px-1.5 py-0 text-[10px] font-medium leading-none text-[#3b3b3b] shadow-[0_1px_3px_rgba(0,0,0,0.05)]";

interface CardShopMobileDefaultProps {
  banner: string;
  offer_name: string;
  percent: string;
  categories?: string;
}

const CardShopMobileDefault = ({
  banner,
  offer_name,
  percent,
  categories = "",
}: CardShopMobileDefaultProps) => {
  const t = useTranslations();
  const { label: categoryLabel, iconIndex } = getOfferCategoryRowVisual(categories);

  return (
    <div
      className={cn(
        "pointer-events-none flex w-full min-w-0 flex-col gap-2 overflow-hidden rounded-2xl border border-[#e4e4e4] bg-white p-2",
        /* Stretch-link sibling: overlay `<Link>` sits under this card at z-0 */
        "[&_*]:pointer-events-none [&_button]:pointer-events-auto"
      )}
    >
      <div className="relative w-full shrink-0">
        <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-[#989898]">
          <img
            src={banner}
            alt={offer_name}
            width={144}
            height={144}
            className={`size-full ${banner === "/home/banner.webp" ? "object-fill" : "object-cover"}`}
          />
        </div>

        <div className="absolute left-1.5 top-1.5 flex h-[22px] max-w-[calc(100%-12px)] items-center gap-1 rounded-2xl border border-[#e4e4e4] bg-white px-2 py-1 text-[10px] font-normal leading-normal text-[#3b3b3b] shadow-[0px_2px_2px_0px_rgba(0,0,0,0.05)]">
          <span
            aria-hidden
            className="flex size-2.5 shrink-0 items-center justify-center text-[10px] leading-none"
          >
            🧧
          </span>
          <span className="min-w-0 truncate">{t("Grab Coupon")}</span>
        </div>
      </div>

      <div className="flex min-h-0 w-full flex-col gap-1">
        <div className="flex w-full items-start justify-between gap-1">
          <span className={cn(chipClass, "min-w-0 max-w-[calc(100%-2.25rem)] shrink")}>
            <span className="flex size-3.5 shrink-0 items-center justify-center text-[#3b3b3b]">
              <ShopExploreMenuTapIcon
                variant="category"
                categoryIndex={iconIndex}
                className="size-3.5"
              />
            </span>
            <span className="min-w-0 truncate">{categoryLabel}</span>
          </span>
          <button
            type="button"
            className="relative z-[2] flex size-4 shrink-0 items-center justify-center rounded-full text-(--gc-primary-strong) hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--gc-primary-strong)"
            aria-label={t("favoritePageAddFavorite")}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <FavoriteBorder sx={{ fontSize: 16, color: designSystemColor.green2 }} aria-hidden />
          </button>
        </div>

        {/* Figma Title: shop name + “Cashback up to” stacked left; percent top-right */}
        <div className="flex w-full items-start justify-between gap-2">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-0.5">
            <p className="line-clamp-2 text-sm font-medium leading-tight text-[#3b3b3b]">
              {offer_name}
            </p>
            <p className="text-[8px] font-normal leading-normal text-[#989898]">
              {t("Cashback up to")}
            </p>
          </div>
          <p
            className="shrink-0 self-start pt-0.5 text-right text-2xl font-semibold leading-none tabular-nums"
            style={{ color: designSystemColor.green2 }}
          >
            {percent}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CardShopMobileDefault;
