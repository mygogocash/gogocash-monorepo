import IntlMessageFormat from "intl-messageformat";

import en from "@/messages/en.json";
import th from "@/messages/th.json";

/**
 * App routing only ships full `en` + `th` JSON catalogs. Formats a flat message key using the
 * bundled JSON + ICU, bypassing `next-intl`'s `messages` prop (Turbopack can omit flat keys on the client).
 */
export function formatMessageFromEnThCatalog(
  messageKey: string,
  locale: string,
  values: Record<string, string | number>
): string {
  const messages = locale === "th" ? th : en;
  const template = (messages as Record<string, unknown>)[messageKey];
  if (typeof template !== "string") {
    return messageKey;
  }
  try {
    const formatted = new IntlMessageFormat(template, locale).format(values);
    if (formatted == null) return template;
    if (typeof formatted === "object") return template;
    return String(formatted);
  } catch {
    return template;
  }
}
