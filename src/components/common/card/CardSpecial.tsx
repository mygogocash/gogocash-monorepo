/* eslint-disable @next/next/no-img-element */
"use client";

import ScheduleOutlined from "@mui/icons-material/ScheduleOutlined";
import { useTranslations } from "next-intl";
import { designSystemColor } from "@/constants/design-system";

/**
 * GoGoCash 1.1 — Shop Cards with Cover
 * https://www.figma.com/design/jFDx8MnbCtlCaTQxlhpJIp/GoGoCash-1.1?node-id=8285-91051
 */

interface IProp {
  banner: string;
  offer_name: string;
  percent: string;
  /** When set, shows the expiry pill */
  expiresInDays?: number | null;
}

const CardSpecial = ({ banner, offer_name, percent, expiresInDays }: IProp) => {
  const t = useTranslations();

  return (
    <div className="mx-auto flex w-full max-w-[280px] flex-col gap-2 overflow-hidden rounded-2xl border border-[#e4e4e4] bg-white p-2">
      <div className="relative w-full shrink-0">
        <div className="relative aspect-264/148.5 w-full overflow-hidden rounded-lg bg-[#dedede]">
          <img
            src={banner}
            alt={offer_name}
            width={264}
            height={149}
            className={`size-full ${banner === "/home/banner.webp" ? "object-fill" : "object-cover"}`}
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1 pt-1">
        {expiresInDays != null && expiresInDays >= 0 ? (
          <div className="inline-flex max-w-full items-center gap-2 self-start rounded-full bg-[#ffe8e9] px-2 py-1 text-xs font-normal leading-normal text-[#cd0d0d]">
            <ScheduleOutlined sx={{ fontSize: 12 }} aria-hidden />
            <span className="flex flex-wrap items-center gap-1">
              <span>{t("Expires in")}</span>
              <span>{expiresInDays}</span>
              <span>{t("Day(s)")}</span>
            </span>
          </div>
        ) : null}

        <p className="line-clamp-2 text-xl font-medium leading-tight text-[#3b3b3b]">
          {offer_name}
        </p>

        <div className="mt-auto flex w-full items-baseline justify-between gap-2 pt-0.5">
          <p className="min-w-0 flex-1 text-sm font-normal leading-normal text-[#989898]">
            {t("Cashback up to")}
          </p>
          <p
            className="flex h-6 shrink-0 items-center justify-end text-2xl font-semibold leading-none tabular-nums"
            style={{ color: designSystemColor.green2 }}
          >
            {percent}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CardSpecial;
