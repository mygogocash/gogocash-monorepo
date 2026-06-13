"use client";

import { useEffect } from "react";
import {
  AUTO_LOCALE_DONE_KEY,
  hasSavedLocalePreference,
  isLikelyAutomatedClient,
  persistLocale,
  readBrowserLocaleTags,
} from "@/lib/locale-storage";
import {
  resolveAutoRedirectFromBrowserLocales,
  resolveLocaleForPathname,
} from "@/lib/locale-routing";

/**
 * No visible UI: aligns experience with the browser language once.
 * - From `/` only: redirect to a matched marketing locale (`/th`, `/ja`, `/id`,
 *   `/tw`, `/cn`, or stay on `/` for `en*`) using ordered BCP-47 tags from the browser.
 * - Skips bare `zh` and other ambiguous tags (no redirect).
 * - Skips bots to reduce SEO risk.
 * - Sets `AUTO_LOCALE_DONE_KEY` after the first evaluation so returning to `/`
 *   (e.g. “English site”) does not loop redirects.
 * - Syncs the header dropdown + `document.documentElement.lang` from locale routes
 *   (`/th`, `/id`, `/tw`, `/cn`, `/ja`) when there is no saved preference yet.
 */
export function BrowserLocaleBootstrap() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isLikelyAutomatedClient()) return;

    const path = window.location.pathname;
    const autoDone = localStorage.getItem(AUTO_LOCALE_DONE_KEY);
    const userChose = hasSavedLocalePreference();

    if (!autoDone) {
      if (path === "/") {
        const redirectPath = !userChose
          ? resolveAutoRedirectFromBrowserLocales(readBrowserLocaleTags())
          : null;
        if (redirectPath && redirectPath !== path) {
          localStorage.setItem(AUTO_LOCALE_DONE_KEY, "1");
          window.location.replace(redirectPath);
          return;
        }
      }
      localStorage.setItem(AUTO_LOCALE_DONE_KEY, "1");
    }

    if (!userChose) {
      const routeLocale = resolveLocaleForPathname(path);
      if (routeLocale) {
        persistLocale(routeLocale);
      }
    }
  }, []);

  return null;
}
