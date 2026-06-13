"use client";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Accordion, AccordionDetails, AccordionSummary, Typography } from "@mui/material";
import Image from "next/image";
import { missingOrdersStaticT } from "@/features/missing-orders/missingOrdersStaticT";
import { useLocale } from "next-intl";

const detailsPaddingLeft = "calc(16px + 21px + 8px)";

/**
 * Help Center FAQs under the form (Figma 9620:204935).
 */
export default function MissingOrdersFaqSection() {
  const locale = useLocale();
  const mo = (key: string) => missingOrdersStaticT(locale, key);

  const items = [
    { q: "missingOrdersFaq1Q", a: "missingOrdersFaq1A" },
    { q: "missingOrdersFaq2Q", a: "missingOrdersFaq2A" },
    { q: "missingOrdersFaq3Q", a: "missingOrdersFaq3A" },
  ] as const;

  return (
    <section className="w-full max-w-[948px]" aria-labelledby="missing-orders-faq-heading">
      <h2
        id="missing-orders-faq-heading"
        className="mb-3 w-full text-center text-lg font-semibold text-[#3b3b3b] sm:mb-4 sm:text-xl md:text-2xl md:font-medium"
      >
        {mo("missingOrdersFaqSectionTitle")}
      </h2>
      <div className="flex flex-col gap-2">
        {items.map(({ q, a }, index) => (
          <Accordion
            key={q}
            defaultExpanded={index === 0}
            disableGutters
            elevation={0}
            className="border-0 border-b border-solid border-[#b7e7db] bg-white shadow-[0px_4px_6px_rgba(0,0,0,0.05)] before:hidden"
            sx={{
              "&.Mui-expanded": { margin: 0 },
              "&:before": { display: "none" },
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon sx={{ fontSize: 16, color: "#3b3b3b" }} />}
              className="px-3 py-3 sm:px-4 sm:py-4"
              sx={{
                minHeight: 0,
                "& .MuiAccordionSummary-content": {
                  margin: { xs: "8px 0", sm: "12px 0" },
                  alignItems: "center",
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
                  className="text-sm font-medium leading-normal text-[#3b3b3b] sm:text-base"
                >
                  {mo(q)}
                </Typography>
              </div>
            </AccordionSummary>
            <AccordionDetails
              className="pt-0 pb-3 pr-3 sm:pb-4 sm:pr-4"
              sx={{
                paddingLeft: { xs: "calc(12px + 21px + 8px)", sm: detailsPaddingLeft },
              }}
            >
              <Typography
                component="div"
                className="text-xs font-normal leading-normal text-[#7f7f7f] sm:text-sm"
              >
                {mo(a)}
              </Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </div>
    </section>
  );
}
