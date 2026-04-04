import Image from "next/image";
import MerchantListTracker from "@/components/analytics/MerchantListTracker";
import ListShop from "./ListShop";
import ListRank from "./ListRank";
import TabTitle from "./TabTitle";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import client, { fetcher } from "@/lib/axios/client";
import { QuestRankResponse, ResponseQuestDate, ResSocialReward } from "@/interfaces/quest";
import { DataOffer, IResponseOffer } from "@/interfaces/offer";
import { getPercent, logoOffer, pathImage } from "@/lib/utils";
import { useSession } from "next-auth/react";
import Title from "@/components/common/Title";
import CardImage from "@/components/common/card/CardImage";
import { useMediaQuery } from "@mui/material";
import { useParams } from "next/navigation";
import DialogQuestSocial from "./common/DialogQuestSocial";

const QuestPage = () => {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState(0);
  const lg = useMediaQuery("(min-width:768px)");
  const param = useParams();
  const pathname = param?.locale;

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
  return (
    <section className="container mx-auto h-full w-full px-[15px] py-5 md:px-0 gc-section">
      <div className="gc-surface-card overflow-hidden p-3 md:p-4">
        <Image
          src={
            pathname?.includes("th")
              ? questDateOpen?.banner_th
                ? pathImage(questDateOpen?.banner_th)
                : "/quest/banner_th.png"
              : questDateOpen?.banner_en
                ? pathImage(questDateOpen?.banner_en)
                : "/quest/banner_en.png"
          }
          alt="Quest Image"
          width={1200}
          height={675}
          className="h-auto w-full rounded-[28px]"
        />
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
        <div className="gc-soft-panel p-5 md:p-6">
          <p className="gc-kicker mb-3">Weekly challenge</p>
          <h1 className="text-[30px] font-semibold tracking-[-0.04em] text-[#103522]">
            Quest missions, ranking, and bonus-store discovery
          </h1>
          <p className="mt-3 max-w-[680px] text-[15px] leading-7 text-[#5B6B61]">
            Complete campaign tasks, stack extra points, and explore featured partner stores from
            one coordinated quest hub.
          </p>
        </div>
        <div className="gc-soft-panel p-5 md:p-6">
          <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.14em] text-[#87948B]">
            Quest period
          </p>
          <p className="text-[20px] font-semibold text-[#103522]">
            {questDateOpen?.start_date && questDateOpen?.end_date
              ? `${startDate} - ${endDate}`
              : "Campaign details coming soon"}
          </p>
          <p className="mt-3 text-[14px] leading-6 text-[#5B6B61]">
            {session
              ? `Your current score: ${myQuestList?.point || 0} points`
              : "Sign in to see your personal quest progress and rewards."}
          </p>
        </div>
      </div>
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
        />{" "}
        <ListRank list={questList} myQuest={myQuestList} />
      </div>

      <Title title="Explore Other Shops" />
      <MerchantListTracker
        items={offers?.data}
        listId="quest_explore_other_shops"
        listName="Quest Explore Other Shops"
        source="quest_explore"
      />
      <div className="grid grid-cols-2 gap-4 my-6 md:grid-cols-4">
        {offers?.data.map((offer, index) => {
          const percent = getPercent(offer.commissions);

          return (
            <CardImage
              key={offer._id}
              logo={logoOffer(offer.logo, offer.logo_desktop, offer.logo_mobile, lg)}
              offer_name={offer.offer_name_display || offer.offer_name}
              percent={
                offer?.commission_store
                  ? `${offer.commission_store?.toFixed(1)}%`
                  : percent
                    ? `${percent}%`
                    : "0%"
              }
              show_name_1
              green_text
              link={`/shop/${offer._id}`}
              trackingOffer={offer}
              trackingContext={{
                listId: "quest_explore_other_shops",
                listName: "Quest Explore Other Shops",
                position: index + 1,
                source: "quest_explore",
              }}
            />
          );
        })}
      </div>

      <DialogQuestSocial refetch={refetch} />
    </section>
  );
};
export default QuestPage;
