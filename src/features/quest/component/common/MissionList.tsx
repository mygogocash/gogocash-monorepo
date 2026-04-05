"use client";

import { Link } from "@/i18n/navigation";
import { DataOffer } from "@/interfaces/offer";
import { pathImage } from "@/lib/utils";
import Image from "next/image";
import BadgeQuest from "../BadgeQuest";
import { useTranslations } from "next-intl";
// import { trackMerchantSelect, trackQuestStarted } from "@/lib/analytics";
// import { trackMetaQuestStarted } from "@/lib/metaPixel";
// import { POSTHOG_FLAG_KEYS, usePostHogFlagPayload } from "@/lib/posthog";
interface MissionListProps {
  offer: DataOffer & { link?: string };
  recieved?: boolean;
}

const MissionList = ({ offer, recieved }: MissionListProps) => {
  const t = useTranslations();
  // const questDiscoveryExperiment = usePostHogFlagPayload<{
  //   cta_label?: string;
  // }>(POSTHOG_FLAG_KEYS.questDiscovery, {});

  const component = (
    <div
      className="w-full h-auto"
      // onClick={() => {
      //   // REQ-006: Meta Pixel QuestStarted
      //   trackMetaQuestStarted();
      //   trackQuestStarted({
      //     merchant: offer,
      //     source: "quest_tasks",
      //   });

      //   if (offer._id || offer.offer_id || offer.merchant_id) {
      //     trackMerchantSelect({
      //       merchant: offer,
      //       listId: "quest_task_merchants",
      //       listName: "Quest Task Merchants",
      //       source: "quest_tasks",
      //     });
      //   }
      // }}
    >
      <BadgeQuest
        title={recieved ? `${t("Recieved")}` : `+${offer.extra_point || 0} ${t("Points")}`}
        icon={
          <Image
            src={recieved ? "/quest/bath.svg" : "/quest/bath_grey.svg"}
            alt="coin"
            width={30}
            height={30}
            className="w-[15px] h-[15px] lg:w-[30px] lg:h-[30px]"
          />
        }
        theme={`${recieved ? "bg-white border border-[#00CC99] text-[#00CC99]" : "bg-[#00CC99] text-white"} text-[10px] lg:text-[18px] font-medium !pl-2 ${recieved ? "" : "lg:min-w-[142px]"}`}
      />
    </div>
  );
  return (
    <div className="flex items-center justify-between border-b border-gray-300 pb-4 mb-4">
      <div className="flex items-center gap-3">
        <Image
          src={
            !pathImage(
              offer.logo_circle || offer.logo_mobile || offer.logo_desktop || ""
            )?.includes("localhost") &&
            (offer.logo_circle || offer.logo_mobile || offer.logo_desktop)
              ? pathImage(offer.logo_circle || offer.logo_mobile || offer.logo_desktop || "")
              : offer.logo || "/quest/banner.png"
          }
          alt="shop"
          width={56}
          height={56}
          className="rounded-full w-9 h-9 lg:w-14 lg:h-14"
        />
        <p className="text-[12px] lg:text-[18px] text-black">
          {offer.offer_name_display || offer.offer_name || ""}
        </p>
      </div>
      {offer._id || offer.link ? (
        <Link href={offer._id ? `/shop/${offer._id}` : offer.link || "#"}>{component}</Link>
      ) : (
        component
      )}
    </div>
  );
};
export default MissionList;
