"use client";

import Image from "next/image";
import AccessTime from "@mui/icons-material/AccessTime";
import { useRouter } from "@/i18n/navigation";
import { DataOffer } from "@/interfaces/offer";
import { getPercent, pathImage } from "@/lib/utils";
import { MerchantSelectionContext, trackMerchantSelect } from "@/lib/analytics";
import { useTranslations } from "next-intl";

function cashbackLabel(offer: DataOffer): string {
  if (offer.commission_store != null) {
    return `${offer.commission_store.toFixed(1)}%`;
  }
  return getPercent(offer.commissions || [], true);
}

type Variant = "trending-large" | "compact";

export default function HeaderSearchPopperRow({
  offer,
  variant,
  trackingContext,
  showTrendingTag,
}: {
  offer: DataOffer;
  variant: Variant;
  trackingContext: MerchantSelectionContext;
  showTrendingTag?: boolean;
}) {
  const router = useRouter();
  const t = useTranslations();
  const name = offer.offer_name_display || offer.offer_name || "";
  const pct = cashbackLabel(offer);

  const goShop = () => {
    trackMerchantSelect({
      merchant: offer,
      ...trackingContext,
    });
    router.push(`/shop/${offer._id}`);
  };

  if (variant === "trending-large") {
    return (
      <div className="group flex min-h-[84px] items-center gap-3 overflow-hidden rounded-2xl border border-[#e8f0ec] bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(16,53,34,0.04)] transition hover:border-[#bfe8d8] hover:bg-[#fafffd] hover:shadow-[0_4px_14px_rgba(16,53,34,0.07)]">
        <div className="relative h-[68px] w-[68px] shrink-0 overflow-hidden rounded-xl bg-[#f3f4f6] ring-1 ring-black/[0.04]">
          <Image
            src={pathImage(offer.logo_mobile)}
            alt={name}
            width={68}
            height={68}
            className="size-full object-cover"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
          {showTrendingTag ? (
            <div className="inline-flex h-6 w-fit shrink-0 items-center gap-1.5 rounded-full border border-[#e5e7eb] bg-[#f9fafb] px-2.5 py-0.5">
              <AccessTime sx={{ fontSize: 12, color: "#64748b" }} />
              <span className="text-[11px] font-medium uppercase tracking-wide text-[#64748b]">
                {t("headerSearchTrendingPill")}
              </span>
            </div>
          ) : null}
          <p className="line-clamp-2 text-[15px] font-semibold leading-snug text-[#1e293b]">
            {name}
          </p>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
            <span className="text-xs text-[#94a3b8]">{t("Cashback up to")}</span>
            <span className="text-base font-bold tabular-nums text-[#00AA80]">{pct}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={goShop}
          className="flex h-9 shrink-0 items-center justify-center rounded-full bg-[#00CC99] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#00b88a] hover:shadow active:scale-[0.98]"
        >
          {t("Shop Now")}
        </button>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-3 overflow-hidden rounded-xl border border-transparent bg-white/90 px-2 py-2 transition hover:border-[#e2f4ec] hover:bg-white">
      <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-[#f3f4f6] ring-1 ring-black/[0.04]">
        <Image
          src={pathImage(offer.logo_mobile)}
          alt={name}
          width={40}
          height={40}
          className="size-full object-cover"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <p className="line-clamp-1 text-sm font-semibold leading-tight text-[#1e293b]">{name}</p>
        <div className="mt-0.5 flex items-baseline gap-2">
          <span className="text-[11px] text-[#94a3b8]">{t("Cashback up to")}</span>
          <span className="text-sm font-bold tabular-nums text-[#00AA80]">{pct}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={goShop}
        className="flex h-7 shrink-0 items-center justify-center rounded-full bg-[#00CC99] px-3 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#00b88a] active:scale-[0.98]"
      >
        {t("Shop Now")}
      </button>
    </div>
  );
}
