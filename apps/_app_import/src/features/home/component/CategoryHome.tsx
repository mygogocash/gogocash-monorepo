import { IResponseOffer } from "@/interfaces/offer";
import { fetcher } from "@/lib/axios/client";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import CardSlideCategory from "../common/CardSlideCategory";
import HomeSectionHeader from "../common/HomeSectionHeader";
import { homeSectionMeta } from "../constants";
import { useUserCountry } from "@/hooks/useUserCountry";
import { dedupeOffersByBrand } from "@/lib/offer/offerVisibility";

const CategoryHome = () => {
  const [offerSearch] = useState({
    category: "",
    page: 1,
    limit: 24,
    search: "",
  });
  const { data: travel } = useQuery<IResponseOffer>({
    queryKey: ["getCategoryTravel", offerSearch.search, offerSearch.limit, offerSearch.page],
    queryFn: () =>
      fetcher(
        `/offer?category=${encodeURIComponent("Travel")}&search=${offerSearch.search}&limit=${offerSearch.limit}&page=${offerSearch.page}`
      ),
    staleTime: Infinity,
    enabled: offerSearch.page > 0,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: cosmetic } = useQuery<IResponseOffer>({
    queryKey: ["getCategoryCosmetic", offerSearch.search, offerSearch.limit, offerSearch.page],
    queryFn: () =>
      fetcher(
        `/offer?category=${encodeURIComponent("Health & Beauty")}&search=${offerSearch.search}&limit=${offerSearch.limit}&page=${offerSearch.page}`
      ),
    staleTime: Infinity,
    enabled: offerSearch.page > 0,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { country } = useUserCountry();
  const travelVisible = useMemo(
    () => (travel?.data ? dedupeOffersByBrand(travel.data, country) : travel?.data),
    [travel, country]
  );
  const cosmeticVisible = useMemo(
    () => (cosmetic?.data ? dedupeOffersByBrand(cosmetic.data, country) : cosmetic?.data),
    [cosmetic, country]
  );

  const travelSection = homeSectionMeta.travelDeals;
  const makeupSection = homeSectionMeta.makeupMustHave;

  return (
    <>
      <section className="gc-home-section-y w-full">
        <div className="flex w-full min-w-0 flex-col gap-6">
          <HomeSectionHeader
            variant="sectionRow"
            icon="✈️"
            title={travelSection.title}
            link={travelSection.link}
          />
          <CardSlideCategory
            cardVariant="brandLogoBadge"
            showPagination
            maxItems={24}
            list={travelVisible}
            trackingListId={travelSection.trackingListId}
            trackingListName={travelSection.trackingListName}
          />
        </div>
      </section>

      <section className="gc-home-section-y w-full">
        <div className="flex w-full min-w-0 flex-col gap-6">
          <HomeSectionHeader
            variant="sectionRow"
            icon="💄"
            title={makeupSection.title}
            link={makeupSection.link}
          />
          <CardSlideCategory
            cardVariant="brandLogoBadge"
            showPagination
            maxItems={24}
            list={cosmeticVisible}
            trackingListId={makeupSection.trackingListId}
            trackingListName={makeupSection.trackingListName}
          />
        </div>
      </section>
    </>
  );
};

export default CategoryHome;
