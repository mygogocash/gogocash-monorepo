"use client";

import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import CheckroomOutlinedIcon from "@mui/icons-material/CheckroomOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { Accordion, AccordionDetails, AccordionSummary } from "@mui/material";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import BankIcon from "@/components/icons/BankIcon";
import type { DataOffer } from "@/interfaces/offer";
import { Link as LocaleLink } from "@/i18n/navigation";
import { cn, dmSans } from "@/lib/utils";
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

  const termSections = useMemo(
    () => [
      {
        title: t("Exclusions"),
        subtitle: t("You won't get Cashback on:"),
        description: [
          t("Purchases made with Vouchers or Promo codes not featured on our platform"),
          t("Taxes · Service charges · Shipping and delivery"),
        ],
      },
      {
        title: t("Refunds, Cancellations, & no-shows"),
        subtitle: t(
          "Any rejected, cancelled, refunded, exchanged or returned purchases will not be eligible for Cashback"
        ),
        description: [
          t("For partial returns or exchanges, we'll prorate the Cashback as an adjustment"),
        ],
      },
      {
        title: t("Tracking Disclaimers"),
        subtitle: "",
        description: [
          t(
            "Your Cashback may be tracked at a different rate initially and adjusted to the correct rate when we confirm the transaction details"
          ),
        ],
      },
      {
        title: t("Other terms and conditions"),
        subtitle: "",
        description: [t("GoGoCash terms of use")],
      },
    ],
    [t]
  );

  return (
    <div className="flex min-w-0 flex-col gap-14">
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
                <div className="flex flex-col border-t border-[#e4e4e4]">
                  {[...offer.product_type]
                    .sort((a, b) => Number(a?.minimum) - Number(b?.minimum))
                    .map((product, index) => (
                      <div
                        key={index}
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
            <div
              className="mx-1 mt-3 hidden h-0 min-w-4 flex-1 border-b border-[#e4e4e4] sm:block"
              aria-hidden
            />
            <div className="flex max-w-[33%] flex-1 flex-col items-center gap-2 text-center sm:max-w-[120px] sm:flex-none">
              <CheckCircleIcon sx={{ fontSize: 24, color: "#7f7f7f" }} />
              <div className="text-xs leading-tight font-medium text-[#3b3b3b]">
                <span className="block">{t("Tracking")}</span>
                <span className="block text-[#7f7f7f]">
                  {t("within")} {offer?.validation_terms} {t("day")}
                </span>
              </div>
            </div>
            <div
              className="mx-1 mt-3 hidden h-0 min-w-4 flex-1 border-b border-[#e4e4e4] sm:block"
              aria-hidden
            />
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

      <div>
        <h2 className="mb-4 text-xl font-semibold text-[#3b3b3b]">{t("Terms and exclusions")}</h2>
        {termSections.map((item, index) => {
          return (
            <Accordion
              key={index}
              defaultExpanded={index === 0}
              disableGutters
              elevation={0}
              sx={{
                border: "1px solid #b7e7db",
                borderRadius: "12px",
                boxShadow: "0px 4px 6px rgba(0,0,0,0.05)",
                mb: 2,
                bgcolor: "#fff",
                overflow: "hidden",
                "&.Mui-expanded": {
                  bgcolor: "#fff",
                  margin: "0 0 16px 0",
                },
                "&:before": { display: "none" },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ color: "#3b3b3b" }} />}
                aria-controls={`shop-term-${index}-content`}
                id={`shop-term-${index}-header`}
                sx={{
                  "& .MuiAccordionSummary-content": {
                    alignItems: "center",
                    columnGap: "8px",
                    margin: "12px 0",
                  },
                }}
              >
                <HelpOutlineOutlinedIcon sx={{ fontSize: 20, color: "#00cc99", flexShrink: 0 }} />
                <span
                  className={`${dmSans.style.fontFamily} text-left font-semibold text-[#3b3b3b] text-base`}
                >
                  {item.title}
                </span>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0, pb: 2 }}>
                {item.subtitle ? (
                  <p className={`${dmSans.className} text-sm text-[#3b3b3b]`}>{item.subtitle}</p>
                ) : null}
                <ul className="mt-2 list-disc pl-4">
                  {item.description.map((desc, descIndex) => {
                    return (
                      <li key={descIndex} className="mb-2 text-sm text-[#7f7f7f]">
                        <p className={`${dmSans.className}`}>{desc}</p>
                      </li>
                    );
                  })}
                </ul>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </div>
    </div>
  );
}
