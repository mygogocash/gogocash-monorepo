"use client";

import { env } from "@/env";
import { useTranslations } from "next-intl";
import MissionList from "./MissionList";
import { DataOffer } from "@/interfaces/offer";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import client from "@/lib/axios/client";
import { ResSocialReward, SocialReward } from "@/interfaces/quest";

export type DataOfferWithLink = DataOffer & {
  link: string;
  link_social: string;
  action: string;
  type: string;
};

interface SocailListProps {
  questSocial?: ResSocialReward | undefined;
  refetchQuestSocial?: () => void;
}
const SocailList = ({ questSocial, refetchQuestSocial }: SocailListProps) => {
  const { data: session } = useSession();
  const t = useTranslations();

  const dataList = [
    {
      logo: "/quest/facebook.png",
      offer_name: t("Follow GoGoCash Facebook page"),
      link_social: questSocial?.quest?.facebook_page || "https://web.facebook.com/gogocashofficial",
      extra_point: 50,
      type: "facebook",
      action: "follow",
    } as unknown as DataOfferWithLink,
    {
      logo: "/quest/facebook.png",
      offer_name: t("Like our latest Facebook post"),
      link_social: questSocial?.quest?.facebook_post,
      extra_point: 50,
      type: "facebook",
      action: "like",
    } as unknown as DataOfferWithLink,
    {
      logo: "/quest/facebook.png",
      offer_name: t("Comment on our Facebook post"),
      link_social: questSocial?.quest?.facebook_post,
      extra_point: 50,
      type: "facebook",
      action: "comment",
    } as unknown as DataOfferWithLink,
    {
      logo: "/quest/facebook.png",
      offer_name: t("Reply to our pinned comment"),
      link_social: questSocial?.quest?.facebook_post,
      extra_point: 50,
      type: "facebook",
      action: "reply",
    } as unknown as DataOfferWithLink,
    {
      logo: "/quest/line.png",
      offer_name: t("Add friend with GoGoCash Line Official"),
      link_social:
        questSocial?.quest?.line || "https://line.me/R/ti/p/@255bjnsc?ts=09181910&oat_content=url",
      extra_point: 50,
      type: "line",
      action: "add_friend",
    } as unknown as DataOfferWithLink,
  ];

  const handleMissionClick = (offer: DataOfferWithLink) => {
    if (session && offer.link_social) {
      client
        .patch<SocialReward>(`/point/quest-social/${offer.type}/${offer.action}`)
        .then((res) => {
          const data = res.data;
          if (data.reward_status) {
            toast.error(t("You have already completed this mission"));
            return;
          }

          refetchQuestSocial?.();
          // setCurrentMission(data);
          toast.success(t("Mission completed! You have earned extra points"));
          setTimeout(() => {
            window.localStorage.setItem(`quest-social`, JSON.stringify(res.data));
            // window.open(offer.link_social);
            window.location.href = offer.link_social;
          }, 3000);
        })
        .catch((error) => {
          toast.error(error?.data?.message || "Failed to complete the mission");
        });
      // window.open(offer.link, "_blank");
    } else {
      toast.error(t("Please login to complete this mission"));
    }
  };

  return (
    <>
      {/* <!-- Load Facebook SDK for JavaScript --> */}
      <div id="fb-root"></div>
      <script
        async
        defer
        crossOrigin="anonymous"
        src={`https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v25.0&appId=${env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID}&autoLogAppEvents=1`}
      ></script>
      {/* <!-- Load Facebook SDK for JavaScript --> */}
      {dataList &&
        dataList.length > 0 &&
        dataList.map((offer, index) => {
          const questMine = questSocial?.socialRewards?.find((quest) =>
            quest.action == "follow" || quest.action == "add_friend"
              ? quest.action === offer.action && quest.type === offer.type
              : quest.action === offer.action &&
                quest.type === offer.type &&
                quest.quest_id === questSocial?.quest?._id
          );
          const recieved = questMine ? questMine.reward_status : false;
          return (
            <div
              key={index}
              onClick={() => {
                if (recieved) {
                  return;
                }
                handleMissionClick(offer);
              }}
            >
              <MissionList key={index} offer={{ ...offer, link: "#" }} recieved={recieved} />
            </div>
          );
        })}

      {/* <div
        className="fb-post"
        data-href={`https://web.facebook.com/gogocashofficial/posts/pfbid02DyXkUkQefX1DWh9VkL32hrcadEDXRGSGRhTQZpz7NxgLwvRQbgTTwd2Xvi5nFKdKl`}
      ></div> */}
    </>
  );
};
export default SocailList;
