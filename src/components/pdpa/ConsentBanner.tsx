"use client";

import { Box, Button, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link as I18nLink } from "@/i18n/navigation";

const STORAGE_KEY = "pdpa_consent_banner_dismissed_v1";

export default function ConsentBanner() {
  const t = useTranslations();
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
      aria-label={t("pdpaConsentBannerTitle")}
      className="fixed bottom-0 left-0 right-0 z-[1200] border-t border-[#e0e0e0] bg-white p-4 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] md:px-8"
    >
      <div className="mx-auto flex max-w-[1080px] flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <Typography variant="subtitle2" fontWeight={700}>
            {t("pdpaConsentBannerTitle")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("pdpaConsentBannerBody")}{" "}
            <I18nLink href="/privacy-policy" className="text-[#00AA80] underline">
              {t("footerPrivacyPolicy")}
            </I18nLink>
            {". "}
            <I18nLink href="/privacy-center" className="text-[#00AA80] underline">
              {t("navPrivacyCenter")}
            </I18nLink>
          </Typography>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="small" variant="contained" onClick={() => void acceptEssential()}>
            {t("pdpaConsentAccept")}
          </Button>
          <Button size="small" variant="outlined" component={I18nLink} href="/privacy-center">
            {t("pdpaConsentCustomize")}
          </Button>
          <Button size="small" onClick={dismiss}>
            {t("pdpaConsentLater")}
          </Button>
        </div>
      </div>
    </Box>
  );
}
