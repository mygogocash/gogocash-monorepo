import Image from "next/image";
import ListShop from "./ListShop";
import ListRank from "./ListRank";
import TabTitle from "./TabTitle";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import client, { fetcher } from "@/lib/axios/client";
import { QuestRankResponse, ResponseQuestDate, ResSocialReward } from "@/interfaces/quest";
import { DataFav, DataOffer, IResponseFav, IResponseOffer } from "@/interfaces/offer";
import { pathImage } from "@/lib/utils";
import { useSession } from "next-auth/react";
import ExploreOtherShopsSection from "@/features/shop/component/ExploreOtherShopsSection";
import { favoriteOffer } from "@/lib/services/offer";
import { trackFavoriteToggle } from "@/lib/analytics";
import toast from "react-hot-toast";
import { useBreakpointMdUp } from "@/hooks/useBreakpointMdUp";
import { useLocale, useTranslations } from "next-intl";
import DialogQuestSocial from "./common/DialogQuestSocial";

const QuestPage = () => {
  const t = useTranslations();
  const locale = useLocale();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState(0);
  const lg = useBreakpointMdUp();
  const isThLocale = locale === "th";

  const { data: questDateOpen } = useQuery<ResponseQuestDate>({
    queryKey: ["questDateOpen"],
    queryFn: () => fetcher("/point/get-quest-open"),
  });

  const {
    data: questSocial,
    refetch,
    // isLoading,
  } = useQuery<ResSocialReward>({
    queryKey: ["get-quest-social"],
    queryFn: () => client.get("/point/get-quest-social").then((res) => res.data),
    staleTime: 0,
    enabled: !!session,
  });

  const startDate = new Date(questDateOpen?.start_date || "").toLocaleDateString("en-CA");
  const endDate = new Date(questDateOpen?.end_date || "").toLocaleDateString("en-CA");

  const { data: questList } = useQuery<QuestRankResponse[]>({
    queryKey: ["quest-list", questDateOpen, startDate, endDate],
    queryFn: () =>
      client.get(`/point/check-points/${startDate}/${endDate}`).then((res) => res.data),
  });

  const { data: myQuestList } = useQuery<QuestRankResponse>({
    queryKey: ["my-quest-list", questDateOpen, startDate, endDate],
    queryFn: () =>
      client.get(`/point/my-quest-list/${startDate}/${endDate}`).then((res) => res.data),
    enabled: !!session,
  });

  //   const { data: bannerData } = useQuery<BannerHome>({
  //     queryKey: ["offer/banner-home"],
  //     queryFn: () => fetcher("/offer/banner-home"),
  //   });

  const { data: offerExtraPoint } = useQuery<DataOffer[]>({
    queryKey: ["offer-extra-point"],
    queryFn: () => fetcher("/offer/extra-point"),
  });

  const { data: offers } = useQuery<IResponseOffer>({
    queryKey: ["getOfferByCategory"],
    queryFn: () => fetcher(`/offer?category=Travel&search=${""}&limit=4&page=1`),
    staleTime: 0,
  });

  const [questFavPagination] = useState({ page: 1, limit: 100 });
  const { data: getFavouriteOffer, refetch: refetchFavList } = useQuery<IResponseFav>({
    queryKey: [
      "getFavouriteOffer",
      "quest-explore",
      questFavPagination.page,
      questFavPagination.limit,
    ],
    queryFn: () =>
      fetcher(`/offer/favorite/${questFavPagination.page}/${questFavPagination.limit}`),
    staleTime: 60_000,
    enabled: !!session,
    refetchOnWindowFocus: false,
  });

  const { isPending: loadingFav, mutateAsync: mutateFav } = useMutation({
    mutationKey: ["mutateFav", "quest-explore"],
    mutationFn: favoriteOffer,
    onSuccess(data: DataFav, variables: { offer_id: string }) {
      const toggledId = variables.offer_id;
      const merchantForAnalytics = offers?.data?.find((o) => o._id === toggledId);
      const wasFavorite =
        getFavouriteOffer?.data
          ?.map((item) => item?.offer_id?._id.toString())
          .includes(toggledId?.toString()) ?? false;

      if (merchantForAnalytics) {
        trackFavoriteToggle({
          merchant: merchantForAnalytics,
          action: wasFavorite ? "remove" : "add",
          location: "quest_explore",
        });
      }

      if (data) {
        toast.success("Favorite offer successfully");
      } else {
        toast.success("Unfavorite offer successfully");
      }
      void refetchFavList();
    },
    onError(_error: { data?: { message?: string } }) {
      toast.error(_error?.data?.message || "Failed to favorite this offer");
    },
  });

  return (
    <div className="container 2xl:max-w-[1200px]! mx-auto w-full h-full py-5 px-[15px] md:px-0">
      <Image
        src={
          isThLocale
            ? questDateOpen?.banner_th
              ? pathImage(questDateOpen?.banner_th)
              : "/quest/banner_th.png"
            : questDateOpen?.banner_en
              ? pathImage(questDateOpen?.banner_en)
              : "/quest/banner_en.png"
        }
        alt={t("questPageBannerAlt")}
        width={1200}
        height={675}
        className="rounded-3xl w-full h-auto mb-5"
      />
      <div className="w-full h-full md:hidden flex flex-col gap-5 mt-5 ">
        <TabTitle activeTab={activeTab} setActiveTab={setActiveTab} />
        {activeTab === 2 ? (
          <ListRank list={questList} myQuest={myQuestList} />
        ) : (
          <ListShop
            questOpen={questDateOpen}
            offerExtraPoint={offerExtraPoint}
            activeTab={activeTab}
            myQuest={myQuestList}
            questSocial={questSocial}
            refetchQuestSocial={refetch}
          />
        )}
      </div>
      <div className="hidden md:grid grid-cols-1 md:grid-cols-2 gap-10 mt-5 md:mt-10 mb-20">
        <ListShop
          questOpen={questDateOpen}
          offerExtraPoint={offerExtraPoint}
          myQuest={myQuestList}
          questSocial={questSocial}
          refetchQuestSocial={refetch}
        />
        <ListRank list={questList} myQuest={myQuestList} />
      </div>

      {offers?.data?.length ? (
        <ExploreOtherShopsSection
          offers={offers.data}
          lg={lg}
          getFavouriteOffer={getFavouriteOffer}
          loadingFav={loadingFav}
          mutateFav={mutateFav}
          listId="quest_explore_other_shops"
          listName="Quest Explore Other Shops"
          source="quest_explore"
          category="Travel"
        />
      ) : null}

      <DialogQuestSocial refetch={refetch} />
    </div>
  );
};
export default QuestPage;
