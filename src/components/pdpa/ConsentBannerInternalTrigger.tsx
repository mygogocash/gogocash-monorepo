"use client";

import { useTranslations } from "next-intl";
import { env } from "@/env";
import { requestOpenConsentBanner } from "@/lib/pdpa/consentBannerChannel";

function shouldShowInternalConsentTrigger(): boolean {
  if (process.env.NODE_ENV === "development") return true;
  const v = env.NEXT_PUBLIC_INTERNAL_CONSENT_BANNER_BUTTON;
  return v === "1" || v === "true";
}

/**
 * Floating control to reopen the PDPA cookie banner (clears dismissal so it matches first visit).
 * Visible in development, or when `NEXT_PUBLIC_INTERNAL_CONSENT_BANNER_BUTTON=1`.
 */
export default function ConsentBannerInternalTrigger() {
  const t = useTranslations();

  if (!shouldShowInternalConsentTrigger()) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => requestOpenConsentBanner()}
      className="fixed bottom-[calc(var(--gc-mobile-nav-clearance)+0.75rem+var(--gc-safe-bottom))] left-[max(0.75rem,var(--gc-safe-left))] z-[1190] rounded-full border border-[#1d1929]/15 bg-white/95 px-3 py-2 text-xs font-semibold text-[#1d1929] shadow-md backdrop-blur-sm transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00cc99] md:bottom-8 md:left-8 md:px-3.5 md:text-[13px]"
      aria-label={t("cookieBannerInternalTriggerAria")}
    >
      {t("cookieBannerInternalTrigger")}
    </button>
  );
}
