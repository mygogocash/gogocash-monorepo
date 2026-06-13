"use client";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  IconButton,
  Typography,
} from "@mui/material";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { GOGOCASH_GITBOOK_LEARN_SHOPPING_HREF } from "@/constants/navigation";

const detailsPaddingLeft = "calc(16px + 21px + 8px)";

const ACCORDION_ITEMS = [
  { q: "golinkResultTermExclusionsQ", a: "golinkResultTermExclusionsA" },
  { q: "golinkResultTermRefundsQ", a: "golinkResultTermRefundsA" },
  { q: "golinkResultTermTrackingQ", a: "golinkResultTermTrackingA" },
  { q: "golinkResultTermOtherQ", a: "golinkResultTermOtherA" },
] as const;

export type GoLinkTermsExclusionsPanelProps = {
  onClosePanel: () => void;
};

/**
 * Right column for GoLink result — Figma node 9669:184863 (Terms and Exclusions + Cashback Tips).
 */
export function GoLinkTermsExclusionsPanel({ onClosePanel }: GoLinkTermsExclusionsPanelProps) {
  const t = useTranslations();

  return (
    <aside
      className="flex w-full min-w-0 flex-col lg:max-h-[min(85vh,640px)] lg:w-[360px] lg:shrink-0 lg:overflow-y-auto"
      aria-labelledby="golink-terms-title"
    >
      <div className="mb-4 flex w-full shrink-0 items-center gap-2">
        <IconButton
          type="button"
          onClick={onClosePanel}
          aria-label={t("golinkResultTermsBackAria")}
          className="lg:hidden"
          size="small"
          sx={{ color: "#3b3b3b" }}
        >
          <ChevronLeftIcon fontSize="small" />
        </IconButton>
        <h2
          id="golink-terms-title"
          className="flex-1 text-xl font-semibold leading-snug text-[#3b3b3b] lg:text-2xl"
        >
          {t("golinkResultTermsPanelTitle")}
        </h2>
      </div>

      <div className="flex flex-col gap-2">
        {ACCORDION_ITEMS.map(({ q, a }, index) => (
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
              className="px-4 py-4"
              sx={{
                minHeight: 0,
                "& .MuiAccordionSummary-content": {
                  margin: "12px 0",
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
                  className="text-base font-medium leading-normal text-[#3b3b3b]"
                >
                  {t(q)}
                </Typography>
              </div>
            </AccordionSummary>
            <AccordionDetails className="pt-0 pb-4 pr-4" sx={{ paddingLeft: detailsPaddingLeft }}>
              <Typography
                component="div"
                className="text-sm font-normal leading-normal text-[#7f7f7f]"
              >
                {t(a)}{" "}
                <a
                  href={GOGOCASH_GITBOOK_LEARN_SHOPPING_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[#00aa80] underline decoration-[#00aa80]/40 underline-offset-2 hover:decoration-[#00aa80]"
                >
                  {t("golinkResultTermLearnMore")}
                </a>
              </Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </div>

      <section className="mt-8 flex flex-col gap-3" aria-label={t("golinkResultCashbackTipsTitle")}>
        <div className="flex shrink-0 items-start gap-2">
          <span className="text-xl leading-none" aria-hidden>
            💡
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold leading-snug text-[#3b3b3b]">
              {t("golinkResultCashbackTipsTitle")}
            </p>
            <p className="mt-1 text-xs leading-snug text-[#7f7f7f]">
              {t("golinkResultCashbackTipsScrollHint")}
            </p>
          </div>
        </div>

        <figure className="mb-1 w-full overflow-hidden rounded-2xl border border-[#e4e4e4] bg-[#f0fdfa]">
          <Image
            src="/golink-result/cashback-tips-terms.svg"
            alt={t("golinkResultCashbackTipsInfographicAlt")}
            width={368}
            height={1337}
            className="h-auto w-full object-contain object-top"
            sizes="(max-width: 1024px) 92vw, 360px"
            unoptimized
          />
        </figure>
      </section>
    </aside>
  );
}
