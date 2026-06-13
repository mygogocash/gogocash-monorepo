export const LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "th", label: "ไทย", flag: "🇹🇭" },
  { code: "zh-TW", label: "繁體中文", flag: "🇹🇼" },
  { code: "zh-CN", label: "简体中文", flag: "🇨🇳" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
] as const;

export const REGIONS = [
  { code: "TH", label: "Thailand", flag: "🇹🇭" },
  { code: "TW", label: "Taiwan", flag: "🇹🇼" },
  { code: "CN", label: "China", flag: "🇨🇳" },
  { code: "JP", label: "Japan", flag: "🇯🇵" },
  { code: "SG", label: "Singapore", flag: "🇸🇬" },
  { code: "MY", label: "Malaysia", flag: "🇲🇾" },
  { code: "ID", label: "Indonesia", flag: "🇮🇩" },
  { code: "PH", label: "Philippines", flag: "🇵🇭" },
  { code: "VN", label: "Vietnam", flag: "🇻🇳" },
  { code: "SEA", label: "Southeast Asia", flag: "🌏" },
] as const;

export type LangCode = (typeof LANGUAGES)[number]["code"];
export type RegionCode = (typeof REGIONS)[number]["code"];

export type StoredLocale = {
  lang: LangCode;
  region: RegionCode;
};

export const DEFAULT_LOCALE: StoredLocale = {
  lang: "en",
  region: "TH",
};

const SECTIONED_LANDING_ROOTS = ["/", "/en", "/th", "/tw", "/cn", "/ja"] as const;

const SECTIONED_LANDING_PREFIXES = SECTIONED_LANDING_ROOTS.filter(
  (root) => root !== "/",
);

const PATH_LOCALE_MAP = [
  { root: "/th", locale: { lang: "th", region: "TH" } as StoredLocale },
  { root: "/tw", locale: { lang: "zh-TW", region: "TW" } as StoredLocale },
  { root: "/cn", locale: { lang: "zh-CN", region: "CN" } as StoredLocale },
  { root: "/ja", locale: { lang: "ja", region: "JP" } as StoredLocale },
  { root: "/id", locale: { lang: "en", region: "ID" } as StoredLocale },
  { root: "/en", locale: DEFAULT_LOCALE },
] as const;

export function isLangCode(value: string): value is LangCode {
  return LANGUAGES.some((language) => language.code === value);
}

export function isRegionCode(value: string): value is RegionCode {
  return REGIONS.some((region) => region.code === value);
}

export function isSectionedLandingPath(pathname: string): boolean {
  if (SECTIONED_LANDING_ROOTS.includes(pathname as (typeof SECTIONED_LANDING_ROOTS)[number])) {
    return true;
  }
  return SECTIONED_LANDING_PREFIXES.some((root) =>
    pathname.startsWith(`${root}/`),
  );
}

export function getSectionedLandingBasePath(pathname: string): string {
  if (pathname === "/") return "/";
  for (const root of SECTIONED_LANDING_PREFIXES) {
    if (pathname === root || pathname.startsWith(`${root}/`)) {
      return root;
    }
  }
  return "/";
}

export function resolveLocaleForPathname(pathname: string): StoredLocale | null {
  for (const entry of PATH_LOCALE_MAP) {
    if (pathname === entry.root || pathname.startsWith(`${entry.root}/`)) {
      return entry.locale;
    }
  }
  if (pathname === "/") return DEFAULT_LOCALE;
  return null;
}

export function resolveLanguageSelection(
  language: LangCode,
  currentRegion: RegionCode,
): { path: string; locale: StoredLocale } {
  switch (language) {
    case "en":
      return {
        path: "/",
        locale: { lang: "en", region: currentRegion },
      };
    case "th":
      return { path: "/th", locale: { lang: "th", region: "TH" } };
    case "zh-TW":
      return { path: "/tw", locale: { lang: "zh-TW", region: "TW" } };
    case "zh-CN":
      return { path: "/cn", locale: { lang: "zh-CN", region: "CN" } };
    case "ja":
      return { path: "/ja", locale: { lang: "ja", region: "JP" } };
    default: {
      const _exhaustive: never = language;
      return _exhaustive;
    }
  }
}

/** Subtags that imply Traditional Chinese marketing locale (`/tw`). */
const ZH_TRADITIONAL_HINTS = new Set(["hant", "tw", "hk", "mo"]);

/** Subtags that imply Simplified Chinese marketing locale (`/cn`). */
const ZH_SIMPLIFIED_HINTS = new Set(["hans", "cn", "sg"]);

/**
 * Map one BCP-47-style locale tag (case-insensitive) to a marketing path, or null if no auto-redirect.
 * Bare `zh` without script/region is ambiguous and returns null.
 */
export function matchBrowserLocaleTagForRedirect(tag: string): string | null {
  const normalized = tag.trim().replace(/_/g, "-");
  if (!normalized) return null;

  const parts = normalized.toLowerCase().split("-").filter(Boolean);
  const lang = parts[0];
  if (!lang) return null;

  if (lang === "th") return "/th";
  if (lang === "ja") return "/ja";
  if (lang === "id") return "/id";
  if (lang === "en") return "/";

  if (lang === "zh") {
    if (parts.length === 1) return null;

    for (const p of parts.slice(1)) {
      if (ZH_TRADITIONAL_HINTS.has(p)) return "/tw";
    }
    for (const p of parts.slice(1)) {
      if (ZH_SIMPLIFIED_HINTS.has(p)) return "/cn";
    }
    return null;
  }

  return null;
}

/** Pick the first matching path from the browser's ordered locale preference list. */
export function resolveAutoRedirectFromBrowserLocales(tags: string[]): string | null {
  for (const raw of tags) {
    const path = matchBrowserLocaleTagForRedirect(raw);
    if (path) return path;
  }
  return null;
}
