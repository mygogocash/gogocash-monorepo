"use client";
// import MerchantListTracker from "@/components/analytics/MerchantListTracker";
import { DataOffer } from "@/interfaces/offer";
import MissionList from "./common/MissionList";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useSession } from "next-auth/react";
import BadgeQuest from "./BadgeQuest";
import { CopyAll } from "@mui/icons-material";
import AdsClickOutlined from "@mui/icons-material/AdsClickOutlined";
import { IconButton } from "@mui/material";
import { Link } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { QuestRankResponse, ResponseQuestDate, ResSocialReward } from "@/interfaces/quest";
import SocailList from "./common/SocailList";
import { pathImage } from "@/lib/utils";
import { useEffect, useState } from "react";
import AdSenseSlot from "@/components/ads/AdSenseSlot";
interface ListShopProps {
  offerExtraPoint: DataOffer[] | undefined;
  activeTab?: number;
  myQuest?: QuestRankResponse | undefined;
  questSocial?: ResSocialReward | undefined;
  refetchQuestSocial: () => void;
  questOpen: ResponseQuestDate | undefined;
}

const ListShop = ({
  offerExtraPoint,
  activeTab,
  myQuest,
  questSocial,
  refetchQuestSocial,
  questOpen,
}: ListShopProps) => {
  const { data: session } = useSession();
  const t = useTranslations();
  const param = useParams();
  const pathname = param?.locale;
  const DAILY_CHECKIN_LIMIT = 2;
  const DAILY_VIDEO_POINTS = 10;
  const [dailyCheckins, setDailyCheckins] = useState(0);
  const [adOpen, setAdOpen] = useState(false);
  const [adRemaining, setAdRemaining] = useState(30);

  const storageKey = `gogocash.quest.daily-checkin.${session?.user?._id ?? "guest"}`;
  const today = new Date().toLocaleDateString("en-CA");
  const dailyCompleted = dailyCheckins >= DAILY_CHECKIN_LIMIT;
  const earnedTodayPoints = dailyCheckins * DAILY_VIDEO_POINTS;
  const questAdSlot = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_SLOT_QUEST;

  useEffect(() => {
    let nextCount: number | null = null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { date?: string; count?: number };
      if (parsed.date !== today) return;
      nextCount = Math.max(0, Math.min(DAILY_CHECKIN_LIMIT, Number(parsed.count) || 0));
    } catch {
      /* ignore storage parse errors */
    }
    if (nextCount === null) return;
    const timer = window.setTimeout(() => setDailyCheckins(nextCount as number), 0);
    return () => window.clearTimeout(timer);
  }, [storageKey, today]);

  const persistDailyCheckins = (nextCount: number) => {
    const safe = Math.max(0, Math.min(DAILY_CHECKIN_LIMIT, nextCount));
    setDailyCheckins(safe);
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          date: today,
          count: safe,
        })
      );
    } catch {
      /* ignore storage write errors */
    }
  };

  const startDailyCheckin = () => {
    if (dailyCompleted) return;
    setAdRemaining(30);
    setAdOpen(true);
  };

  useEffect(() => {
    if (!adOpen || adRemaining <= 0) return;
    const id = window.setTimeout(() => setAdRemaining((prev) => Math.max(0, prev - 1)), 1000);
    return () => window.clearTimeout(id);
  }, [adOpen, adRemaining]);

  const completeAdWatch = () => {
    if (adRemaining > 0) return;
    setAdOpen(false);
    persistDailyCheckins(dailyCheckins + 1);
  };

  return (
    <div className="flex flex-col">
      <Image
        src={
          pathname?.includes("en")
            ? questOpen?.sub_banner_en
              ? pathImage(questOpen?.sub_banner_en)
              : "/quest/how_to_earn_en.png"
            : questOpen?.sub_banner_th
              ? pathImage(questOpen?.sub_banner_th)
              : "/quest/how_to_earn_th.png"
        }
        alt="point"
        width={640}
        height={800}
        className={`w-full h-auto mb-3 ${activeTab === 1 ? "hidden lg:block" : " block"}`}
      />
      <div className={`${activeTab === 0 ? "hidden" : " lg:block "} w-full`}>
        <h1 className="lg:text-[30px] text-[24px] font-semibold text-[#005D46] mb-5 mt-5">
          {t("Lets Got the Tasks Done!")}
        </h1>
        {/* <MerchantListTracker
          items={offerExtraPoint}
          listId="quest_extra_point_merchants"
          listName="Quest Extra Point Merchants"
          source="quest_tasks"
        /> */}
        <div className="flex items-center justify-between gap-3 border-b border-gray-300 pb-4 mb-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E8FBF5] lg:h-14 lg:w-14">
              <AdsClickOutlined
                aria-hidden
                sx={{
                  fontSize: { xs: 20, lg: 30 },
                  color: "#00AA80",
                }}
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[18px] font-normal leading-snug text-black">
                {t("questDailyCheckinTitle")}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={startDailyCheckin}
              disabled={dailyCompleted}
              className="rounded-full disabled:cursor-not-allowed"
            >
              <BadgeQuest
                title={
                  dailyCompleted
                    ? `+${earnedTodayPoints} ${t("Points")}`
                    : `+${DAILY_VIDEO_POINTS} ${t("Points")}`
                }
                icon={
                  <Image
                    src={dailyCheckins > 0 ? "/quest/bath.svg" : "/quest/bath_grey.svg"}
                    alt="coin"
                    width={24}
                    height={24}
                    className="size-[18px] shrink-0 lg:size-5"
                  />
                }
                theme={`${dailyCheckins > 0 ? "bg-white border border-[#00CC99] text-[#00CC99]" : "bg-[#00CC99] text-white"} text-[18px] font-medium leading-snug !px-3 !py-1.5 ${dailyCheckins > 0 ? "" : "lg:min-w-[142px]"} ${dailyCompleted ? "opacity-70" : ""}`}
              />
            </button>
          </div>
        </div>
        {offerExtraPoint &&
          offerExtraPoint.length > 0 &&
          offerExtraPoint.map((offer, index) => (
            <MissionList
              key={index}
              offer={offer}
              recieved={myQuest?.unique_merchants?.includes(offer.merchant_id) ? true : false}
            />
          ))}
        <MissionList
          recieved={Number(myQuest?.bonus_over_300_received) > 0 ? true : false}
          offer={
            {
              logo: "/logo_green.png",
              offer_name: t("Shop 300 Baht+ on any shops"),
              link: "/shop",
              extra_point: 50,
            } as unknown as DataOffer
          }
        />
        <SocailList questSocial={questSocial} refetchQuestSocial={refetchQuestSocial} />
        {session && (
          <>
            <div className="flex gap-1 items-center">
              <p className="lg:text-[24px] text-[18px] mb-2">{t("Invite your Friends")}</p>
              <p className="lg:text-[16px] text-[14px] mb-2 text-[#989898]">
                ({t("Unlimited")} : 1 {t("invitation")} = 50 {t("points")})
              </p>
            </div>
            <div className="h-auto rounded-lg border border-[#989898] flex items-center justify-between px-2 ">
              <p className="text-[14px] text-[#989898] max-w-[70%] truncate line-clamp-2">
                {`${process.env.NEXT_PUBLIC_FRONTEND_URL}/login?referral_id=${
                  session?.user?._id ? session?.user?._id : "-"
                }`}
              </p>
              <IconButton
                className="flex items-center gap-1 rounded-xl!"
                onClick={() =>
                  navigator.clipboard.writeText(
                    `${process.env.NEXT_PUBLIC_FRONTEND_URL}/login?referral_id=${
                      session?.user?._id ? session?.user?._id : "-"
                    }`
                  )
                }
              >
                <CopyAll className="ml-2 text-[#00CC99] cursor-pointer" />
                <p className="text-[#00CC99] text-[14px] max-w-[70px]">{t("Copy Link")}</p>
              </IconButton>
            </div>
            <div className="mt-2 flex flex-col w-full">
              <p className="lg:text-[16px] text-[14px] text-[#989898]">
                {t(
                  "Earn +50 points for every friend you refer! Share your link, get them shopping and stack your rewards"
                )}
              </p>
              <Link href={"#"} className="ml-auto">
                <BadgeQuest
                  title={
                    Number(myQuest?.extra_point_referral) > 0
                      ? `${t("Recieved")}`
                      : `+${50} ${t("Points")}`
                  }
                  icon={
                    <Image
                      src={
                        Number(myQuest?.extra_point_referral) > 0
                          ? "/quest/bath.svg"
                          : "/quest/bath_grey.svg"
                      }
                      alt="coin"
                      width={30}
                      height={30}
                      className="w-[15px] h-[15px] lg:w-[30px] lg:h-[30px]"
                    />
                  }
                  theme={`${Number(myQuest?.extra_point_referral) > 0 ? "bg-white border border-[#00CC99] text-[#00CC99]" : "bg-[#00CC99] text-white"} text-[10px] lg:text-[18px] font-medium !pl-2`}
                />
              </Link>
            </div>
          </>
        )}
      </div>

      {adOpen ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-[560px] rounded-2xl bg-white p-4 shadow-2xl md:p-6">
            <h3 className="text-lg font-semibold text-[#3b3b3b]">{t("questDailyAdTitle")}</h3>
            <p className="mt-1 text-sm text-[#6b7280]">{t("questDailyAdBody")}</p>
            <div className="mt-4 h-[220px] overflow-hidden rounded-xl bg-[#111827]">
              {questAdSlot ? (
                <AdSenseSlot className="h-full w-full" slot={questAdSlot} format="rectangle" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,_#2b5567,_#0f172a_65%)] px-6 text-center text-sm text-white">
                  {t("questDailyAdWatchToEarn")}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={completeAdWatch}
              disabled={adRemaining > 0}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#00CC99] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {adRemaining > 0
                ? t("questDailyAdLocked", { seconds: adRemaining })
                : t("questDailyAdContinue")}
            </button>
          </div>
        </div>
      ) : null}

      {/* <Image
        src={
          pathname?.includes("en") ? "/quest/score.png" : `/quest/rank_thai.png`
        }
        alt="rank"
        width={390}
        height={800}
        className={`w-full h-auto my-3 `}
      /> */}
    </div>
  );
};

export default ListShop;
