import { describe, expect, it } from "vitest";

import { resolveDeviceRegion } from "@mobile/i18n/detectDeviceRegion";
import { DEFAULT_REGION } from "@mobile/i18n/regionTypes";

// Country selector groundwork (2026-07-10): the app never read the device's
// OS region — every fresh install silently defaulted to TH, so a Malaysian
// phone opened onto Thai listings with no hint anything was wrong.
describe("resolveDeviceRegion", () => {
  it("given a supported OS region code > then uses it", () => {
    expect(resolveDeviceRegion("MY")).toBe("MY");
    expect(resolveDeviceRegion("SG")).toBe("SG");
  });

  it("given a lowercase or padded code > then normalizes before matching", () => {
    expect(resolveDeviceRegion("my")).toBe("MY");
    expect(resolveDeviceRegion(" th ")).toBe("TH");
  });

  it("given an unsupported market > then falls back to the TH default", () => {
    expect(resolveDeviceRegion("US")).toBe(DEFAULT_REGION);
    expect(resolveDeviceRegion("FR")).toBe(DEFAULT_REGION);
  });

  it("given no OS region > then falls back to the TH default", () => {
    expect(resolveDeviceRegion(null)).toBe(DEFAULT_REGION);
    expect(resolveDeviceRegion(undefined)).toBe(DEFAULT_REGION);
    expect(resolveDeviceRegion("")).toBe(DEFAULT_REGION);
  });
});
