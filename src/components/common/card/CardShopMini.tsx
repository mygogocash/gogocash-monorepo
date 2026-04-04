/* eslint-disable @next/next/no-img-element */
"use client";

import { useTranslations } from "next-intl";
import { BRAND_MINT_HEX } from "@/constants/brand";

interface CardShopMiniProps {
  banner: string;
  offer_name: string;
  percent: string;
}

/**
 * Figma GoGoCash 1.1 — ShopCards Mini (ENG=True, Size=Desktop, Design=Mini)
 * https://www.figma.com/design/jFDx8MnbCtlCaTQxlhpJIp/GoGoCash-1.1?node-id=172-76852
 * 184×156, 8px padding, 16px radius, banner 168×94.5 / 8px radius, title 14px, cashback 12px + percent 24px.
 */
const CardShopMini = ({ banner, offer_name, percent }: CardShopMiniProps) => {
  const t = useTranslations();

  return (
    <div className="mx-auto flex h-[156px] w-full max-w-[184px] flex-col justify-between overflow-hidden rounded-2xl border border-[#e4e4e4] bg-white p-2">
      <div className="relative w-full shrink-0 overflow-hidden rounded-lg bg-[#dedede] aspect-[168/94.5]">
        <img
          src={banner}
          alt={offer_name}
          width={168}
          height={95}
          className={`size-full ${banner === "/home/banner.webp" ? "object-fill" : "object-cover"}`}
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-end pb-1 pt-1">
        <p className="line-clamp-1 text-sm font-medium leading-tight text-[#3b3b3b]">
          {offer_name}
        </p>
        <div className="mt-0.5 flex items-end justify-between gap-1">
          <p className="min-h-px min-w-0 flex-1 text-xs font-normal leading-normal text-[#989898]">
            {t("Cashback up to")}
          </p>
          <p
            className="shrink-0 text-right text-2xl font-semibold leading-none tracking-tight tabular-nums"
            style={{ color: BRAND_MINT_HEX }}
          >
            {percent}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CardShopMini;
