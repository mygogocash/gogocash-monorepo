// Supported mobile locales. The mobile picker offers en + th only (jp is web-only).
export const SUPPORTED_LOCALES = ["en", "th"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export function isSupportedLocale(value: string | null | undefined): value is Locale {
  return value === "en" || value === "th";
}

// Map a device/browser locale tag (e.g. "th-TH", "en-US") to a supported locale, else default.
export function resolveLocale(tag: string | null | undefined): Locale {
  if (!tag) {
    return DEFAULT_LOCALE;
  }
  const base = tag.toLowerCase().split("-")[0];
  return isSupportedLocale(base) ? base : DEFAULT_LOCALE;
}
