import { Dialog } from "@mui/material";
import React, { useCallback, useEffect } from "react";
import Image from "next/image";
import Button from "@/components/common/Button";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import client from "@/lib/axios/client";
import { SocialReward } from "@/interfaces/quest";
import { useTranslations } from "next-intl";
interface IPropDialog {
  refetch: () => void;
}
const DialogQuestSocial = ({ refetch }: IPropDialog) => {
  const [curentMission, setCurrentMission] = React.useState<SocialReward | null>(null);
  const { data: session } = useSession();
  const t = useTranslations();
  const questData = useCallback(() => {
    if (session) {
      const data = window.localStorage.getItem(`quest-social`);
      if (data) {
        setCurrentMission(JSON.parse(data));
      } else {
        setCurrentMission(null);
      }
    }
  }, [session]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    questData();
  }, [questData]);

  const handleActionConfirm = () => {
    if (session && curentMission) {
      client
        .patch(`/point/update-quest-social/${curentMission?._id}`)
        .then(() => {
          refetch();
          window.localStorage.removeItem(`quest-social`);
          setCurrentMission(null);
          toast.success(t("Points have been added to your account!"));
        })
        .catch((error) => {
          toast.error(error?.data?.message || "Failed to confirm the action");
        });
    } else {
      toast.error(t("Please login to complete this mission"));
      return;
    }
  };
  return (
    <Dialog
      open={session && curentMission && !curentMission?.reward_status ? true : false}
      aria-labelledby={curentMission?._id}
      aria-describedby={curentMission?._id}
      sx={{ " .MuiPaper-root": { borderRadius: "16px" } }}
    >
      <div className="p-5 flex flex-col items-center gap-4">
        <Image
          src={curentMission?.type === "facebook" ? "/quest/facebook.png" : "/quest/line.png"}
          alt="icon"
          width={96}
          height={96}
          className="w-[60px] h-[60px] lg:w-24 lg:h-24"
        />
        <div className="w-full">
          <h1 className="text-[14px] lg:text-[24px] font-bold capitalize text-center">
            {curentMission?.type} {curentMission?.action?.replace("_", " ")}
          </h1>
          <p className="text-center text-[12px] lg:text-[16px] text-[#7F7F7F]">
            {t("Mission completed! You have earned extra points")}
          </p>
        </div>
        <Button onClick={handleActionConfirm}>{t("Confirm")}</Button>
      </div>
    </Dialog>
  );
};

export default DialogQuestSocial;
