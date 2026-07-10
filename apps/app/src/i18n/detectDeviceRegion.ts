import { getLocales } from "expo-localization";

import { DEFAULT_REGION, isSupportedRegion, type RegionCode } from "@mobile/i18n/regionTypes";

/**
 * Map an OS-reported region code onto a supported market. Country selector
 * groundwork (2026-07-10): fresh installs previously hardcoded TH — the
 * `regionCode` field expo-localization already delivers was never read, so a
 * Malaysian phone opened onto Thai listings with no hint anything was wrong.
 */
export function resolveDeviceRegion(regionCode: string | null | undefined): RegionCode {
  const normalized = typeof regionCode === "string" ? regionCode.trim().toUpperCase() : "";
  return isSupportedRegion(normalized) ? normalized : DEFAULT_REGION;
}

/** Device-locale counterpart of `detectDeviceLocale` — safe on every platform. */
export function detectDeviceRegion(): RegionCode {
  try {
    return resolveDeviceRegion(getLocales?.()[0]?.regionCode ?? null);
  } catch {
    return DEFAULT_REGION;
  }
}
