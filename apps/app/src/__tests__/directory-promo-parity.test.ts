import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { webBrandDirectory, webShopDirectory } from "@mobile/design/webDesignParity";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

describe("Directory promo carousel parity", () => {
  it("webShopDirectory.promo > given brand/shop directories > then exposes distinct linked slides", () => {
    expect(webShopDirectory.promo.slides).toHaveLength(3);
    expect(webShopDirectory.promo.slides.map((slide) => slide.id)).toEqual([
      "gogoquest",
      "health-beauty",
      "travel",
    ]);
    expect(webShopDirectory.promo.slides.every((slide) => slide.href.length > 0)).toBe(true);
    expect(webBrandDirectory.promo).toEqual(webShopDirectory.promo);
  });

  it("SpecificPageBannerCarousel > given premium carousel plan > then reuses home snap paging and animated dots", () => {
    const promoSource = fs.readFileSync(
      path.join(mobileRoot, "src/screens/discovery/SpecificPageBannerCarousel.tsx"),
      "utf8",
    );

    expect(promoSource).toContain("CarouselDots");
    expect(promoSource).toContain("getCarouselPageMotionStyle");
    expect(promoSource).toContain("snapToInterval");
    expect(promoSource).toContain('from "expo-image"');
    expect(promoSource).toContain("getPagedScrollIndex");
    expect(promoSource).toContain("useReducedMotion");
    expect(promoSource).toContain("prefetchRemoteImages");
  });
});
