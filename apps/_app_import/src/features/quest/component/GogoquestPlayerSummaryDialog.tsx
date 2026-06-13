"use client";

import type { QuestUserPeriodSummary } from "@/interfaces/questHistory";
import client from "@/lib/axios/client";
import { formatNumber } from "@/lib/utils";
import { Dialog } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

export type GogoquestPlayerSummaryDialogProps = {
  open: boolean;
  onClose: () => void;
  userId: string | null;
  periodStart: string;
  periodEnd: string;
};

export function GogoquestPlayerSummaryDialog({
  open,
  onClose,
  userId,
  periodStart,
  periodEnd,
}: GogoquestPlayerSummaryDialogProps) {
  const t = useTranslations();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["quest-user-period-summary", userId, periodStart, periodEnd],
    queryFn: () =>
      client
        .get<QuestUserPeriodSummary>(
          `/point/quest-user-period-summary/${encodeURIComponent(userId!)}/${periodStart}/${periodEnd}`
        )
        .then((res) => res.data),
    enabled: open && Boolean(userId && periodStart && periodEnd),
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="gogoquest-player-dialog-title"
      slotProps={{
        backdrop: { sx: { backgroundColor: "rgba(0,0,0,0.5)" } },
      }}
      sx={{
        "& .MuiDialog-paper": {
          borderRadius: "24px",
          maxWidth: "520px",
          width: "100%",
          margin: "16px",
          overflow: "hidden",
        },
      }}
    >
      <div className="flex max-h-[min(85vh,720px)] flex-col gap-4 overflow-hidden p-6 md:p-8">
        <div className="flex shrink-0 items-start justify-between gap-3">
          <h2
            id="gogoquest-player-dialog-title"
            className="text-[20px] font-semibold tracking-tight text-[#103522]"
          >
            {t("gogoquestHistoryPlayerDialogTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-[14px] font-medium text-[#5b6b61] hover:bg-black/4"
          >
            {t("gogoquestHistoryPlayerDialogClose")}
          </button>
        </div>

        {isLoading ? (
          <p className="text-[15px] text-[#5b6b61]">{t("gogoquestHistoryPlayerDialogLoading")}</p>
        ) : isError ? (
          <p className="text-[15px] text-[#b42318]">{t("gogoquestHistoryPlayerDialogError")}</p>
        ) : data ? (
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain">
            <p className="truncate text-[16px] font-medium text-[#3b3b3b]" title={data.username}>
              {data.username}
            </p>
            <div className="grid grid-cols-2 gap-3 rounded-2xl border border-[#e4e4e4] bg-[#f9faf9] p-4">
              <div>
                <p className="text-[12px] font-medium uppercase tracking-wide text-[#87948b]">
                  {t("gogoquestHistoryPlayerRank")}
                </p>
                <p className="mt-1 text-[22px] font-semibold tabular-nums text-[#00aa80]">
                  {data.rank}
                </p>
              </div>
              <div>
                <p className="text-[12px] font-medium uppercase tracking-wide text-[#87948b]">
                  {t("gogoquestHistoryPlayerPoints")}
                </p>
                <p className="mt-1 text-[22px] font-semibold tabular-nums text-[#00aa80]">
                  {formatNumber(data.point, 0)}
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-[16px] font-semibold text-[#103522]">
                {t("gogoquestHistoryPlayerRewards")}
              </h3>
              {data.rewards.length === 0 ? (
                <p className="mt-2 text-[14px] text-[#5b6b61]">
                  {t("gogoquestHistoryPlayerNoRewards")}
                </p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {data.rewards.map((r) => (
                    <li
                      key={r._id}
                      className="rounded-xl border border-[#e4e4e4] bg-white px-4 py-3 text-[14px]"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <span className="font-medium text-[#3b3b3b]">{r.title}</span>
                        {typeof r.points === "number" ? (
                          <span className="shrink-0 font-semibold tabular-nums text-[#00aa80]">
                            +{formatNumber(r.points, 0)}
                          </span>
                        ) : null}
                      </div>
                      {r.description ? (
                        <p className="mt-1 text-[13px] text-[#5b6b61]">{r.description}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}
