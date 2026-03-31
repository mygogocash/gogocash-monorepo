import { IResponseOffer } from "@/interfaces/offer";
import { fetcher } from "@/lib/axios/client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import CardSlideCategory from "../common/CardSlideCategory";
import HomeSectionHeader from "../common/HomeSectionHeader";
import { homeSectionMeta } from "../constants";

const Special = () => {
  const [offerSearch] = useState({
    category: "",
    page: 1,
    limit: 4,
    search: "",
  });
  const { data: offer } = useQuery<IResponseOffer>({
    queryKey: [
      "getSpecial",
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

  const section = homeSectionMeta.specialPick;

  return (
    <section className="gc-home-section-y w-full">
      {/* Full width of gc-home-layout so header row and grid share the same track as the section */}
      <div className="flex w-full min-w-0 flex-col gap-6">
        <HomeSectionHeader variant="sectionRow" title={section.title} link={section.link} />
        <CardSlideCategory
          cardVariant="featured"
          slideLayout="cover"
          showNavigation={false}
          staticRowMax={4}
          list={offer?.data}
          trackingListId={section.trackingListId}
          trackingListName={section.trackingListName}
        />
      </div>
    </section>
  );
};
export default Special;
