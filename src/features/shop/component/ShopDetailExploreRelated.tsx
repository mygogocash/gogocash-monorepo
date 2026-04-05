"use client";

import ExploreOtherShopsSection from "@/features/shop/component/ExploreOtherShopsSection";
import type { DataOffer, IResponseFav } from "@/interfaces/offer";

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
  return (
    <ExploreOtherShopsSection
      offers={exploreRelatedOffers}
      lg={lg}
      getFavouriteOffer={getFavouriteOffer}
      loadingFav={loadingFav}
      mutateFav={mutateFav}
      listId="merchant_detail_related_shops"
      listName="Explore Other Shops"
      source="merchant_detail_related"
      category={offer?.categories}
    />
  );
}
