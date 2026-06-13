"use client";

import InfoOutlined from "@mui/icons-material/InfoOutlined";
import InsertLinkOutlined from "@mui/icons-material/InsertLinkOutlined";
import { IconButton } from "@mui/material";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { GoLinkGuidelineDialog } from "./GoLinkGuidelineDialog";
import { GoLinkResultDialog } from "./GoLinkResultDialog";
import { GoLinkBannerIllustration } from "./GoLinkBannerIllustration";

function looksLikeHttpUrl(text: string): boolean {
  try {
    const u = new URL(text);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export type GoLinkFeatureProps = {
  /** Tighter layout + stacked actions for mobile sheet/modal. */
  variant?: "default" | "modal";
};

/**
 * GoGoLink paste-and-shop card (shared by home banner and `/golink` page/modal).
 */
export default function GoLinkFeature({ variant = "default" }: GoLinkFeatureProps) {
  const t = useTranslations();
  const [value, setValue] = useState("");
  const [guidelineOpen, setGuidelineOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [resultHref, setResultHref] = useState<string | null>(null);

  const pasteAndGo = useCallback(async () => {
    let next = value.trim();
    if (!next) {
      try {
        next = (await navigator.clipboard.readText()).trim();
        setValue(next);
      } catch {
        toast.error(t("golinkBannerClipboardDenied"));
        return;
      }
    }

    if (!next) {
      toast.error(t("golinkBannerEmpty"));
      return;
    }

    if (!looksLikeHttpUrl(next)) {
      toast.error(t("golinkBannerInvalidUrl"));
      return;
    }

    setResultHref(next);
    setResultOpen(true);
  }, [t, value]);

  const isModal = variant === "modal";

  return (
    <div
      className={`relative isolate flex w-full flex-col items-stretch overflow-hidden shadow-[0px_4px_10px_rgba(4,16,34,0.06),0px_25px_75px_rgba(7,33,102,0.12)] lg:flex-row lg:items-center lg:pr-5 ${
        isModal
          ? "gap-5 rounded-[24px] px-4 py-6 lg:gap-12 lg:rounded-[32px] lg:px-8 lg:py-9"
          : "gap-7 rounded-[32px] px-5 py-8 md:px-8 md:py-9 lg:gap-12"
      }`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundColor: "#F8FBFF",
          backgroundImage: [
            "radial-gradient(ellipse 95% 165% at 78% 108%, rgba(0, 204, 153, 0.3) 0%, transparent 52%)",
            "linear-gradient(90deg, #D8F8EF 0%, #EAF4FF 52%, #EAF4FF 100%)",
          ].join(", "),
        }}
      />
      <IconButton
        type="button"
        aria-label={t("golinkBannerInfoAria")}
        aria-haspopup="dialog"
        aria-expanded={guidelineOpen}
        onClick={() => setGuidelineOpen(true)}
        className="text-[#0a5c4a]/55 transition hover:bg-[#00CC99]/10 hover:text-[#00AA80]"
        sx={{
          position: "absolute",
          right: { xs: 12, md: 20 },
          top: { xs: 12, md: 20 },
          zIndex: 10,
          width: 24,
          height: 24,
          minWidth: 24,
          padding: 0,
        }}
      >
        <InfoOutlined sx={{ fontSize: 18 }} />
      </IconButton>
      <GoLinkGuidelineDialog open={guidelineOpen} onClose={() => setGuidelineOpen(false)} />
      <GoLinkResultDialog
        open={resultOpen}
        href={resultHref}
        onClose={() => {
          setResultOpen(false);
          setResultHref(null);
        }}
      />

      <div
        className={`relative z-1 mx-auto w-full shrink-0 lg:mx-0 ${
          isModal ? "max-h-[min(160px,28vh)] max-w-[min(100%,320px)]" : "max-w-[min(100%,420px)]"
        }`}
      >
        <GoLinkBannerIllustration
          className={`h-auto w-full drop-shadow-[0_12px_32px_rgba(0,170,128,0.08)] ${
            isModal ? "max-h-[min(160px,28vh)] object-contain object-center" : ""
          }`}
        />
      </div>

      <div
        className={`relative z-1 flex min-w-0 flex-1 flex-col lg:gap-6 ${isModal ? "gap-4" : "gap-5"}`}
      >
        <h2
          id="golink-banner-heading"
          className={`pr-10 font-semibold leading-tight tracking-[-0.02em] text-[#0a5c4a] lg:pr-12 lg:text-[32px] ${
            isModal ? "text-lg sm:text-xl" : "text-[22px] md:text-[28px]"
          }`}
        >
          {t("golinkBannerTitle")}
        </h2>

        <div
          className={
            isModal
              ? "flex flex-col gap-3"
              : "flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-3"
          }
        >
          <div className="relative flex min-h-12 min-w-0 flex-1 items-center">
            <InsertLinkOutlined
              className="pointer-events-none absolute left-4 text-[#00AA80]"
              sx={{ fontSize: 18, opacity: 0.45 }}
              aria-hidden
            />
            <input
              type="url"
              inputMode="url"
              autoComplete="off"
              placeholder={t("golinkBannerInputPlaceholder")}
              aria-label={t("golinkBannerInputAria")}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void pasteAndGo();
              }}
              className="h-12 w-full min-w-0 rounded-2xl border border-[#00AA80]/35 bg-white/95 py-3 pl-11 pr-4 text-base text-[#2d3f3a] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] outline-none ring-0 placeholder:text-[#5c726b]/55 transition-[box-shadow,border-color] focus:border-[#00CC99] focus:ring-2 focus:ring-[#00CC99]/25"
            />
          </div>
          <button
            type="button"
            onClick={() => void pasteAndGo()}
            className={`inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-[#00CC99] text-base font-semibold text-white shadow-[0_8px_28px_-6px_rgba(0,204,153,0.55)] transition hover:bg-[#00b889] hover:shadow-[0_10px_32px_-6px_rgba(0,204,153,0.58)] active:scale-[0.99] ${
              isModal
                ? "w-full px-8 whitespace-normal sm:whitespace-nowrap"
                : "px-8 whitespace-nowrap sm:px-10"
            }`}
          >
            {t("golinkBannerPasteAndGo")}
          </button>
        </div>
      </div>
    </div>
  );
}
