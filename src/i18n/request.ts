import { TRANSLATIONS_DISABLED } from "@/constants/translations";
import { getRequestConfig } from "next-intl/server";

import en from "../messages/en.json";
import th from "../messages/th.json";
import { createGetMessageFallback } from "./intlMessageFallback";
import { mergeHeaderSearchMessages } from "./headerSearchMerge";
import { mergePdpaConsentBannerMessages } from "./pdpaConsentBannerMerge";
import { mergeProfilePopperMessages } from "./profilePopperMerge";
import { mergeMissingOrdersMessages } from "./missingOrdersMerge";
import { mergeWithdrawCtaMessages } from "./withdrawCtaMerge";
import { mergeGogoquestHistoryMessages } from "./gogoquestHistoryMerge";

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) || "en";
  const messageLocale = TRANSLATIONS_DISABLED ? "en" : locale;
  const catalog = messageLocale === "th" ? "th" : "en";

  /** Static imports avoid Turbopack occasionally serving a stale/partial chunk for `import(\`../messages/${locale}.json\`)`. */
  const baseMessages = (messageLocale === "th" ? th : en) as Record<string, unknown>;
  const withMissingOrders = mergeMissingOrdersMessages(baseMessages, catalog) as Record<
    string,
    unknown
  >;
  const messages = mergeGogoquestHistoryMessages(
    mergePdpaConsentBannerMessages(
      mergeHeaderSearchMessages(
        mergeProfilePopperMessages(
          mergeWithdrawCtaMessages(withMissingOrders, catalog) as Record<string, unknown>,
          catalog
        ) as Record<string, unknown>,
        catalog
      ) as Record<string, unknown>,
      catalog
    ) as Record<string, unknown>,
    catalog
  ) as Record<string, unknown>;

  return {
    locale,
    messages,
    getMessageFallback: createGetMessageFallback(messageLocale),
  };
});
