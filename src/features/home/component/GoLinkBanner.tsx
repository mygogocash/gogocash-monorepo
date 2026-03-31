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

export default function GoLinkBanner() {
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

  return (
    <section className="gc-home-golink-section w-full" aria-labelledby="golink-banner-heading">
      <div
        className="relative overflow-hidden rounded-[32px] px-5 py-7 shadow-[0px_4px_10px_rgba(4,16,34,0.06),0px_25px_75px_rgba(7,33,102,0.12)] md:px-8 md:py-8"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 90% 120% at 92% 100%, rgba(0,204,153,0.28), transparent 55%), linear-gradient(90deg, #D8F8EF 0%, #EAF4FF 52.58%), #F8FBFF",
        }}
      >
        <IconButton
          type="button"
          size="small"
          aria-label={t("golinkBannerInfoAria")}
          aria-haspopup="dialog"
          aria-expanded={guidelineOpen}
          onClick={() => setGuidelineOpen(true)}
          className="z-10 text-[#3B3B3B]"
          sx={{
            position: "absolute",
            right: { xs: 12, md: 20 },
            top: { xs: 12, md: 20 },
            opacity: 0.75,
          }}
        >
          <InfoOutlined fontSize="small" />
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

        <div className="flex flex-col items-stretch gap-8 lg:flex-row lg:items-center lg:gap-10 lg:pr-4">
          <div className="mx-auto w-full max-w-[min(100%,380px)] shrink-0 lg:mx-0">
            <GoLinkBannerIllustration className="h-auto w-full" />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-5 lg:gap-6">
            <h2
              id="golink-banner-heading"
              className="pr-10 text-[22px] font-semibold leading-snug text-[#005D46] md:text-[28px] lg:pr-12 lg:text-[32px]"
            >
              {t("golinkBannerTitle")}
            </h2>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
              <div className="relative flex min-h-12 min-w-0 flex-1 items-center">
                <InsertLinkOutlined
                  className="pointer-events-none absolute left-4 text-[#3B3B3B]"
                  sx={{ fontSize: 18, opacity: 0.38 }}
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
                  className="h-12 w-full min-w-0 rounded-2xl border border-[#0064D6] bg-white py-3 pl-11 pr-4 text-base text-[#3B3B3B] outline-none ring-[#0064D6]/25 placeholder:text-[#3B3B3B]/45 focus:ring-2"
                />
              </div>
              <button
                type="button"
                onClick={() => void pasteAndGo()}
                className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-[#3B3B3B] px-8 text-base font-medium whitespace-nowrap text-white transition hover:bg-[#2c2c2c] sm:px-10"
              >
                {t("golinkBannerPasteAndGo")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
