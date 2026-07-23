import enCatalog from "@gogocash/i18n/messages/en.json";
import thCatalog from "@gogocash/i18n/messages/th.json";
import overlayEn from "@mobile/messages/mobile-overlay.en.json";
import overlayTh from "@mobile/messages/mobile-overlay.th.json";
import type { Locale } from "@mobile/i18n/locales";

export type FlatMessages = Record<string, string>;

// The synced next-intl catalogs are mostly flat but include a few nested namespaces
// (e.g. "membership", "subscription"). react-intl wants a flat id->string map, so flatten
// nested objects into dot-notation keys — matching how next-intl addresses them ("membership.title").
function flattenMessages(catalog: Record<string, unknown>, prefix = ""): FlatMessages {
  const out: FlatMessages = {};
  for (const [key, value] of Object.entries(catalog)) {
    const id = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      out[id] = value;
    } else if (value && typeof value === "object") {
      Object.assign(out, flattenMessages(value as Record<string, unknown>, id));
    }
  }
  return out;
}

// Web catalogs are synced read-only from the Next.js app (single source of truth); `sync:i18n`
// overwrites them. Mobile-only copy that has no web equivalent (back buttons, image alts, native-only
// states) lives in `mobile-overlay.{en,th}.json` and is merged on TOP here so it survives the sync.
// Overlay keys are spread last; the reverse index below is first-key-wins, so any web value still
// takes precedence over an overlay duplicate.
export const MESSAGES: Record<Locale, FlatMessages> = {
  en: {
    ...flattenMessages(enCatalog as Record<string, unknown>),
    ...flattenMessages(overlayEn as Record<string, unknown>),
  },
  th: {
    ...flattenMessages(thCatalog as Record<string, unknown>),
    ...flattenMessages(overlayTh as Record<string, unknown>),
  },
};

// Reverse index (English value -> first catalog key) so screens can reuse the web translations by
// looking up a shared English string instead of hand-authoring per-string ids. ~92% of catalog values
// are unique; ambiguous ones resolve to the same Thai for display, so first-key-wins is safe here.
export const EN_VALUE_TO_KEY: ReadonlyMap<string, string> = (() => {
  const index = new Map<string, string>();
  for (const [key, value] of Object.entries(MESSAGES.en)) {
    if (!index.has(value)) {
      index.set(value, key);
    }
  }
  return index;
})();

// Pure reverse-lookup translation (no React, no ICU formatting): shared English copy -> catalog key
// -> active-locale value, falling back to the input English when nothing matches. `useCopy` is a thin
// hook wrapper around this; keeping the logic pure lets the source suite test it without rendering.
export function translateCopy(english: string, locale: Locale): string {
  const id = EN_VALUE_TO_KEY.get(english);
  if (!id) {
    return english;
  }
  return MESSAGES[locale][id] ?? english;
}
