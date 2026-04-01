import { TRANSLATIONS_DISABLED } from "@/constants/translations";
import { getRequestConfig } from "next-intl/server";

import en from "../messages/en.json";
import th from "../messages/th.json";
import { buildMessagesForLocale } from "./buildMessagesForLocale";
import { createGetMessageFallback } from "./intlMessageFallback";

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) || "en";
  const messageLocale = TRANSLATIONS_DISABLED ? "en" : locale;
  const catalog = messageLocale === "th" ? "th" : "en";

  /** Static imports avoid Turbopack occasionally serving a stale/partial chunk for `import(\`../messages/${locale}.json\`)`. */
  const baseMessages = (messageLocale === "th" ? th : en) as Record<string, unknown>;
  const messages = buildMessagesForLocale(baseMessages, catalog);

  return {
    locale,
    messages,
    getMessageFallback: createGetMessageFallback(messageLocale),
  };
});
