import { QuestRankResponse } from "@/interfaces/quest";
import { formatNumber } from "@/lib/utils";
import { Box, Popover } from "@mui/material";
import { useTranslations } from "next-intl";
import React from "react";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import AddIcon from "@mui/icons-material/Add";
interface MyRankProps {
  myQuest?: QuestRankResponse | undefined;
}
const MyRank = ({ myQuest }: MyRankProps) => {
  const t = useTranslations();
  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? "simple-popover" : undefined;
  return (
    <>
      <div className="bg-[#F1FFFC] border border-[#00CC99] bg-center bg-no-repeat bg-cover w-full rounded-3xl mt-6 p-4">
        <div className="flex items-center justify-around gap-3  rounded-lg h-full w-full">
          <div>
            <p className="text-[#989898] text-[12px] lg:text-[16px] font-normal text-center">
              {t("My Rank")}
            </p>

            <div className="mt-4 flex items-center justify-center bg-[url(/quest/reward.png)] bg-center bg-no-repeat bg-contain text-[#007D5E]  font-semibold text-center h-[65px]">
              <p className="bg-linear-to-r from-[#00B084] via-[#00AA80] to-[#007D5E] bg-clip-text text-transparent text-[24px] md:text-[40px]">
                {myQuest?.rank || ""}
                {myQuest?.rank &&
                  (myQuest?.rank === 1
                    ? "st"
                    : myQuest?.rank === 2
                      ? "nd"
                      : myQuest?.rank === 3
                        ? "rd"
                        : "th")}
              </p>
            </div>
          </div>
          <div>
            <p className="text-[#989898] text-[12px] lg:text-[16px] font-normal text-center">
              {t("My Total Points")}
            </p>
            <div className="mt-4 flex items-center justify-center bg-[url(/quest/coin.png)] bg-center bg-no-repeat bg-contain text-[#007D5E]  font-semibold text-center h-[65px]">
              <p className="bg-linear-to-r from-[#00B084] via-[#00AA80] to-[#007D5E] bg-clip-text text-transparent text-[24px] md:text-[40px]">
                {myQuest?.point ? formatNumber(myQuest.point || 0, 0) : 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      <button
        aria-describedby={id}
        onClick={handleClick}
        className="text-right text-[#00CC99] my-2 text-[14px] lg:text-[16px] font-medium"
      >
        {t("View Points")}
        <ExpandLessIcon className={`${open ? " " : "rotate-90"}`} />
      </button>
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        onClose={handleClose}
        sx={{
          " .MuiPaper-root": {
            // backgroundColor: "#e0e0e0",
            // borderRadius: "8px",
            padding: "10px 0 0 0 !important",
            boxShadow: "none !important",
            // boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
          },
        }}
      >
        <div className="relative shadow-lg bg-linear-to-r from-white  to-white border border-[#CECBCB] rounded-lg p-4 w-fit px-5 text-center">
          <Box
            sx={{
              position: "absolute",
              top: -12.2,
              right: 10,
              transform: "translateX(-50%)",
            }}
          >
            <svg width="24" height="14" viewBox="0 0 24 14">
              <svg width="24" height="14" viewBox="0 0 24 14">
                {/* background */}
                <path d="M3 12 L10 4 Q12 2 14 4 L21 12 Z" fill="white" />

                {/* border only sides */}
                <path
                  d="M3 12 L10 4 Q12 2 14 4 L21 12"
                  fill="none"
                  stroke="#CECBCB"
                  strokeWidth="1"
                />
              </svg>
            </svg>
          </Box>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#989898] text-[13px] lg:text-[14px] font-normal">
                {t("Your Spending")}
              </p>
              <p className="text-[#000000] text-[20px] lg:text-[24px] font-medium">
                {myQuest?.point
                  ? `${formatNumber(myQuest?.point - (Number(myQuest?.extra_point_received || 0) + Number(myQuest?.extra_point_referral || 0) + Number(myQuest?.bonus_over_300_received || 0) + Number(myQuest?.point_social_reward || 0)), 0)}`
                  : "0"}
              </p>
            </div>
            <AddIcon className="text-[#989898] mx-5" />
            <div>
              <p className="text-[#989898] text-[13px] lg:text-[14px] font-normal">
                {t("Your Special Tasks")}
              </p>
              <p className="text-[#000000] text-[20px] lg:text-[24px] font-medium">
                {myQuest?.point
                  ? `${formatNumber(Number(myQuest?.extra_point_received || 0) + Number(myQuest?.extra_point_referral || 0) + Number(myQuest?.bonus_over_300_received || 0) + Number(myQuest?.point_social_reward || 0), 0)}`
                  : "0"}
              </p>
            </div>
          </div>
        </div>
      </Popover>
    </>
  );
};

export default MyRank;
