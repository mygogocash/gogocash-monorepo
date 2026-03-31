"use client";

import { useLocale } from "next-intl";
import { useEffect } from "react";

/**
 * Keeps `document.documentElement.lang` and `body.locale-*` in sync when the user
 * switches EN/TH via client navigation (root layout may not re-run on the server).
 */
export default function LocaleHtmlSync() {
  const locale = useLocale();

  useEffect(() => {
    document.documentElement.lang = locale;
    document.body.classList.remove("locale-en", "locale-th");
    document.body.classList.add(locale === "th" ? "locale-th" : "locale-en");
  }, [locale]);

  return null;
}
