import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * THE BRAND CARD CONTRACT
 *
 * There are exactly two brand card designs, both served by the shared
 * `BrandCard` component:
 *
 *   size "L" (big)   — the default. Square logo tile, optional Grab Coupon chip
 *                      and favourite heart inside the tile, single-line name,
 *                      cashback caption + value row.
 *   size "S" (small) — the same structure at a smaller logo/text scale.
 *
 * No screen may ship its own brand card. Bespoke copies drifted from the shared
 * component before (the shop directory carried an extra "category · shop type"
 * meta line and different padding), which is what this test exists to prevent.
 */
const MOBILE_ROOT = join(process.cwd(), "src");

const read = (relative: string) => readFileSync(join(MOBILE_ROOT, relative), "utf8");

/** Screens that render brand/shop cards must use the shared component. */
const CARD_RENDERING_SCREENS = [
  "screens/discovery/CustomerBrandDirectoryScreen.tsx",
  "screens/discovery/CustomerShopDirectoryScreen.tsx",
];

/** Bespoke cards that were replaced by the shared BrandCard. */
const RETIRED_CARD_COMPONENTS = [
  "screens/discovery/BrandDirectoryStoreCard.tsx",
  "screens/discovery/ShopDirectoryStoreCard.tsx",
];

describe("brand card single source", () => {
  it("BrandCard > given the design system > offers exactly the big and small sizes", () => {
    const source = read("components/BrandCard.tsx");

    expect(source).toMatch(/size:\s*"L"/);
    expect(source).toMatch(/size:\s*"S"/);
    expect(source).not.toMatch(/size:\s*"(M|XL|XS)"/);
  });

  for (const relative of RETIRED_CARD_COMPONENTS) {
    it(`${relative} > given the shared BrandCard > no longer exists`, () => {
      expect(existsSync(join(MOBILE_ROOT, relative))).toBe(false);
    });
  }

  for (const relative of CARD_RENDERING_SCREENS) {
    it(`${relative} > given a brand grid > renders the shared BrandCard`, () => {
      const source = read(relative);

      expect(source).toContain("<BrandCard");
      expect(source).not.toMatch(/<(ShopDirectoryStoreCard|BrandDirectoryStoreCard)\b/);
    });
  }
});
