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
 * Assets under `/public/golink-guideline/` (Figma exports).
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

        <div className="relative mb-10 flex w-full min-h-[90px] flex-col items-center justify-center sm:mb-12">
          <Image
            src="/golink-guideline/copy-paste-flow.svg"
            alt={`${t("golinkGuidelineCopyLabel")} · ${t("golinkGuidelinePasteLabel")}`}
            width={552}
            height={90}
            className="h-auto w-full max-w-full object-contain"
            sizes="(max-width: 560px) 100vw, 520px"
            unoptimized
          />
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

const GOLINK_STEP_THUMB_SRC: Record<1 | 2 | 3, string> = {
  1: "/golink-guideline/step-preview-1.svg",
  2: "/golink-guideline/step-preview-2.svg",
  3: "/golink-guideline/step-preview-3.svg",
};

function GoLinkStepThumb({ step, illustrationAlt }: { step: 1 | 2 | 3; illustrationAlt: string }) {
  return (
    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-[#f3f4f6]">
      <Image
        src={GOLINK_STEP_THUMB_SRC[step]}
        alt={illustrationAlt}
        width={96}
        height={96}
        className="h-full w-full object-contain"
        unoptimized
      />
    </div>
  );
}
