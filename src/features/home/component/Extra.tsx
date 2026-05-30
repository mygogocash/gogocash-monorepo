import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import CardSlideCategory from "../common/CardSlideCategory";
import HomeSectionHeader from "../common/HomeSectionHeader";
import { HOME_TOP_BRANDS_CAROUSEL_MAX, homeSectionMeta } from "../constants";
import { offerExtraQueryOptions } from "@/lib/queries/offerExtra";
import { useUserCountry } from "@/hooks/useUserCountry";
import { dedupeOffersByBrand } from "@/lib/offer/offerVisibility";

function CustomNavSwiper() {
  const { data: offers } = useQuery({ ...offerExtraQueryOptions });
  const { country } = useUserCountry();
  // Top-brands rail respects the same per-country visibility rule as discovery surfaces.
  const visibleOffers = useMemo(
    () => (offers ? dedupeOffersByBrand(offers, country) : offers),
    [offers, country]
  );

  const section = homeSectionMeta.topBrands;

  return (
    <section className="gc-home-section-y flex w-full flex-col gap-6">
      <HomeSectionHeader variant="sectionRow" icon="🔥" title={section.title} link={section.link} />
      <CardSlideCategory
        cardVariant="brandLogo"
        maxItems={HOME_TOP_BRANDS_CAROUSEL_MAX}
        list={visibleOffers}
        showPagination
        trackingListId={section.trackingListId}
        trackingListName={section.trackingListName}
      />
    </section>
  );
}

export default CustomNavSwiper;
