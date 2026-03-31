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
      className="mx-auto flex w-full max-w-[280px] cursor-pointer flex-col gap-2 overflow-hidden rounded-2xl border border-[#e4e4e4] bg-white p-2"
      onClick={goToShop}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          goToShop();
        }
      }}
    >
      <div className="relative w-full shrink-0">
        <div className="relative aspect-272/153 w-full overflow-hidden rounded-lg bg-[#dedede]">
          <img
            src={logoSrc}
            alt={offerName}
            width={272}
            height={153}
            className="size-full object-cover object-center"
          />
          {showGrabCoupon ? (
            <div className="absolute left-2 top-1.5 flex h-6 items-center gap-2 rounded-2xl border border-[#e4e4e4] bg-white px-2 py-1 text-xs font-normal text-[#3b3b3b] shadow-[0px_2px_2px_rgba(0,0,0,0.05)]">
              <span className="text-[13px] leading-none" aria-hidden>
                🧧
              </span>
              <span>{t("favoritePageGrabCoupon")}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1 pt-1">
        <div className="flex w-full items-center justify-between gap-2">
          {expiresInDays != null && expiresInDays >= 0 ? (
            <div className="inline-flex max-w-[min(100%,200px)] items-center gap-2 rounded-full bg-[#ffe8e9] px-2 py-1 text-xs font-normal leading-normal text-[#cd0d0d]">
              <ScheduleOutlined sx={{ fontSize: 12 }} aria-hidden />
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
                border: "1px solid #E6F7ED",
                background: "#E6F7ED",
                borderRadius: "100px",
                padding: "4px",
              }}
              aria-label={favorite ? t("favoritePageRemoveFavorite") : t("favoritePageAddFavorite")}
            >
              {favorite ? (
                <FavoriteOutlined sx={{ color: designSystemColor.green2, fontSize: 18 }} />
              ) : (
                <FavoriteIcon />
              )}
            </IconButton>
          ) : null}
        </div>

        <div className="flex min-h-[47px] w-full items-end justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-xl font-medium leading-tight text-[#3b3b3b]">
              {offerName}
            </p>
            <p className="mt-1 text-sm font-normal text-[#989898]">{t("Cashback up to")}</p>
          </div>
          <p
            className="shrink-0 text-right text-[32px] font-semibold leading-none tabular-nums"
            style={{ color: designSystemColor.green2 }}
          >
            {percentLabel}
          </p>
        </div>
      </div>
    </div>
  );
}
