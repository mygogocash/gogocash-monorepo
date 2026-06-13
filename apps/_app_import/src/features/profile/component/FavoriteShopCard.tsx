/* eslint-disable @next/next/no-img-element */
"use client";

import { CategoryChip } from "@/components/common/card/CategoryChip";
import FavoriteIcon from "@/components/icons/FavoriteIcon";
import { designSystemColor } from "@/constants/design-system";
import { Link } from "@/i18n/navigation";
import type { MerchantSelectionContext, TrackableMerchant } from "@/lib/analytics";
import { trackMerchantSelect } from "@/lib/analytics";
import { FALLBACK_BANNER, getOfferCategoryRowVisual } from "@/lib/offer/offerCardVisuals";
import { cn } from "@/lib/utils";
import ScheduleOutlined from "@mui/icons-material/ScheduleOutlined";
import FavoriteOutlined from "@mui/icons-material/FavoriteOutlined";
import { IconButton } from "@mui/material";
import { useTranslations } from "next-intl";

export type FavoriteShopCardProps = {
  /** Promotional banner — same source as home `CardSlideCategory` / `CardSpecial`. */
  bannerSrc: string;
  offerName: string;
  percentLabel: string;
  shopHref: string;
  /** API `categories` string (drives `CategoryChip` like home Top Brands). */
  categories?: string;
  favorite?: boolean;
  onToggleFavorite?: () => void;
  showGrabCoupon?: boolean;
  expiresInDays?: number | null;
  trackingOffer?: TrackableMerchant;
  trackingContext?: MerchantSelectionContext;
};

/**
 * Featured brand card — layout parity with home `CardSpecial` (Top Brands swiper).
 * Stretch `Link` pattern matches `CardSlideCategory` (no nested `role="link"` + `button`).
 * @see https://www.figma.com/design/jFDx8MnbCtlCaTQxlhpJIp/GoGoCash-1.1?node-id=9711-194922
 */
export default function FavoriteShopCard({
  bannerSrc,
  offerName,
  percentLabel,
  shopHref,
  categories = "",
  favorite,
  onToggleFavorite,
  showGrabCoupon,
  expiresInDays,
  trackingOffer,
  trackingContext,
}: FavoriteShopCardProps) {
  const t = useTranslations();
  const { label: categoryLabel, iconIndex } = getOfferCategoryRowVisual(categories);
  const showExpiry = expiresInDays != null && expiresInDays >= 0;

  const trackClick = () => {
    if (trackingOffer && trackingContext) {
      trackMerchantSelect({ merchant: trackingOffer, ...trackingContext });
    }
  };

  return (
    <div
      className={cn(
        "relative mx-auto flex w-full max-w-[280px] flex-col overflow-hidden rounded-2xl border border-(--gc-border) bg-white"
      )}
    >
      <Link
        href={shopHref}
        className="absolute inset-0 z-0"
        aria-label={offerName}
        onClick={trackClick}
      />
      <div
        className={cn(
          "pointer-events-none relative z-[1] flex flex-col gap-2 p-2",
          "[&_.MuiIconButton-root]:pointer-events-auto"
        )}
      >
        <div className="relative w-full shrink-0">
          <div className="relative aspect-272/153 w-full overflow-hidden rounded-lg bg-(--gc-text-soft)">
            <img
              src={bannerSrc}
              alt=""
              width={272}
              height={153}
              className={cn(
                "size-full",
                bannerSrc === FALLBACK_BANNER ? "object-fill" : "object-cover"
              )}
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
            {onToggleFavorite ? (
              <IconButton
                size="small"
                className="relative z-[2] size-8 shrink-0"
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
                aria-label={
                  favorite ? t("favoritePageRemoveFavorite") : t("favoritePageAddFavorite")
                }
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

          <div className="flex w-full min-h-[47px] items-end justify-between gap-2">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1">
              <p className="line-clamp-2 text-xl font-medium leading-tight text-(--gc-text)">
                {offerName}
              </p>
              <p className="text-sm font-normal leading-normal text-(--gc-text-soft)">
                {t("Cashback up to")}
              </p>
            </div>
            <p className="max-w-[45%] shrink-0 text-right text-[32px] font-semibold leading-none tabular-nums text-(--gc-primary-strong)">
              {percentLabel}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
