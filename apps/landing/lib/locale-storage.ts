import {
  DEFAULT_LOCALE,
  isLangCode,
  isRegionCode,
  type LangCode,
  type RegionCode,
  type StoredLocale,
} from "@/lib/locale-routing";

/** User-chosen language + region (header dropdown). */
export const LOCALE_STORAGE_KEY = "gogocash.locale";
export const LOCALE_EVENT_NAME = "gogocash:locale";

/**
 * After first auto-detection pass (redirect from `/` or one-time URL sync), set so we
 * do not keep re-evaluating on every navigation.
 */
export const AUTO_LOCALE_DONE_KEY = "gogocash.auto_locale_done";

export function hasSavedLocalePreference(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(LOCALE_STORAGE_KEY) !== null;
}

export function readStoredLocale(): StoredLocale {
  if (typeof window === "undefined") {
    return DEFAULT_LOCALE;
  }

  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (!raw) return DEFAULT_LOCALE;

    const parsed = JSON.parse(raw) as Partial<StoredLocale>;
    return {
      lang: parsed.lang && isLangCode(parsed.lang) ? parsed.lang : DEFAULT_LOCALE.lang,
      region:
        parsed.region && isRegionCode(parsed.region)
          ? parsed.region
          : DEFAULT_LOCALE.region,
    };
  } catch {
    return DEFAULT_LOCALE;
  }
}

/** Persists locale and notifies `LocaleDropdown` listeners. */
export function persistLocale(locale: StoredLocale): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCALE_STORAGE_KEY, JSON.stringify(locale));
  document.documentElement.lang = locale.lang;
  window.dispatchEvent(
    new CustomEvent<StoredLocale>(LOCALE_EVENT_NAME, {
      detail: locale,
    }),
  );
}

export function persistLocaleRaw(lang: LangCode, region: RegionCode): void {
  persistLocale({ lang, region });
}

/**
 * Browser locale tags in preference order (`navigator.languages`, then `navigator.language`).
 * Deduplicates case-insensitively while preserving first-seen order.
 */
export function readBrowserLocaleTags(): string[] {
  if (typeof navigator === "undefined") return ["en"];

  const seen = new Set<string>();
  const out: string[] = [];

  const push = (raw: string | undefined | null) => {
    const t = raw?.trim().replace(/_/g, "-");
    if (!t) return;
    const key = t.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(t);
  };

  for (const l of navigator.languages ?? []) push(l);
  push(navigator.language);

  return out.length > 0 ? out : ["en"];
}

/** Primary language subtag of the top browser locale — legacy helper for simple checks. */
export function readPrimaryBrowserLanguage(): string {
  const tags = readBrowserLocaleTags();
  const first = tags[0] ?? "en";
  return first.split("-")[0]?.toLowerCase() ?? "en";
}

export function isLikelyAutomatedClient(): boolean {
  if (typeof navigator === "undefined") return true;
  const ua = (navigator.userAgent ?? "").toLowerCase();
  return /bot|crawler|spider|googlebot|bingbot|slurp|duckduckbot|facebookexternalhit|preview/i.test(
    ua,
  );
}
