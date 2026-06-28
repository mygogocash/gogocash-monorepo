import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import * as webDesignParity from "@mobile/design/webDesignParity";
import { readDiscoverySources } from "../test-support/discoverySource";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

type ShopDirectoryResult = {
  brand: string;
  cashback: string;
  category: string;
  shopType: string;
};

type ShopDirectoryFilters = {
  category?: string;
  query?: string;
  shopType?: string;
  sortBy?: string;
};

describe("Shops directory parity", () => {
  it("shops directory parity > given staging All Shops copy > then Expo exposes the production directory contract", () => {
    const parity = webDesignParity as {
      webShopDirectory?: {
        categories: readonly string[];
        pagination: { pageSize: number };
        promo: {
          aspectRatio: number;
          slides: readonly {
            accessibilityLabel: string;
            href: string;
            id: string;
            imageAsset: string;
          }[];
          title: string;
        };
        searchLabel: string;
        searchPlaceholder: string;
        shopTypePills: readonly { label: string; value: string }[];
        sortPills: readonly { label: string; value: string }[];
        stores: readonly ShopDirectoryResult[];
        subtitle: string;
        title: string;
        trackingNotice: string;
      };
    };

    expect(parity.webShopDirectory).toMatchObject({
      promo: {
        aspectRatio: 800 / 450,
        title: "Promotion by Brands",
        slides: [
          expect.objectContaining({ id: "gogoquest", imageAsset: "shop-promo-gogoquest" }),
          expect.objectContaining({ id: "health-beauty", imageAsset: "popular-beauty" }),
          expect.objectContaining({ id: "travel", imageAsset: "home-banner" }),
        ],
      },
      title: "All Shops",
      subtitle:
        "Browse every shop earning you cashback. Filter by shop type or category, search by name, and sort by the rate that matters most.",
      trackingNotice:
        "Cashback tracks within 7 days after each order. Shipping fees and taxes are excluded from the cashback amount.",
      searchLabel: "Search partners",
      searchPlaceholder: "Search by store or product…",
      pagination: { pageSize: 24 },
    });
    expect(parity.webShopDirectory?.categories).toEqual([
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
    expect(parity.webShopDirectory?.shopTypePills).toEqual([
      { label: "All shop types", value: "all" },
      { label: "Mall", value: "mall" },
      { label: "Preferred", value: "preferred" },
      { label: "Standard", value: "normal" },
    ]);
    expect(parity.webShopDirectory?.sortPills).toEqual([
      { label: "Most Popular", value: "popular" },
      { label: "Newest", value: "newest" },
      { label: "Highest Cashback", value: "highest_cashback" },
      { label: "Lowest Cashback", value: "lowest_cashback" },
    ]);
    expect(parity.webShopDirectory?.stores).toHaveLength(30);
  });

  it("shops directory behavior > given search filters and sort options > then result ordering matches the web contract", () => {
    const parity = webDesignParity as {
      getShopDirectoryResults?: (filters?: ShopDirectoryFilters) => ShopDirectoryResult[];
    };

    expect(parity.getShopDirectoryResults).toBeTypeOf("function");

    expect(parity.getShopDirectoryResults?.({ query: "orbit" }).map((shop) => shop.brand)).toEqual([
      "Orbit Airways",
    ]);
    expect(
      parity
        .getShopDirectoryResults?.({ category: "Travel", sortBy: "highest_cashback" })
        .slice(0, 3)
        .map((shop) => shop.brand)
    ).toEqual(["Skyline Suites", "StayMint Hotels", "CloudNine Travel"]);
    expect(
      parity
        .getShopDirectoryResults?.({ shopType: "mall", sortBy: "lowest_cashback" })
        .slice(0, 3)
        .map((shop) => shop.brand)
    ).toEqual(["PixelPort", "Volt Market", "Gadget Grove"]);
    expect(parity.getShopDirectoryResults?.({ query: "no-such-shop" })).toEqual([]);
  });

  it("shops directory layout > given mobile and desktop widths > then grid metrics match staging density", () => {
    const parity = webDesignParity as {
      getShopDirectoryGridMetrics?: (args: { contentWidth: number; viewportWidth: number }) => {
        cardWidth: number;
        columns: number;
        gap: number;
      };
    };

    expect(parity.getShopDirectoryGridMetrics).toBeTypeOf("function");
    expect(parity.getShopDirectoryGridMetrics?.({ contentWidth: 423, viewportWidth: 455 })).toEqual(
      {
        cardWidth: 205.5,
        columns: 2,
        gap: 12,
      }
    );
    expect(
      parity.getShopDirectoryGridMetrics?.({ contentWidth: 1200, viewportWidth: 1440 })
    ).toEqual({
      cardWidth: 220.8,
      columns: 5,
      gap: 24,
    });
  });

  it("shops screen > given /shops route > then it renders the dedicated directory instead of the generic placeholder", () => {
    const screenFile = readDiscoverySources(mobileRoot);

    expect(screenFile).toContain("CustomerShopDirectoryScreen");
    expect(screenFile).toContain("webShopDirectory");
    expect(screenFile).toContain("filterShopDirectoryStores");
    expect(screenFile).toContain("useCustomerAccountResource");
    expect(screenFile).toContain("shopDirectoryPromo");
    expect(screenFile).toContain("shopDirectoryCategoryAside");
    expect(screenFile).toContain("shopDirectoryGrid");
    expect(screenFile).toContain("shop-promo-gogoquest");
    expect(screenFile).not.toContain(
      "Scan merchant shops and pick a tracking path before shopping."
    );
  });
});
