/* eslint-disable @next/next/no-img-element */
"use client";

import FavoriteIcon from "@mui/icons-material/Favorite";
import { IconButton } from "@mui/material";
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
            <div className="relative z-1 flex h-full items-center pt-6 pr-6 pb-12 pl-8 md:pr-24 md:pl-24 lg:pb-12 lg:pl-32 lg:pr-24">
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

        <div className="relative z-2 flex w-full max-w-full justify-center px-0 sm:px-4 md:px-10 lg:px-20">
          <div className="flex min-h-[88px] w-full max-w-full flex-col gap-4 rounded-[32px] bg-white px-5 py-4 shadow-[0_4px_20px_rgba(0,0,0,0.15)] sm:h-[97px] sm:min-h-[97px] sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-8 sm:py-0 md:px-12 lg:px-20">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center">
              <p
                className={`${dmSans.style.fontFamily} w-full min-w-0 truncate font-semibold text-[#3b3b3b] text-2xl leading-tight sm:text-3xl lg:text-[40px] lg:leading-none`}
              >
                {offer?.offer_name_display || offer?.offer_name}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-4">
              {offer?._id ? (
                <IconButton
                  disabled={loadingFav}
                  onClick={() => {
                    mutateFav({ offer_id: offer?._id });
                  }}
                  sx={{
                    width: 44,
                    height: 44,
                    border: "1px solid #E6F7ED",
                    background: "#E6F7ED",
                    borderRadius: "999px",
                  }}
                  aria-label="Favorite"
                >
                  <FavoriteIcon
                    sx={{
                      fontSize: 22,
                      color: getFavouriteOffer?.data
                        ?.map((item) => item?.offer_id?._id.toString())
                        .includes(offer?._id?.toString())
                        ? "#00cc99"
                        : "#686868",
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
                className="h-12 w-full min-w-0 rounded-full px-6 sm:w-[200px] sm:min-w-[200px] sm:shrink-0"
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
