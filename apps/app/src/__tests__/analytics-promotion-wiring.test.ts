import path from "node:path";
import { fileURLToPath } from "node:url";

import { readHomeSources } from "../test-support/homeSource";
import { describe, expect, it } from "vitest";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

// Slice 3 — wire select_promotion onto the home banner tap. HeroBannerLink wraps
// BOTH main and side banners in one <Link>, so wiring there covers every banner.
// The event must fire on tap then let navigation proceed (expo-router Link.js
// composes onPress: it calls the provided onPress first, then navigates unless
// defaultPrevented). Props mirror web trackPromotionSelect, using only REAL
// HomeHeroBanner fields (id/placement/href — there is no separate name field).
describe("home banner select_promotion wiring", () => {
  const home = readHomeSources(mobileRoot);

  it("imports the analytics hook and the promotion event helper", () => {
    expect(home).toContain("useAnalytics");
    expect(home).toContain("trackPromotionSelect");
    expect(home).toContain('from "@mobile/analytics/useAnalytics"');
    expect(home).toContain('from "@mobile/analytics/events"');
  });

  it("HeroBannerLink fires trackPromotionSelect on banner press via Link onPress", () => {
    // onPress is attached to the Link (which composes it before navigating).
    expect(home).toMatch(/onPress=\{\(\)\s*=>\s*trackPromotionSelect\(/);
  });

  it("maps the real banner fields to the web promotion property names", () => {
    expect(home).toContain("promotionId: banner.id");
    expect(home).toContain("promotionName: banner.id");
    expect(home).toContain("creativeSlot: banner.placement");
    expect(home).toContain("destination: banner.href");
  });

  it("passes the analytics client from useAnalytics into the tracker", () => {
    // HeroBannerLink must receive an analytics client (from the hook in the
    // parent) and use it — not call a bare module singleton.
    expect(home).toMatch(/trackPromotionSelect\(\s*analytics/);
  });
});
