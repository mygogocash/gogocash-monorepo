"use client";

import Cookie from "@mui/icons-material/Cookie";
import { Box, Button, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { Link as I18nLink, useRouter } from "@/i18n/navigation";
import { TRANSLATIONS_DISABLED } from "@/constants/translations";
import { getPdpaConsentBannerCopy } from "@/i18n/pdpaConsentBannerMerge";

/** Dark bar + cookie icon + secondary / primary CTAs. */
const BANNER_BG = "#1d1929";
const BODY_MUTED = "#d1d1d4";
const CTA_GREEN = "#00cc99";
const CTA_GREEN_DEEP = "#00aa80";

const STORAGE_KEY = "pdpa_consent_banner_dismissed_v1";

const linkClass =
  "font-bold text-inherit underline decoration-solid underline-offset-2 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80";

export default function ConsentBanner() {
  const router = useRouter();
  const locale = useLocale();
  const bannerCopy = useMemo(() => {
    const catalog: "en" | "th" = TRANSLATIONS_DISABLED ? "en" : locale === "th" ? "th" : "en";
    return getPdpaConsentBannerCopy(catalog);
  }, [locale]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const run = () => {
      try {
        if (typeof window !== "undefined" && !localStorage.getItem(STORAGE_KEY)) {
          setVisible(true);
        }
      } catch {
        setVisible(true);
      }
    };
    queueMicrotask(run);
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  const goToCookieSettings = () => {
    dismiss();
    router.push("/privacy-center");
  };

  const acceptEssential = async () => {
    try {
      await fetch("/api/pdpa/consent", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purposes: [
            {
              purposeCode: "CASHBACK_TRACKING",
              granted: true,
              consentText: "Essential cashback & contract — banner accept",
            },
            {
              purposeCode: "ANALYTICS_TRACKING",
              granted: true,
              consentText: "Product analytics — banner accept",
            },
          ],
          method: "IN_APP_ONBOARDING",
        }),
      });
    } catch {
      /* non-logged-in users: ignore */
    }
    dismiss();
  };

  if (!visible) return null;

  return (
    <Box
      role="dialog"
      aria-labelledby="pdpa-consent-banner-title"
      aria-describedby="pdpa-consent-banner-desc"
      className="fixed bottom-0 left-0 right-0 z-[1200] shadow-[0_-8px_32px_rgba(0,0,0,0.35)]"
      sx={{
        bgcolor: BANNER_BG,
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-5 px-4 py-6 sm:flex-row sm:items-center sm:gap-5 sm:px-6">
        <div className="flex min-w-0 flex-1 items-start gap-4 sm:gap-5 sm:items-center">
          <Box
            className="shrink-0"
            sx={{
              color: "#f4c430",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-hidden
          >
            <Cookie sx={{ fontSize: { xs: 36, sm: 40 } }} />
          </Box>
          <div className="min-w-0 flex-1">
            <Typography
              id="pdpa-consent-banner-title"
              component="p"
              variant="body1"
              sx={{
                m: 0,
                mb: 0.5,
                fontWeight: 700,
                color: "#ffffff",
                fontSize: { xs: "0.9375rem", sm: 16 },
                lineHeight: "20px",
              }}
            >
              {bannerCopy.title}
            </Typography>
            <Typography
              id="pdpa-consent-banner-desc"
              component="p"
              variant="body2"
              sx={{
                m: 0,
                color: BODY_MUTED,
                fontSize: { xs: "0.875rem", sm: 16 },
                lineHeight: 1.5,
              }}
            >
              {bannerCopy.bodyPart1}
              <I18nLink href="/privacy-policy" className={linkClass}>
                {bannerCopy.privacyPolicyLabel}
              </I18nLink>
              {bannerCopy.bodyPart2}
            </Typography>
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:pl-4 md:pl-8">
          <Button
            type="button"
            variant="text"
            onClick={goToCookieSettings}
            sx={{
              alignSelf: { xs: "stretch", sm: "center" },
              minHeight: 0,
              px: 1.5,
              py: 0.75,
              fontWeight: 600,
              fontSize: 13,
              lineHeight: 1.3,
              letterSpacing: "0.02em",
              textTransform: "none",
              color: "rgba(255,255,255,0.92)",
              borderRadius: "999px",
              border: "1px solid rgba(244, 196, 48, 0.45)",
              bgcolor: "rgba(255,255,255,0.06)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
              flex: { xs: "none", sm: "0 0 auto" },
              "&:hover": {
                bgcolor: "rgba(244, 196, 48, 0.12)",
                borderColor: "rgba(244, 196, 48, 0.65)",
                color: "#fff",
              },
            }}
          >
            {bannerCopy.decline}
          </Button>
          <Button
            type="button"
            variant="contained"
            disableElevation
            onClick={() => void acceptEssential()}
            sx={{
              alignSelf: { xs: "stretch", sm: "center" },
              minHeight: 48,
              minWidth: { sm: 168 },
              px: 2.5,
              py: 1.25,
              fontWeight: 700,
              fontSize: 15,
              lineHeight: 1.25,
              textTransform: "none",
              color: "#ffffff",
              borderRadius: "14px",
              background: `linear-gradient(180deg, ${CTA_GREEN} 0%, ${CTA_GREEN_DEEP} 100%)`,
              boxShadow: "0 4px 18px rgba(0, 204, 153, 0.45), 0 1px 0 rgba(255,255,255,0.2) inset",
              flex: { xs: 1, sm: "0 0 auto" },
              transition: "transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease",
              "&:hover": {
                background: `linear-gradient(180deg, #00e0b0 0%, ${CTA_GREEN} 100%)`,
                boxShadow:
                  "0 6px 22px rgba(0, 204, 153, 0.55), 0 1px 0 rgba(255,255,255,0.25) inset",
                filter: "brightness(1.02)",
              },
              "&:active": {
                transform: "scale(0.98)",
              },
            }}
          >
            {bannerCopy.allow}
          </Button>
        </div>
      </div>
    </Box>
  );
}
