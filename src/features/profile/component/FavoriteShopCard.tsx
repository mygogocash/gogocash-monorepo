/* eslint-disable @next/next/no-img-element */
"use client";

import FavoriteIcon from "@/components/icons/FavoriteIcon";
import { designSystemColor } from "@/constants/design-system";
import { useRouter } from "@/i18n/navigation";
import type { MerchantSelectionContext, TrackableMerchant } from "@/lib/analytics";
import { trackMerchantSelect } from "@/lib/analytics";
import ScheduleOutlined from "@mui/icons-material/ScheduleOutlined";
import FavoriteOutlined from "@mui/icons-material/FavoriteOutlined";
import { IconButton } from "@mui/material";
import { useTranslations } from "next-intl";

export type FavoriteShopCardProps = {
  logoSrc: string;
  offerName: string;
  percentLabel: string;
  shopHref: string;
  favorite?: boolean;
  onToggleFavorite?: () => void;
  showGrabCoupon?: boolean;
  expiresInDays?: number | null;
  trackingOffer?: TrackableMerchant;
  trackingContext?: MerchantSelectionContext;
};

/**
 * GoGoCash 1.1 — brand card with Grab Coupon tag, expiry, fav (Favorite Brands).
 * @see https://www.figma.com/design/jFDx8MnbCtlCaTQxlhpJIp/GoGoCash-1.1?node-id=8705-139894
 */
export default function FavoriteShopCard({
  logoSrc,
  offerName,
  percentLabel,
  shopHref,
  favorite,
  onToggleFavorite,
  showGrabCoupon,
  expiresInDays,
  trackingOffer,
  trackingContext,
}: FavoriteShopCardProps) {
  const t = useTranslations();
  const router = useRouter();

  const goToShop = () => {
    if (trackingOffer && trackingContext) {
      trackMerchantSelect({ merchant: trackingOffer, ...trackingContext });
    }
    router.push(shopHref);
  };

  return (
    <div
      role="link"
      tabIndex={0}
      className="mx-auto flex w-full max-w-[280px] cursor-pointer flex-col gap-1.5 overflow-hidden rounded-2xl border border-[var(--gc-border)] bg-[var(--gc-surface)] p-1.5 shadow-[0_1px_3px_rgba(16,34,23,0.04)] md:gap-2 md:p-2 md:shadow-none"
      onClick={goToShop}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          goToShop();
        }
      }}
    >
      <div className="relative w-full shrink-0">
        <div className="relative aspect-[168/94.5] w-full overflow-hidden rounded-lg bg-[var(--gc-border)] md:aspect-[272/153]">
          <img
            src={logoSrc}
            alt={offerName}
            width={272}
            height={153}
            className="size-full object-cover object-center"
          />
          {showGrabCoupon ? (
            <div className="absolute left-1.5 top-1 flex h-5 max-w-[calc(100%-12px)] items-center gap-1 rounded-full border border-[var(--gc-border)] bg-[var(--gc-surface)] px-1.5 py-0.5 text-[10px] font-medium leading-normal text-[var(--gc-text)] shadow-[0_1px_2px_rgba(0,0,0,0.05)] sm:left-2 sm:top-1.5 sm:h-6 sm:max-w-none sm:gap-2 sm:rounded-2xl sm:px-2 sm:py-1 sm:text-xs sm:font-normal">
              <span className="text-[13px] leading-none" aria-hidden>
                🧧
              </span>
              <span>{t("favoritePageGrabCoupon")}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-0.5 pt-0.5 md:gap-1 md:pt-1">
        <div className="flex w-full items-center justify-between gap-1.5 md:gap-2">
          {expiresInDays != null && expiresInDays >= 0 ? (
            <div className="inline-flex max-w-[min(100%,200px)] items-center gap-1 rounded-full bg-[#ffe8e9] px-1.5 py-0.5 text-[10px] font-normal leading-normal text-[var(--gc-danger)] md:gap-2 md:px-2 md:py-1 md:text-xs">
              <ScheduleOutlined sx={{ fontSize: { xs: 10, md: 12 } }} aria-hidden />
              <span className="flex flex-wrap items-center gap-1">
                <span>{t("Expires in")}</span>
                <span>{expiresInDays}</span>
                <span>{t("Day(s)")}</span>
              </span>
            </div>
          ) : (
            <span />
          )}
          {onToggleFavorite ? (
            <IconButton
              size="small"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleFavorite();
              }}
              sx={{
                border: "1px solid var(--gc-primary-soft)",
                background: "var(--gc-primary-soft)",
                borderRadius: "100px",
                padding: "4px",
              }}
              aria-label={favorite ? t("favoritePageRemoveFavorite") : t("favoritePageAddFavorite")}
            >
              {favorite ? (
                <FavoriteOutlined
                  sx={{ color: "var(--gc-primary-strong)", fontSize: { xs: 16, md: 18 } }}
                />
              ) : (
                <FavoriteIcon fill={designSystemColor.green2} width="18" height="15" />
              )}
            </IconButton>
          ) : null}
        </div>

        <div className="flex min-h-0 w-full items-end justify-between gap-1.5 md:min-h-[47px] md:gap-2">
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-medium leading-tight text-[var(--gc-text)] md:text-xl">
              {offerName}
            </p>
            <p className="mt-0.5 text-xs font-normal leading-normal text-[var(--gc-text-soft)] md:mt-1 md:text-sm">
              {t("Cashback up to")}
            </p>
          </div>
          <p className="max-w-[42%] shrink-0 text-right text-xl font-semibold leading-none tabular-nums text-(--gc-primary) md:max-w-[45%] md:text-[32px]">
            {percentLabel}
          </p>
        </div>
      </div>
    </div>
  );
}
