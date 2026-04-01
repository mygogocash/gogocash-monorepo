import { IResponseOffer } from "@/interfaces/offer";
import { fetcher } from "@/lib/axios/client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import CardSlideCategory from "../common/CardSlideCategory";
import HomeSectionHeader from "../common/HomeSectionHeader";
import { homeSectionMeta } from "../constants";

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

  const section = homeSectionMeta.trendingBrands;

  return (
    <section className="gc-home-section-y flex w-full flex-col gap-6">
      <HomeSectionHeader variant="sectionRow" title={section.title} link={section.link} />
      <CardSlideCategory
        list={offers?.data}
        showPagination
        trackingListId={section.trackingListId}
        trackingListName={section.trackingListName}
      />
    </section>
  );
};
export default Trending;
