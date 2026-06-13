"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import Close from "@mui/icons-material/Close";
import { IconButton } from "@mui/material";
import { GC_IN_APP_HINT_SESSION_KEY } from "@/lib/miniapp/constants";

interface InAppBrowserHintProps {
  onDismissSession: () => void;
}

/**
 * Compact, dismissible hint for super-app WebViews: open in system browser or copy link.
 */
export default function InAppBrowserHint({ onDismissSession }: InAppBrowserHintProps) {
  const t = useTranslations();
  const [copied, setCopied] = useState(false);

  const dismiss = useCallback(() => {
    try {
      sessionStorage.setItem(GC_IN_APP_HINT_SESSION_KEY, "1");
    } catch {
      /* ignore */
    }
    onDismissSession();
  }, [onDismissSession]);

  const openExternal = useCallback(() => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const copyLink = useCallback(async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, []);

  return (
    <div
      role="status"
      className="gc-in-app-hint fixed z-[55] max-md:left-[max(0.75rem,var(--gc-safe-left))] max-md:right-[max(0.75rem,var(--gc-safe-right))] max-md:block md:hidden"
    >
      <div className="flex items-start gap-2 rounded-2xl border border-[#d8e2d9] bg-white/95 px-3 py-2.5 shadow-[0_8px_28px_rgba(16,34,23,0.12)] backdrop-blur-md">
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-xs font-semibold text-[#103522]">{t("miniappInAppBrowserTitle")}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-[#6D7B73]">
            {t("miniappInAppBrowserBody")}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openExternal}
              className="min-h-11 touch-manipulation rounded-full bg-[#00B14F] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00cc99]"
            >
              {t("miniappOpenInBrowser")}
            </button>
            <button
              type="button"
              onClick={() => void copyLink()}
              className="min-h-11 touch-manipulation rounded-full border border-[#d8e2d9] bg-white px-3.5 py-2 text-xs font-semibold text-[#103522] transition active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00cc99]"
            >
              {copied ? t("miniappLinkCopied") : t("miniappCopyLink")}
            </button>
          </div>
        </div>
        <IconButton
          size="small"
          onClick={dismiss}
          aria-label={t("miniappDismissHint")}
          className="!size-9 shrink-0 text-[#6D7B73]"
        >
          <Close fontSize="small" />
        </IconButton>
      </div>
    </div>
  );
}
