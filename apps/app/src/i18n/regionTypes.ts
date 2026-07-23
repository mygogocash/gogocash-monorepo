import { webLocaleRegionPanel } from "@mobile/design/webDesignParity";

export type RegionCode = (typeof webLocaleRegionPanel.regions)[number]["code"];

/**
 * Where the active region came from: "detected" = device default the user has
 * never confirmed (safe to re-detect, worth a one-time confirm affordance);
 * "user" = an explicit pick, persisted and final.
 */
export type RegionSource = "detected" | "user";

export const DEFAULT_REGION: RegionCode = webLocaleRegionPanel.defaultRegion;

const REGION_CODE_SET = new Set<string>(webLocaleRegionPanel.regions.map((region) => region.code));

export function isSupportedRegion(value: string | null | undefined): value is RegionCode {
  return typeof value === "string" && REGION_CODE_SET.has(value);
}
