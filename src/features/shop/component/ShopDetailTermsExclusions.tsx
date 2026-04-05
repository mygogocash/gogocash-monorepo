"use client";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import { Accordion, AccordionDetails, AccordionSummary } from "@mui/material";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { dmSans } from "@/lib/utils";

/**
 * Merchant detail — Terms & exclusions accordions (shared mobile/desktop).
 * On mobile, ShopDetail places this after ShopDetailRightRail so it sits below Cashback Tips.
 */
export function ShopDetailTermsExclusions() {
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
    <section className="min-w-0" aria-labelledby="shop-detail-terms-heading">
      <h2 id="shop-detail-terms-heading" className="mb-4 text-xl font-semibold text-[#3b3b3b]">
        {t("Terms and exclusions")}
      </h2>
      {termSections.map((item, index) => {
        return (
          <Accordion
            key={`shop-term-${index}-${item.title}`}
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
    </section>
  );
}
