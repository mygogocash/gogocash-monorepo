import { IResponseOffer } from "@/interfaces/offer";
import { fetcher } from "@/lib/axios/client";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import CardSlideCategory from "../common/CardSlideCategory";
import HomeSectionHeader from "../common/HomeSectionHeader";
import { homeSectionMeta } from "../constants";
import { useUserCountry } from "@/hooks/useUserCountry";
import { dedupeOffersByBrand } from "@/lib/offer/offerVisibility";

const Trending = () => {
  const [offerSearch] = useState({
    category: "",
    page: 1,
    limit: 36,
    search: "",
  });

  const { data: offers } = useQuery<IResponseOffer>({
    queryKey: [
      "getTrending",
      offerSearch.category,
      offerSearch.search,
      offerSearch.limit,
      offerSearch.page,
    ],
    queryFn: () =>
      fetcher(
        `/offer?category=${offerSearch.category}&search=${offerSearch.search}&limit=${offerSearch.limit}&page=${offerSearch.page}`
      ),
    staleTime: Infinity,
    enabled: offerSearch.page > 0,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { country } = useUserCountry();
  // Hide country-specific brands from users in other countries; global brands stay visible.
  const visibleOffers = useMemo(
    () => (offers?.data ? dedupeOffersByBrand(offers.data, country) : offers?.data),
    [offers, country]
  );

  const section = homeSectionMeta.trendingBrands;

  return (
    <section className="gc-home-section-y flex w-full flex-col gap-4 md:gap-6">
      <HomeSectionHeader variant="sectionRow" title={section.title} link={section.link} />
      <CardSlideCategory
        cardVariant="brandLogoBadge"
        list={visibleOffers}
        showPagination
        trackingListId={section.trackingListId}
        trackingListName={section.trackingListName}
      />
    </section>
  );
};
export default Trending;
