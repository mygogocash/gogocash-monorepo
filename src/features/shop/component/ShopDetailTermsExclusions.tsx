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
type ShopTermDescription = {
  kind: "text";
  text: string;
};

type ShopTermLinkDescription = {
  kind: "link";
  text: string;
  href: string;
};

type ShopTermSection = {
  title: string;
  subtitle: string;
  description: Array<ShopTermDescription | ShopTermLinkDescription>;
};

export function ShopDetailTermsExclusions() {
  const t = useTranslations();

  const termSections = useMemo<ShopTermSection[]>(
    () => [
      {
        title: t("Exclusions"),
        subtitle: t("You won't get Cashback on:"),
        description: [
          {
            kind: "text",
            text: t("Purchases made with Vouchers or Promo codes not featured on our platform"),
          },
          {
            kind: "text",
            text: t("Taxes · Service charges · Shipping and delivery"),
          },
        ],
      },
      {
        title: t("Refunds, Cancellations, & no-shows"),
        subtitle: t(
          "Any rejected, cancelled, refunded, exchanged or returned purchases will not be eligible for Cashback"
        ),
        description: [
          {
            kind: "text",
            text: t(
              "For partial returns or exchanges, we'll prorate the Cashback as an adjustment"
            ),
          },
        ],
      },
      {
        title: t("Tracking Disclaimers"),
        subtitle: "",
        description: [
          {
            kind: "text",
            text: t(
              "Your Cashback may be tracked at a different rate initially and adjusted to the correct rate when we confirm the transaction details"
            ),
          },
        ],
      },
      {
        title: t("Other terms and conditions"),
        subtitle: "",
        description: [
          {
            kind: "link",
            text: t("GoGoCash terms of use"),
            href: "https://gogocash.co/term-of-use",
          },
        ],
      },
    ],
    [t]
  );

  return (
    <section className="min-w-0" aria-labelledby="shop-detail-terms-heading">
      <h2 id="shop-detail-terms-heading" className="mb-4 text-xl font-semibold text-(--gc-text)">
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
              border: "1px solid var(--gc-border-mint)",
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
              expandIcon={<ExpandMoreIcon sx={{ color: "var(--gc-text)" }} />}
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
              <HelpOutlineOutlinedIcon
                sx={{ fontSize: 20, color: "var(--gc-primary)", flexShrink: 0 }}
              />
              <span
                className={`${dmSans.className} text-left font-semibold text-(--gc-text) text-base`}
              >
                {item.title}
              </span>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0, pb: 2 }}>
              {item.subtitle ? (
                <p className={`${dmSans.className} text-sm text-(--gc-text)`}>{item.subtitle}</p>
              ) : null}
              <ul className="mt-2 list-disc pl-4">
                {item.description.map((desc, descIndex) => {
                  return (
                    <li key={descIndex} className="mb-2 text-sm text-(--gc-text-muted)">
                      {desc.kind === "link" ? (
                        <a
                          href={desc.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`${dmSans.className} rounded-[2px] font-medium text-(--gc-primary) underline decoration-[1.5px] underline-offset-2 transition-colors hover:text-(--gc-primary-strong) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--gc-primary)`}
                        >
                          {desc.text}
                        </a>
                      ) : (
                        <p className={dmSans.className}>{desc.text}</p>
                      )}
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
