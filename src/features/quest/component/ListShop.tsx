"use client";
import { env } from "@/env";
import MerchantListTracker from "@/components/analytics/MerchantListTracker";
import { DataOffer } from "@/interfaces/offer";
import MissionList from "./common/MissionList";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useSession } from "next-auth/react";
import BadgeQuest from "./BadgeQuest";
import CopyAll from "@mui/icons-material/CopyAll";
import { IconButton } from "@mui/material";
import { Link } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { QuestRankResponse, ResponseQuestDate, ResSocialReward } from "@/interfaces/quest";
import SocailList from "./common/SocailList";
import { pathImage } from "@/lib/utils";
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
        <MerchantListTracker
          items={offerExtraPoint}
          listId="quest_extra_point_merchants"
          listName="Quest Extra Point Merchants"
          source="quest_tasks"
        />
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
                {`${env.NEXT_PUBLIC_FRONTEND_URL}/login?referral_id=${
                  session?.user?._id ? session?.user?._id : "-"
                }`}
              </p>
              <IconButton
                className="flex items-center gap-1 rounded-xl!"
                onClick={() =>
                  navigator.clipboard.writeText(
                    `${env.NEXT_PUBLIC_FRONTEND_URL}/login?referral_id=${
                      session?.user?._id ? session?.user?._id : "-"
                    }`
                  )
                }
              >
                <CopyAll className="ml-2 text-[#00CC99] cursor-pointer" />
                <span className="max-w-[70px] text-[14px] text-[#00CC99]">{t("Copy Link")}</span>
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
