import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import * as webDesignParity from "@mobile/design/webDesignParity";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

type CategoryExploreSort =
  | "all"
  | "highest_cashback"
  | "lowest_cashback"
  | "popular"
  | "newest";
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
        "Find cashback deals from brands in Health & Beauty. Search and sort to narrow results.",
      searchPlaceholder: "Search within Health & Beauty",
      sortLabel: "Sort by:",
      storeCountLabel: "13 brands in this category",
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
        { label: "All", value: "all" },
        { label: "Popular", value: "popular" },
        { label: "Latest", value: "newest" },
        { label: "Highest Cashback", value: "highest_cashback" },
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
    // #437 — All preserves fixture insertion order (no forced cashback ranking).
    const allOrder = parity.getCategoryExploreResults?.({ sortBy: "all" }).map((store) => store.brand);
    const fixtureOrder = (
      webDesignParity as {
        webCategoryExploreHealthBeauty: { stores: readonly { brand: string }[] };
      }
    ).webCategoryExploreHealthBeauty.stores.map((store) => store.brand);
    expect(allOrder).toEqual(fixtureOrder);
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
    expect(screenFile).toContain("resolveCategoryExploreStores");
    expect(screenFile).toContain("useCategoryOfferBrowse");
    expect(screenFile).toContain('useState<WebCategoryExploreSort>("all")');
    expect(screenFile).toContain("CustomerMobileBottomNav");
    expect(screenFile).toContain("category-result-card");
    expect(screenFile).not.toContain("Compare shops and cashback options");
    expect(screenFile).not.toContain("Discover more");
    expect(screenFile).not.toContain('resourceId: "brandCatalog"');
  });

  it("category detail card > given category result grid > then it renders the shared compact BrandCard", () => {
    const screenFile = fs.readFileSync(
      path.join(mobileRoot, "src/screens/CustomerCategoryDetailScreen.tsx"),
      "utf8"
    );
    const brandCardFile = fs.readFileSync(
      path.join(mobileRoot, "src/components/BrandCard.tsx"),
      "utf8"
    );

    expect(screenFile).toContain('import { BrandCard } from "@mobile/components/BrandCard"');
    expect(screenFile).toContain('size="S"');
    expect(screenFile).toContain("getScaledCompactBrandCardMetrics");
    expect(screenFile).toContain("category-result-card");
    expect(screenFile).not.toContain("Grab Coupon");
    expect(screenFile).not.toContain("favoriteButton");
    expect(brandCardFile).toContain("compactBrandLogoFallback");
  });

  it("category detail card > forwards the store href so it routes to /shop/<id>, not a name slug", () => {
    // Regression guard for the brand-click 404: the category grid MUST pass the
    // store's real href to BrandCard. Without it, BrandCard falls back to
    // getTopBrandHref(brand) which slugifies the NAME (e.g. "/shop/traveloka"),
    // and the ObjectId-keyed GET /offer/:id can't resolve it -> "No merchant
    // details yet". store.href is already "/shop/<ObjectId>".
    const screenFile = fs.readFileSync(
      path.join(mobileRoot, "src/screens/CustomerCategoryDetailScreen.tsx"),
      "utf8"
    );
    expect(screenFile).toMatch(/<BrandCard[\s\S]*?href=\{store\.href\}[\s\S]*?\/>/);
  });

  it("category detail grid > given desktop width >= 1024 > then it uses 5 columns matching brand/shop directories", () => {
    const screenFile = fs.readFileSync(
      path.join(mobileRoot, "src/screens/CustomerCategoryDetailScreen.tsx"),
      "utf8"
    );

    expect(screenFile).toContain("isDesktop");
    expect(screenFile).toMatch(/isDesktop\s*\?\s*5/);
    expect(screenFile).not.toMatch(/viewportWidth >= 1280[\s\S]*?6/);
  });

  it("category detail copy > given the rendered subtitle and count > then they say 'brands' (not 'stores') and the subtitle matches the fixture", () => {
    const screenFile = fs.readFileSync(
      path.join(mobileRoot, "src/screens/CustomerCategoryDetailScreen.tsx"),
      "utf8"
    );
    // The screen renders an INLINE tc() template for the subtitle and an inline template for the
    // filtered count — NOT the fixture. Pin both so the user-facing copy says "brands" and cannot
    // silently drift from the fixture (asserting the fixture alone missed exactly this).
    expect(screenFile).toContain("Find cashback deals from brands in ${category}");
    expect(screenFile).not.toContain("Find cashback deals from stores in");
    expect(screenFile).toContain('count === 1 ? "brand" : "brands"');
    expect(screenFile).not.toContain('"store" : "stores"');

    // tc() only resolves the localized Health & Beauty subtitle when the inline template's output
    // (category interpolated) equals this fixture — so they must stay in lockstep.
    const fixture = (
      webDesignParity as { webCategoryExploreHealthBeauty: { subtitle: string } }
    ).webCategoryExploreHealthBeauty;
    expect(fixture.subtitle).toBe(
      "Find cashback deals from brands in Health & Beauty. Search and sort to narrow results."
    );
  });

  it("category detail header gap > matches the brand/shop/product directories (Math.max(8, insets.top + 8)), not spacing.lg", () => {
    // The three Explore directories (brand/shop/product) all pad the scroll
    // content's top by Math.max(8, insets.top + 8). The category page used
    // spacing.lg (24px), leaving a visibly larger navbar->header gap on
    // /category/<name> (e.g. "Explore your Favorite Travel"). Pin it to the
    // directory value so all four Explore surfaces share the same gap.
    const screenFile = fs.readFileSync(
      path.join(mobileRoot, "src/screens/CustomerCategoryDetailScreen.tsx"),
      "utf8"
    );
    const brandDir = fs.readFileSync(
      path.join(mobileRoot, "src/screens/discovery/CustomerBrandDirectoryScreen.tsx"),
      "utf8"
    );
    const directoryGap = "Math.max(8, insets.top + 8)";
    // Reference invariant: the directory the user pointed to as "correct".
    expect(brandDir).toContain(directoryGap);
    // Both category shells (desktop + mobile) must use the directory gap...
    expect(screenFile.split(directoryGap).length - 1).toBeGreaterThanOrEqual(2);
    // ...and no longer the larger spacing.lg top padding.
    expect(screenFile).not.toContain("Math.max(spacing.lg, insets.top + spacing.lg)");
  });
});
