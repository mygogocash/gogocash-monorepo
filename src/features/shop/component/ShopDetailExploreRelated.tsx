"use client";

import MerchantListTracker from "@/components/analytics/MerchantListTracker";
import type { DataOffer, IResponseFav } from "@/interfaces/offer";
import { banner, getPercent, logoOffer } from "@/lib/utils";
import { trackMerchantSelect } from "@/lib/analytics";
import FavoriteIcon from "@mui/icons-material/Favorite";
import { IconButton } from "@mui/material";
import { useTranslations } from "next-intl";
import { Link as LocaleLink } from "@/i18n/navigation";

export type ShopDetailExploreRelatedProps = {
  exploreRelatedOffers: DataOffer[];
  offer: DataOffer | undefined;
  lg: boolean;
  getFavouriteOffer: IResponseFav | undefined;
  loadingFav: boolean;
  mutateFav: (args: { offer_id: string }) => Promise<unknown>;
};

/**
 * Below-the-fold "Explore other shops" grid — code-split from ShopDetail to reduce initial JS.
 */
export default function ShopDetailExploreRelated({
  exploreRelatedOffers,
  offer,
  lg,
  getFavouriteOffer,
  loadingFav,
  mutateFav,
}: ShopDetailExploreRelatedProps) {
  const t = useTranslations();

  return (
    <div className="mt-12 w-full space-y-6 border-t border-[#f0f0f0] pt-12 md:mt-16 md:pt-14">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold tracking-tight text-[#3b3b3b] md:text-[26px]">
          {t("Explore Other Shops")}
        </h2>
        <LocaleLink href="/shop" className="gc-inline-link hidden shrink-0 md:inline-flex">
          {t("View all")}
          <span aria-hidden className="font-semibold">
            →
          </span>
        </LocaleLink>
      </div>
      <MerchantListTracker
        items={exploreRelatedOffers}
        listId="merchant_detail_related_shops"
        listName="Explore Other Shops"
        category={offer?.categories}
        source="merchant_detail_related"
      />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
        {exploreRelatedOffers.map((relatedOffer, index) => {
          const percent = getPercent(relatedOffer.commissions);
          const percentLabel =
            relatedOffer?.commission_store != null
              ? `${relatedOffer.commission_store.toFixed(1)}%`
              : percent
                ? `${percent}%`
                : "0%";
          const name = relatedOffer.offer_name_display || relatedOffer.offer_name;
          const bannerSrc =
            relatedOffer.banner || relatedOffer.banner_mobile
              ? banner(relatedOffer.banner_mobile, relatedOffer.banner, lg)
              : logoOffer(
                  relatedOffer.logo,
                  relatedOffer.logo_desktop,
                  relatedOffer.logo_mobile,
                  lg
                );
          const isFav =
            getFavouriteOffer?.data
              ?.map((item) => item?.offer_id?._id.toString())
              .includes(relatedOffer._id?.toString()) ?? false;
          const shopHref = `/shop/${relatedOffer._id}`;

          const trackSelect = () => {
            trackMerchantSelect({
              merchant: relatedOffer,
              listId: "merchant_detail_related_shops",
              listName: "Explore Other Shops",
              position: index + 1,
              source: "merchant_detail_related",
            });
          };

          return (
            <article
              key={relatedOffer._id}
              className="flex flex-col overflow-hidden rounded-2xl border border-[#e4e4e4] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition hover:shadow-[0_8px_24px_rgba(16,34,23,0.08)]"
            >
              <LocaleLink href={shopHref} className="block shrink-0" onClick={trackSelect}>
                <div className="relative aspect-16/10 overflow-hidden bg-[#f6f6f6]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- remote merchant banners; many host patterns */}
                  <img
                    src={bannerSrc}
                    alt=""
                    width={360}
                    height={225}
                    className="size-full object-cover object-center"
                  />
                  <span className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full border border-[#e4e4e4] bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-[#3b3b3b] shadow-sm sm:left-3 sm:top-3 sm:text-xs">
                    <span aria-hidden className="text-[#e93636]">
                      🧧
                    </span>
                    {t("Grab Coupon")}
                  </span>
                </div>
              </LocaleLink>
              <div className="flex items-start gap-2 border-t border-[#f0f0f0] p-3 sm:p-4">
                <LocaleLink href={shopHref} className="min-w-0 flex-1" onClick={trackSelect}>
                  <p
                    className={`line-clamp-2 font-semibold text-[#3b3b3b] text-[15px] leading-snug sm:text-base`}
                  >
                    {name}
                  </p>
                  <div className="mt-2 flex items-end justify-between gap-2">
                    <p className="text-xs text-[#7f7f7f] sm:text-sm">{t("Cashback up to")}</p>
                    <p className="shrink-0 text-lg font-bold tabular-nums text-[#00cc99] sm:text-xl">
                      {percentLabel}
                    </p>
                  </div>
                </LocaleLink>
                <IconButton
                  type="button"
                  disabled={loadingFav}
                  onClick={() => {
                    void mutateFav({ offer_id: relatedOffer._id });
                  }}
                  sx={{
                    width: 40,
                    height: 40,
                    border: "1px solid #E6F7ED",
                    background: "#E6F7ED",
                    borderRadius: "999px",
                    flexShrink: 0,
                  }}
                  aria-label="Favorite"
                >
                  <FavoriteIcon
                    sx={{
                      fontSize: 22,
                      color: isFav ? "#00cc99" : "#686868",
                    }}
                  />
                </IconButton>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
