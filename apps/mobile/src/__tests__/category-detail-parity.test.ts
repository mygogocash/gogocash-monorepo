import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import * as webDesignParity from "@mobile/design/webDesignParity";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

type CategoryExploreSort = "highest_cashback" | "lowest_cashback" | "popular" | "newest";
type CategoryExploreResult = {
  brand: string;
  cashback: string;
};

describe("Category detail parity", () => {
  it("category detail parity > given Health & Beauty web explore shop contract > then Expo exposes category filters, sort controls, and first result cards", () => {
    const parity = webDesignParity as {
      webCategoryExploreHealthBeauty?: {
        category: string;
        title: string;
        subtitle: string;
        searchPlaceholder: string;
        sortLabel: string;
        storeCountLabel: string;
        categories: readonly string[];
        sortPills: readonly { label: string; value: CategoryExploreSort }[];
        stores: readonly CategoryExploreResult[];
      };
    };

    expect(parity.webCategoryExploreHealthBeauty).toEqual({
      category: "Health & Beauty",
      title: "Explore your Favorite Health & Beauty",
      subtitle:
        "Find cashback deals from stores in Health & Beauty. Search and sort to narrow results.",
      searchPlaceholder: "Search within Health & Beauty",
      sortLabel: "Sort by:",
      storeCountLabel: "13 stores in this category",
      categories: [
        "All",
        "Digital Services",
        "Education",
        "Electronics",
        "Fashion",
        "Finance",
        "Food & Grocery",
        "Gifting & Crafts",
        "Health & Beauty",
        "Home & Living",
        "Marketplace",
        "Travel",
        "Top-up / Recharge",
        "Others",
      ],
      sortPills: [
        { label: "Popular", value: "popular" },
        { label: "Latest", value: "newest" },
        { label: "High Cashback", value: "highest_cashback" },
        { label: "Lowest Cashback", value: "lowest_cashback" },
      ],
      stores: [
        expect.objectContaining({ brand: "Pure Ritual", cashback: "18.0%" }),
        expect.objectContaining({ brand: "Pearl Polish", cashback: "17.8%" }),
        expect.objectContaining({ brand: "Luxe Lane Beauty", cashback: "17.2%" }),
        expect.objectContaining({ brand: "Noble Nurture", cashback: "17.0%" }),
        expect.objectContaining({ brand: "Dew Drop Labs", cashback: "16.9%" }),
        expect.objectContaining({ brand: "Mint Mirror", cashback: "16.5%" }),
        expect.objectContaining({ brand: "Aurum Glow", cashback: "15.5%" }),
        expect.objectContaining({ brand: "Lush Legacy", cashback: "15.1%" }),
        expect.objectContaining({ brand: "Bloom & Beam", cashback: "15.0%" }),
        expect.objectContaining({ brand: "Brush & Bloom", cashback: "14.7%" }),
        expect.objectContaining({ brand: "Amber Apothecary", cashback: "14.4%" }),
        expect.objectContaining({ brand: "Vitaline Spa", cashback: "13.8%" }),
        expect.objectContaining({ brand: "Harbor Herbs", cashback: "11.9%" }),
      ],
    });
  });

  it("category detail behavior > given search and cashback sort > then results filter and reorder like web", () => {
    const parity = webDesignParity as {
      getCategoryExploreResults?: (options: {
        category?: string;
        query?: string;
        sortBy?: CategoryExploreSort;
      }) => CategoryExploreResult[];
    };

    expect(parity.getCategoryExploreResults).toBeTypeOf("function");
    expect(parity.getCategoryExploreResults?.({ query: "pearl" }).map((store) => store.brand)).toEqual([
      "Pearl Polish",
    ]);
    expect(
      parity.getCategoryExploreResults?.({ sortBy: "lowest_cashback" }).map((store) => store.brand)
    ).toEqual([
      "Harbor Herbs",
      "Vitaline Spa",
      "Amber Apothecary",
      "Brush & Bloom",
      "Bloom & Beam",
      "Lush Legacy",
      "Aurum Glow",
      "Mint Mirror",
      "Dew Drop Labs",
      "Noble Nurture",
      "Luxe Lane Beauty",
      "Pearl Polish",
      "Pure Ritual",
    ]);
    expect(
      parity
        .getCategoryExploreResults?.({ category: "Travel", sortBy: "highest_cashback" })
        .map((store) => store.brand)
    ).toEqual([
      "Skyline Suites",
      "StayMint Hotels",
      "CloudNine Travel",
      "Trailhead Outfitters",
      "Nova Travel Club",
      "Horizon Escapes",
      "Orbit Airways",
    ]);
    expect(
      parity
        .getCategoryExploreResults?.({ category: "Travel", query: "pure" })
        .map((store) => store.brand)
    ).toEqual([]);
  });

  it("category detail screen > given selected category route > then it renders the web Explore Shops surface instead of the placeholder offer rows", () => {
    const screenFile = fs.readFileSync(
      path.join(mobileRoot, "src/screens/CustomerCategoryDetailScreen.tsx"),
      "utf8"
    );

    expect(screenFile).toContain("webCategoryExploreHealthBeauty");
    expect(screenFile).toContain("getCategoryExploreResults");
    expect(screenFile).toContain("category: category");
    expect(screenFile).toContain("CustomerMobileBottomNav");
    expect(screenFile).toContain("category-result-card");
    expect(screenFile).not.toContain("Compare shops and cashback options");
    expect(screenFile).not.toContain("Discover more");
  });

  it("category detail grid > given lg desktop width 1024-1279 > then it uses a 5-column tier matching web List.tsx", () => {
    const screenFile = fs.readFileSync(
      path.join(mobileRoot, "src/screens/CustomerCategoryDetailScreen.tsx"),
      "utf8"
    );

    // Web category grid (gogocash_app-staging List.tsx:254) is grid-cols-2 sm:3 md:4 lg:5 xl:6.
    // isDesktop flips true at viewportWidth >= 1024 (mobileShellLayout.desktopBreakpoint),
    // so the desktop branch must give 5 columns for 1024-1279 before 6 at xl (>=1280).
    expect(screenFile).toContain("viewportWidth >= 1024");
    expect(screenFile).toMatch(
      /viewportWidth >= 1280[\s\S]*?6[\s\S]*?viewportWidth >= 1024[\s\S]*?5/
    );
    // Guard against regression to the old 4 -> 6 jump that skipped the lg 5-col tier.
    expect(screenFile).not.toMatch(/viewportWidth >= 1280\s*\?\s*6\s*:\s*4\b/);
  });
});
