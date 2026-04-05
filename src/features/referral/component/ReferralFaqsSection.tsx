"use client";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Accordion, AccordionDetails, AccordionSummary, Typography } from "@mui/material";
import Image from "next/image";
import { useTranslations } from "next-intl";

/**
 * Referral FAQ accordion — “Refer Friends FAQs” (mint help icon, teal dividers).
 * @see https://www.figma.com/design/jFDx8MnbCtlCaTQxlhpJIp/GoGoCash-1.1?node-id=8703-281660
 */
export default function ReferralFaqsSection() {
  const t = useTranslations();

  const items = [
    { q: "referralFaqExclusions", a: "referralFaqExclusionsAnswer" },
    { q: "referralFaqRefunds", a: "referralFaqRefundsAnswer" },
    { q: "referralFaqTracking", a: "referralFaqTrackingAnswer" },
    { q: "referralFaqOtherTerms", a: "referralFaqOtherTermsAnswer" },
  ] as const;

  /** Align answer with question text (padding + 21px icon + 8px gap). */
  const detailsPaddingLeft = "calc(16px + 21px + 8px)";

  return (
    <section className="w-full" aria-labelledby="referral-faq-heading">
      <h2 id="referral-faq-heading" className="mb-4 text-2xl font-semibold text-[#3b3b3b]">
        {t("referralFaqTitle")}
      </h2>
      <div className="flex flex-col gap-3 sm:gap-4">
        {items.map(({ q, a }, index) => (
          <Accordion
            key={q}
            defaultExpanded={index === 0}
            disableGutters
            elevation={0}
            sx={{
              border: "1px solid #b7e7db",
              borderRadius: "16px",
              boxShadow: "0px 4px 6px rgba(0,0,0,0.05)",
              bgcolor: "#fff",
              overflow: "hidden",
              "&.Mui-expanded": {
                bgcolor: "#fff",
                margin: 0,
              },
              "&:before": { display: "none" },
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon sx={{ fontSize: 20, color: "#3b3b3b" }} />}
              className="px-4 py-4"
              sx={{
                minHeight: 0,
                "& .MuiAccordionSummary-content": {
                  margin: "12px 0",
                  alignItems: "center",
                  columnGap: "8px",
                },
              }}
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="inline-flex shrink-0" aria-hidden>
                  <Image
                    src="/referral/faq/help-bubble-icon.svg"
                    alt=""
                    width={21}
                    height={21}
                    unoptimized
                    className="size-[21px]"
                  />
                </span>
                <Typography
                  component="span"
                  className="text-left text-base font-semibold leading-normal text-[#3b3b3b]"
                >
                  {t(q)}
                </Typography>
              </div>
            </AccordionSummary>
            <AccordionDetails
              className="pt-0 pb-4 pr-4"
              sx={{
                paddingLeft: detailsPaddingLeft,
              }}
            >
              <Typography
                component="div"
                className="text-sm font-normal leading-normal text-[#7f7f7f]"
              >
                {t(a)}
              </Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </div>
    </section>
  );
}
