"use client";

import CloseIcon from "@mui/icons-material/Close";
import { Dialog, IconButton } from "@mui/material";
import Image from "next/image";
import { useTranslations } from "next-intl";

export type GoLinkGuidelineDialogProps = {
  open: boolean;
  onClose: () => void;
};

/**
 * GoGoCash 1.1 — Figma node 9669:184667 (Guideline Pop Up): Copy → Paste flow + 3 steps.
 * Raster assets under `/public/golink-guideline/` (exported from Figma MCP).
 */
export function GoLinkGuidelineDialog({ open, onClose }: GoLinkGuidelineDialogProps) {
  const t = useTranslations();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="golink-guideline-title"
      aria-describedby="golink-guideline-desc"
      slotProps={{
        backdrop: { sx: { backgroundColor: "rgba(0,0,0,0.45)" } },
      }}
      sx={{
        "& .MuiDialog-paper": {
          borderRadius: "24px",
          maxWidth: "560px",
          width: "100%",
          margin: "16px",
          maxHeight: "min(90vh, 720px)",
          overflow: "hidden",
        },
      }}
    >
      <div className="relative flex max-h-[min(90vh,720px)] flex-col overflow-y-auto px-6 pb-8 pt-14">
        <IconButton
          type="button"
          onClick={onClose}
          aria-label={t("golinkGuidelineCloseAria")}
          className="!absolute !right-3 !top-3 text-[#3B3B3B]"
          size="small"
        >
          <CloseIcon fontSize="small" />
        </IconButton>

        <div className="relative mb-10 flex min-h-[100px] flex-col items-center justify-center sm:mb-12">
          <div
            className="pointer-events-none absolute left-1/2 top-0 z-0 w-[120px] -translate-x-[20%] sm:left-[28%] sm:translate-x-0"
            aria-hidden
          >
            <Image
              src="/golink-guideline/hand.png"
              alt={t("golinkGuidelineHandAlt")}
              width={102}
              height={105}
              className="h-auto w-full object-contain opacity-90"
            />
          </div>

          <div className="relative z-[1] flex flex-wrap items-end justify-center gap-5 sm:gap-6">
            <div className="flex flex-col items-center gap-1">
              <div className="relative flex size-16 items-center justify-center overflow-hidden rounded-lg shadow-[inset_0_0_4px_rgba(255,255,255,0.9)]">
                <div
                  className="absolute inset-0 rounded-lg"
                  style={{
                    background: "linear-gradient(141deg, #f6f6f6 50.9%, #e4e4e4 84.7%)",
                  }}
                />
                <Image
                  src="/golink-guideline/link-icon.png"
                  alt={t("golinkGuidelineLinkIconAlt")}
                  width={28}
                  height={28}
                  className="relative z-[1]"
                />
              </div>
              <span className="text-center text-base font-semibold text-[#3b3b3b]">
                {t("golinkGuidelineCopyLabel")}
              </span>
            </div>

            <div className="mb-8 flex items-center sm:mb-9">
              <Image
                src="/golink-guideline/arrow.png"
                alt={t("golinkGuidelineArrowAlt")}
                width={33}
                height={16}
                className="h-4 w-auto object-contain"
              />
            </div>

            <div className="flex flex-col items-center gap-1">
              <div className="relative flex size-16 items-center justify-center overflow-hidden rounded-lg bg-white shadow-sm">
                <Image
                  src="/golink-guideline/gogocash-icon.png"
                  alt={t("golinkGuidelineGogocashIconAlt")}
                  width={48}
                  height={48}
                  className="object-contain"
                />
              </div>
              <span className="text-center text-base font-semibold text-[#3b3b3b]">
                {t("golinkGuidelinePasteLabel")}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1 text-[#3b3b3b]">
          <h2
            id="golink-guideline-title"
            className="text-xl font-semibold leading-snug sm:text-2xl"
          >
            {t("golinkGuidelineTitle")}
          </h2>
          <p
            id="golink-guideline-desc"
            className="text-base leading-snug text-[#3b3b3b]/90 sm:text-lg"
          >
            {t("golinkGuidelineSubtitle")}
          </p>
        </div>

        <ol className="mt-6 flex list-none flex-col gap-0">
          <li className="flex gap-4 py-2">
            <GoLinkStepThumb step={1} illustrationAlt={t("golinkGuidelineStepIllustrationAlt")} />
            <p className="min-w-0 flex-1 text-sm leading-normal text-[#3b3b3b]">
              {t("golinkGuidelineStep1")}
            </p>
          </li>
          <li className="border-y border-[#e4e4e4] py-2">
            <div className="flex gap-4">
              <GoLinkStepThumb step={2} illustrationAlt={t("golinkGuidelineStepIllustrationAlt")} />
              <p className="min-w-0 flex-1 text-sm leading-normal text-[#3b3b3b]">
                {t("golinkGuidelineStep2")}
              </p>
            </div>
          </li>
          <li className="flex gap-4 py-2">
            <GoLinkStepThumb step={3} illustrationAlt={t("golinkGuidelineStepIllustrationAlt")} />
            <p className="min-w-0 flex-1 text-sm leading-normal text-[#3b3b3b]">
              {t("golinkGuidelineStep3")}
            </p>
          </li>
        </ol>
      </div>
    </Dialog>
  );
}

function GoLinkStepThumb({ step, illustrationAlt }: { step: 1 | 2 | 3; illustrationAlt: string }) {
  return (
    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-[#f3f4f6]">
      <Image
        src="/golink-guideline/step-1.png"
        alt={illustrationAlt}
        width={96}
        height={96}
        className="h-full w-full object-cover"
      />
      <div className="absolute -left-0.5 -top-0.5 flex size-[22px] items-center justify-center rounded-full bg-[#00CC99] text-[13px] font-semibold leading-none text-white shadow-sm">
        {step}
      </div>
    </div>
  );
}
