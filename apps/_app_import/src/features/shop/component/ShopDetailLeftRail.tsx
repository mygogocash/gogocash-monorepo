"use client";

import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import CheckroomOutlinedIcon from "@mui/icons-material/CheckroomOutlined";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useTranslations } from "next-intl";
import BankIcon from "@/components/icons/BankIcon";
import type { DataOffer } from "@/interfaces/offer";
import { Link as LocaleLink } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { sortedProductTypes } from "@/features/shop/utils/sortedProductTypes";
import { merchantSummaryTagBase } from "./shopDetailShared";

export type ShopDetailLeftRailProps = {
  offer: DataOffer | undefined;
  sumPercent: number;
  hasMerchantSummaryTags: boolean;
  merchantSummaryTagsAriaLabel: string;
  activeCouponCount: number;
  couponExpiryDays: number | null;
  percentSpecial: number;
};

export function ShopDetailLeftRail({
  offer,
  sumPercent,
  hasMerchantSummaryTags,
  merchantSummaryTagsAriaLabel,
  activeCouponCount,
  couponExpiryDays,
  percentSpecial,
}: ShopDetailLeftRailProps) {
  const t = useTranslations();

  return (
    <div className="flex min-w-0 flex-col gap-10">
      <div className="flex flex-col gap-6">
        <div className="flex items-end justify-between gap-4">
          <p className="text-[20px] leading-none text-[#7f7f7f] md:text-[24px]">
            {t("Cashback up to")}
          </p>
          <p className="shrink-0 text-[40px] leading-none font-semibold text-[#00cc99] md:text-[48px]">
            {sumPercent?.toFixed(1)}%
          </p>
        </div>
        <div className="flex flex-col gap-4">
          {hasMerchantSummaryTags ? (
            <div
              className="flex flex-wrap content-start gap-x-2 gap-y-2.5 sm:gap-x-2.5"
              role="list"
              aria-label={merchantSummaryTagsAriaLabel}
            >
              {offer?.categories ? (
                <LocaleLink
                  href={`/category/${offer.categories}`}
                  role="listitem"
                  aria-label={t("categoryExploreHeading", { category: offer.categories })}
                  className={cn(
                    merchantSummaryTagBase,
                    "border-[#e4e4e4] bg-[#f6f6f6] text-[#3b3b3b] no-underline transition-colors hover:bg-[#ececec] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00cc99]"
                  )}
                >
                  <CheckroomOutlinedIcon
                    sx={{ fontSize: 18, color: "#3b3b3b" }}
                    className="shrink-0"
                  />
                  <span className="min-w-0 truncate">{offer.categories}</span>
                </LocaleLink>
              ) : null}
              {Number(percentSpecial) > 0 ? (
                <span
                  role="listitem"
                  className={cn(
                    merchantSummaryTagBase,
                    "border-[#c8ebe0] bg-[#f7fdfb] text-[#3b3b3b]"
                  )}
                >
                  <span className="shrink-0 text-base leading-none" aria-hidden>
                    🔥
                  </span>
                  <span className="min-w-0">
                    {t("Extra Cashback")}{" "}
                    <span className="tabular-nums font-semibold text-[#00aa80]">
                      {percentSpecial}%
                    </span>
                  </span>
                </span>
              ) : null}
              {activeCouponCount > 0 ? (
                <span
                  role="listitem"
                  className={cn(merchantSummaryTagBase, "border-[#f0b0b0] bg-white text-[#3b3b3b]")}
                >
                  <span className="shrink-0 text-base leading-none" aria-hidden>
                    🧧
                  </span>
                  {t("Grab Coupon")}
                </span>
              ) : null}
              {couponExpiryDays !== null ? (
                <span
                  role="listitem"
                  className={cn(
                    merchantSummaryTagBase,
                    "border-[#f5cfcf] bg-[#fff5f5] text-[#cd0d0d]"
                  )}
                >
                  <AccessTimeOutlinedIcon
                    sx={{ fontSize: 18, color: "#cd0d0d" }}
                    className="shrink-0"
                  />
                  <span className="min-w-0">
                    {t("Expires in")}{" "}
                    <span className="tabular-nums font-semibold">{couponExpiryDays}</span>{" "}
                    {t("Day(s)")}
                  </span>
                </span>
              ) : null}
            </div>
          ) : null}
          <div className="flex flex-col gap-2 border-t border-[#e4e4e4] pt-3">
            <p className="text-sm leading-relaxed text-[#7f7f7f]">
              {t("merchantCashbackRatesDisclaimer")}
            </p>
            <p className="text-sm leading-relaxed text-[#7f7f7f]">
              {t("merchantCashbackMaxThbPerTransaction")}
            </p>
            {offer?.product_type && offer.product_type.length > 0 ? (
              <>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-base text-[#3b3b3b]">
                  <span>
                    {t("Cashback starting from")}{" "}
                    {Math.min(...offer.product_type.map((item) => Number(item?.minimum)))}%
                  </span>
                  <span className="shrink-0">
                    {t("up to")}{" "}
                    {Math.max(...offer.product_type.map((item) => Number(item?.minimum)))}%
                  </span>
                </div>
                <div
                  className="flex flex-col border-t border-[#e4e4e4]"
                  data-testid="merchant-product-rates"
                >
                  {sortedProductTypes(offer).map((product, index) => (
                    <div
                      key={`${product.name}-${index}`}
                      id={`merchant-product-${index}`}
                      className="flex items-center justify-between gap-3 border-b border-[#e4e4e4] py-[11px] last:border-b-0"
                    >
                      <p className="text-base font-normal text-[#3b3b3b]">{product.name}</p>
                      <p className="shrink-0 text-xl font-semibold leading-none text-[#3b3b3b]">
                        {product.minimum}%
                      </p>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
            {offer?.admin_note?.trim() ? (
              <div
                className="rounded-xl border border-[#c8ebe0] bg-[#f7fdfb] px-3 py-3"
                role="region"
                aria-label={t("merchantAdminNoteTitle")}
              >
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[#00aa80]">
                  {t("merchantAdminNoteTitle")}
                </p>
                <p className="whitespace-pre-line text-sm leading-relaxed text-[#3b3b3b]">
                  {offer.admin_note.trim()}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-6 text-xl font-semibold text-[#3b3b3b]">
          {t("Cashback Tracking Period")}
        </h2>
        <div className="-mx-1 overflow-x-auto px-1 sm:mx-0 sm:overflow-visible">
          <div className="flex min-w-[min(100%,520px)] items-start justify-between gap-1 sm:min-w-0">
            <div className="flex max-w-[33%] flex-1 flex-col items-center gap-2 text-center sm:max-w-[120px] sm:flex-none">
              <ShoppingBagOutlinedIcon sx={{ fontSize: 24, color: "#7f7f7f" }} />
              <div className="text-xs leading-tight font-medium text-[#3b3b3b]">
                <span className="block">{t("merchantTrackingPurchase")}</span>
                <span className="block text-[#7f7f7f]">{t("merchantTrackingWithGoGoCash")}</span>
              </div>
            </div>
            <div className="mx-1 mt-3 h-0 min-w-4 flex-1 border-b border-[#e4e4e4]" aria-hidden />
            <div className="flex max-w-[33%] flex-1 flex-col items-center gap-2 text-center sm:max-w-[120px] sm:flex-none">
              <CheckCircleIcon sx={{ fontSize: 24, color: "#7f7f7f" }} />
              <div className="text-xs leading-tight font-medium text-[#3b3b3b]">
                <span className="block">{t("Tracking")}</span>
                <span className="block text-[#7f7f7f]">
                  {t("within")} {offer?.validation_terms} {t("day")}
                </span>
              </div>
            </div>
            <div className="mx-1 mt-3 h-0 min-w-4 flex-1 border-b border-[#e4e4e4]" aria-hidden />
            <div className="flex max-w-[33%] flex-1 flex-col items-center gap-2 text-center sm:max-w-[120px] sm:flex-none">
              <BankIcon fill="#7f7f7f" width="24" height="24" />
              <div className="text-xs leading-tight font-medium text-[#3b3b3b]">
                <span className="block">{t("Confirm")}</span>
                <span className="block text-[#7f7f7f]">
                  {t("within")} {offer?.payment_terms} {t("day")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
