import ViewAll from "@/components/common/ViewAll";
import { IResponseOffer } from "@/interfaces/offer";
import { fetcher } from "@/lib/axios/client";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import SmallImg from "../common/SmallImg";
import HomeSectionHeader from "../common/HomeSectionHeader";
import { homeSectionMeta } from "../constants";
import { useUserCountry } from "@/hooks/useUserCountry";
import { dedupeOffersByBrand } from "@/lib/offer/offerVisibility";

const Popular = () => {
  const [offerSearch] = useState({
    category: "",
    page: 1,
    limit: 3,
    search: "",
  });

  const {
    data: electronic,
    // error,
    // isLoading,
    // isError,
  } = useQuery<IResponseOffer>({
    queryKey: ["getElectronic", offerSearch.search, offerSearch.limit, offerSearch.page],
    queryFn: () =>
      fetcher(
        `/offer?category=electronic&search=${offerSearch.search}&limit=${offerSearch.limit}&page=${offerSearch.page}`
      ),
    staleTime: Infinity,
    enabled: offerSearch.page > 0,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const {
    data: beauty,
    // error,
    // isLoading,
    // isError,
  } = useQuery<IResponseOffer>({
    queryKey: ["getBeauty", offerSearch.search, offerSearch.limit, offerSearch.page],
    queryFn: () =>
      fetcher(
        `/offer?category=beauty&search=${offerSearch.search}&limit=${offerSearch.limit}&page=${offerSearch.page}`
      ),
    staleTime: Infinity,
    enabled: offerSearch.page > 0,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const {
    data: others,
    // error,
    // isLoading,
    // isError,
  } = useQuery<IResponseOffer>({
    queryKey: ["getOthers", offerSearch.search, offerSearch.limit, offerSearch.page],
    queryFn: () =>
      fetcher(
        `/offer?category=others&search=${offerSearch.search}&limit=${offerSearch.limit}&page=${offerSearch.page}`
      ),
    staleTime: Infinity,
    enabled: offerSearch.page > 0,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { country } = useUserCountry();
  // Filter each category's small-rail by user country / global flag.
  const electronicVisible = useMemo(
    () => (electronic?.data ? dedupeOffersByBrand(electronic.data, country) : electronic?.data),
    [electronic, country],
  );
  const beautyVisible = useMemo(
    () => (beauty?.data ? dedupeOffersByBrand(beauty.data, country) : beauty?.data),
    [beauty, country],
  );
  const othersVisible = useMemo(
    () => (others?.data ? dedupeOffersByBrand(others.data, country) : others?.data),
    [others, country],
  );

  const section = homeSectionMeta.popularNow;
  const popularPanels = [
    {
      title: "Electronic",
      link: "/category/electronic",
      background: "/popular/Electronic.png",
      list: electronicVisible,
    },
    {
      title: "Beauty",
      link: "/category/beauty",
      background: "/popular/Beauty.png",
      list: beautyVisible,
    },
    {
      title: "Others",
      link: "/category/Others",
      background: "/popular/Dinner.png",
      list: othersVisible,
    },
  ];

  return (
    <section className="gc-home-section-y flex w-full flex-col gap-6">
      <HomeSectionHeader variant="sectionTitleOnly" title={section.title} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {popularPanels.map((panel) => (
          <div
            key={panel.title}
            className="gc-surface-card relative min-h-[290px] overflow-hidden p-6"
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${panel.background})` }}
            />
            <div className="absolute inset-0 bg-linear-to-b from-white/72 via-white/80 to-white/96" />
            <div className="relative flex h-full flex-col justify-between">
              <div>
                <span className="gc-pill mb-4 bg-white/90">Popular category</span>
                <h3 className="text-[30px] font-bold tracking-[-0.04em] text-[#102217]">
                  {panel.title}
                </h3>
                <p className="mt-2 max-w-[220px] text-[14px] leading-6 text-[#5B6B61]">
                  Curated brands and cashback offers in one focused rail.
                </p>
                <div className="mt-4">
                  <ViewAll link={panel.link} />
                </div>
              </div>
              <SmallImg list={panel.list} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
export default Popular;
