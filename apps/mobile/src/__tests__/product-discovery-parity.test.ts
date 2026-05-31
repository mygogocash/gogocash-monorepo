import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import * as webDesignParity from "@mobile/design/webDesignParity";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

type ProductDiscoveryResult = {
  brand: string;
  cashback: string;
  category: string;
  priceLabel: string;
  title: string;
};

type ProductDiscoveryFilters = {
  category?: string;
  minCashback?: number;
  query?: string;
  sortBy?: string;
};

describe("Product discovery parity", () => {
  it("product discovery parity > given staging discover copy > then Expo exposes the production product contract", () => {
    const parity = webDesignParity as {
      webProductDiscovery?: {
        cashbackFilters: readonly { label: string; value: number }[];
        categories: readonly { label: string; value: string }[];
        emptyTitle: string;
        pagination: { pageSize: number };
        products: readonly ProductDiscoveryResult[];
        resultsUnit: string;
        searchLabel: string;
        searchPlaceholder: string;
        sortPills: readonly { label: string; value: string }[];
        subtitle: string;
        termsLabel: string;
        title: string;
      };
    };

    expect(parity.webProductDiscovery).toMatchObject({
      title: "Product Discovery",
      subtitle: "Find the best cashback deals by products.",
      searchLabel: "Search partners",
      searchPlaceholder: "Search by store or product…",
      resultsUnit: "products",
      termsLabel: "Learn more about T&C",
      emptyTitle: "No partners found. Try adjusting your filters.",
      pagination: { pageSize: 60 },
    });
    expect(parity.webProductDiscovery?.categories.map((category) => category.label)).toEqual([
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
    ]);
    expect(parity.webProductDiscovery?.cashbackFilters).toEqual([
      { label: "Any %", value: 0 },
      { label: "5%+", value: 5 },
      { label: "10%+", value: 10 },
      { label: "15%+", value: 15 },
    ]);
    expect(parity.webProductDiscovery?.sortPills).toEqual([
      { label: "Popular", value: "popular" },
      { label: "Latest", value: "newest" },
      { label: "Highest Cashback", value: "highCashback" },
    ]);
    expect(parity.webProductDiscovery?.products).toHaveLength(30);
    expect(parity.webProductDiscovery?.products.slice(0, 3)).toEqual([
      expect.objectContaining({
        brand: "Grocery Galaxy",
        priceLabel: "1,522 THB",
        title: "Grocery Galaxy",
      }),
      expect.objectContaining({
        brand: "Pocket Pantry",
        priceLabel: "1,569 THB",
        title: "Pocket Pantry",
      }),
      expect.objectContaining({
        brand: "Orbit Airways",
        priceLabel: "1,616 THB",
        title: "Orbit Airways",
      }),
    ]);
  });

  it("product discovery behavior > given search category cashback and sort filters > then product results match staging logic", () => {
    const parity = webDesignParity as {
      getProductDiscoveryResults?: (
        filters?: ProductDiscoveryFilters
      ) => ProductDiscoveryResult[];
    };

    expect(parity.getProductDiscoveryResults).toBeTypeOf("function");

    expect(parity.getProductDiscoveryResults?.({ query: "orbit" }).map((item) => item.brand)).toEqual([
      "Orbit Airways",
    ]);
    expect(
      parity
        .getProductDiscoveryResults?.({
          category: "Travel",
          minCashback: 10,
          sortBy: "highCashback",
        })
        .slice(0, 3)
        .map((item) => item.brand)
    ).toEqual(["Skyline Suites", "StayMint Hotels", "CloudNine Travel"]);
    expect(
      parity
        .getProductDiscoveryResults?.({ minCashback: 15, sortBy: "highCashback" })
        .slice(0, 3)
        .map((item) => item.brand)
    ).toEqual(["Pure Ritual", "Luxe Lane Beauty", "Mint Mirror"]);
    expect(parity.getProductDiscoveryResults?.({ query: "no-such-product" })).toEqual([]);
  });

  it("product discovery layout > given mobile and desktop widths > then grid metrics match staging density", () => {
    const parity = webDesignParity as {
      getProductDiscoveryGridMetrics?: (args: { contentWidth: number; viewportWidth: number }) => {
        cardWidth: number;
        columns: number;
        gap: number;
      };
    };

    expect(parity.getProductDiscoveryGridMetrics).toBeTypeOf("function");
    expect(
      parity.getProductDiscoveryGridMetrics?.({ contentWidth: 423, viewportWidth: 455 })
    ).toEqual({
      cardWidth: 207.5,
      columns: 2,
      gap: 8,
    });
    expect(
      parity.getProductDiscoveryGridMetrics?.({ contentWidth: 1012, viewportWidth: 1440 })
    ).toEqual({
      cardWidth: 183.2,
      columns: 5,
      gap: 24,
    });
  });

  it("product discovery screen > given /discover route > then it renders the dedicated page instead of the generic placeholder", () => {
    const screenFile = fs.readFileSync(
      path.join(mobileRoot, "src/screens/CustomerDiscoveryScreen.tsx"),
      "utf8"
    );

    expect(screenFile).toContain("ProductDiscoveryScreen");
    expect(screenFile).toContain("webProductDiscovery");
    expect(screenFile).toContain("getProductDiscoveryResults");
    expect(screenFile).toContain("productDiscoveryMobileFilters");
    expect(screenFile).toContain("productDiscoverySidebar");
    expect(screenFile).toContain("productDiscoveryGrid");
    expect(screenFile).toContain("ProductDiscoveryTermsDialog");
    expect(screenFile).toContain("productDiscoveryDialogTransition");
    expect(screenFile).toContain('transitionProperty: "opacity, transform"');
    expect(screenFile).toContain("motion.duration.fast");
    expect(screenFile).not.toContain(
      "Explore products, shops, and campaigns that can be activated through GoGoCash."
    );
  });
});
