import { webLocaleRegionPanel } from "@mobile/design/webDesignParity";

export type RegionCode = (typeof webLocaleRegionPanel.regions)[number]["code"];

export const DEFAULT_REGION: RegionCode = webLocaleRegionPanel.defaultRegion;

const REGION_CODE_SET = new Set<string>(webLocaleRegionPanel.regions.map((region) => region.code));

export function isSupportedRegion(value: string | null | undefined): value is RegionCode {
  return typeof value === "string" && REGION_CODE_SET.has(value);
}
