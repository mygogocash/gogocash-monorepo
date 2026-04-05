/* eslint-disable @next/next/no-img-element */
"use client";

import FavoriteIcon from "@mui/icons-material/Favorite";
import { IconButton } from "@mui/material";
import { useTranslations } from "next-intl";
import Button from "@/components/common/Button";
import type { DataOffer, IResponseFav } from "@/interfaces/offer";
import { dmSans } from "@/lib/utils";

export type ShopDetailHeroProps = {
  offer: DataOffer | undefined;
  heroBannerSrc: string;
  heroLogoSrc: string;
  heroBannerIsStock: boolean;
  loadingFav: boolean;
  loadingGenerateDeeplink: boolean;
  getFavouriteOffer: IResponseFav | undefined;
  mutateFav: (vars: { offer_id: string }) => Promise<unknown>;
  openLinkOffer: () => void;
  shopNowLabel: string | undefined;
  shopNowFallback: string;
};

export function ShopDetailHero({
  offer,
  heroBannerSrc,
  heroLogoSrc,
  heroBannerIsStock,
  loadingFav,
  loadingGenerateDeeplink,
  getFavouriteOffer,
  mutateFav,
  openLinkOffer,
  shopNowLabel,
  shopNowFallback,
}: ShopDetailHeroProps) {
  const t = useTranslations();
  const merchantDisplayName = offer?.offer_name_display || offer?.offer_name || "";
  const offerIdStr = offer?._id?.toString();

  const isFavorited = Boolean(
    offerIdStr &&
    getFavouriteOffer?.data?.some((item) => item?.offer_id?._id.toString() === offerIdStr)
  );

  return (
    <div className="mb-8 md:mb-10">
      <div className="flex w-full flex-col items-center pb-8 md:pb-10">
        <div className="relative z-0 -mb-10 w-full max-w-full overflow-hidden rounded-3xl bg-[#d9d9d9] shadow-none">
          <div className="relative aspect-1200/410 min-h-[220px] w-full sm:min-h-[260px] md:min-h-[300px] lg:min-h-0">
            <img
              src={heroBannerSrc}
              alt=""
              width={1200}
              height={410}
              className={`absolute inset-0 size-full ${heroBannerIsStock ? "object-fill object-center" : "object-cover object-center"}`}
            />
            <div className="relative z-[1] flex h-full items-center pt-6 pr-6 pb-12 pl-8 md:pr-24 md:pl-24 lg:pb-12 lg:pl-32 lg:pr-24">
              <img
                src={heroLogoSrc}
                alt=""
                width={338}
                height={338}
                className="max-h-[min(200px,46%)] w-auto max-w-[min(280px,48%)] object-contain object-left md:max-h-[min(280px,58%)] md:max-w-[42%] lg:max-h-[min(338px,82%)] lg:max-w-none"
              />
            </div>
          </div>
        </div>

        {/* Same width reference as hero above (no extra horizontal inset) so 90% matches the banner card */}
        <div className="relative z-2 flex w-full max-w-full justify-center px-0">
          {/**
           * GoGoCash 1.1 — Merchant hero summary card
           * https://www.figma.com/design/jFDx8MnbCtlCaTQxlhpJIp/GoGoCash-1.1?node-id=8553-213094
           *
           * 90% of hero width at all breakpoints; single row; sm+ fixed 97px bar height.
           */}
          <div className="mx-auto flex w-[90%] max-w-[90%] flex-row items-center justify-between gap-2 rounded-3xl bg-white px-4 py-3 shadow-[0_3px_14px_rgba(0,0,0,0.1)] sm:h-[97px] sm:min-h-[97px] sm:gap-4 sm:rounded-[32px] sm:px-8 sm:py-0 sm:shadow-[0_4px_20px_rgba(0,0,0,0.12)] md:px-12 lg:px-20">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center pr-1 sm:min-h-[97px] sm:pr-0 sm:py-2.5">
              <p
                className={`${dmSans.style.fontFamily} truncate text-[17px] leading-snug font-semibold text-[#3b3b3b] sm:text-3xl sm:leading-tight lg:text-[40px] lg:leading-none`}
                title={merchantDisplayName || undefined}
              >
                {merchantDisplayName}
              </p>
            </div>
            <div className="flex w-auto shrink-0 items-center gap-2 sm:gap-4">
              {offer?._id ? (
                <IconButton
                  disabled={loadingFav}
                  onClick={() => {
                    mutateFav({ offer_id: offer?._id });
                  }}
                  sx={{
                    width: { xs: 40, sm: 44 },
                    height: { xs: 40, sm: 44 },
                    flexShrink: 0,
                    border: "1px solid #E6F7ED",
                    background: "#E6F7ED",
                    borderRadius: "999px",
                  }}
                  aria-label={t("favoritePageAddFavorite")}
                  aria-pressed={isFavorited}
                >
                  <FavoriteIcon
                    sx={{
                      fontSize: { xs: 20, sm: 22 },
                      color: isFavorited ? "#00cc99" : "#686868",
                    }}
                  />
                </IconButton>
              ) : null}
              <Button
                uiVariant="dark"
                uiSize="lg"
                bgColor="#3b3b3b"
                fontSize="18px"
                fontWeight={600}
                disabled={loadingGenerateDeeplink}
                onClick={() => {
                  openLinkOffer();
                }}
                className="h-10 min-h-10 max-w-[148px] shrink-0 overflow-hidden text-ellipsis whitespace-nowrap rounded-full px-3 sm:max-w-none sm:h-12 sm:min-h-12 sm:min-w-[200px] sm:w-[200px] sm:shrink-0 sm:overflow-visible sm:whitespace-normal sm:px-6"
                sx={{
                  fontSize: { xs: "14px", sm: "18px" },
                  minHeight: { xs: 40, sm: 52 },
                  py: { xs: 0.5, sm: 1 },
                }}
              >
                {shopNowLabel || shopNowFallback}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
