import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import * as webDesignParity from "@mobile/design/webDesignParity";

import { readDiscoverySources } from "../test-support/discoverySource";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

type BrandDirectoryResult = {
  brand: string;
  cashback: string;
  category: string;
};

type BrandDirectoryFilters = {
  category?: string;
  query?: string;
  sortBy?: string;
};

describe("Brand directory parity", () => {
  it("brand directory parity > given staging All Brands copy > then Expo exposes the production brand directory contract", () => {
    const parity = webDesignParity as {
      webBrandDirectory?: {
        categories: readonly string[];
        categoryHeading: string;
        emptyBody: string;
        emptyTitle: string;
        pagination: { pageSize: number };
        promo: {
          aspectRatio: number;
          imageAsset: string;
          slideCount: number;
          title: string;
        };
        resultsUnit: string;
        searchLabel: string;
        searchPlaceholder: string;
        sortLabel: string;
        sortPills: readonly { label: string; value: string }[];
        stores: readonly BrandDirectoryResult[];
        subtitle: string;
        title: string;
        titleIcon: string;
      };
    };

    expect(parity.webBrandDirectory).toMatchObject({
      categoryHeading: "Categories",
      emptyTitle: "No brands match those filters.",
      emptyBody: "Try another search or category.",
      pagination: { pageSize: 24 },
      promo: {
        aspectRatio: 800 / 450,
        imageAsset: "shop-promo-gogoquest",
        slideCount: 3,
        title: "Promotion by Brands",
      },
      resultsUnit: "brands",
      searchLabel: "Search partners",
      searchPlaceholder: "Search by store or product…",
      sortLabel: "Sort by:",
      subtitle:
        "Discover every partner brand on GoGoCash. Search by name or browse by category to find the cashback offer that fits.",
      title: "All Brands",
      titleIcon: "✨",
    });
    expect(parity.webBrandDirectory?.categories).toEqual([
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
    expect(parity.webBrandDirectory?.sortPills).toEqual([
      { label: "Popular", value: "popular" },
      { label: "Latest", value: "newest" },
      { label: "Highest Cashback", value: "highest_cashback" },
      { label: "Lowest Cashback", value: "lowest_cashback" },
    ]);
    expect(parity.webBrandDirectory?.stores).toHaveLength(30);
  });

  it("brand directory behavior > given search category and sort filters > then result ordering matches the web contract", () => {
    const parity = webDesignParity as {
      getBrandDirectoryResults?: (filters?: BrandDirectoryFilters) => BrandDirectoryResult[];
    };

    expect(parity.getBrandDirectoryResults).toBeTypeOf("function");

    expect(parity.getBrandDirectoryResults?.({ query: "orbit" }).map((brand) => brand.brand)).toEqual([
      "Orbit Airways",
    ]);
    expect(
      parity
        .getBrandDirectoryResults?.({ category: "Travel", sortBy: "highest_cashback" })
        .slice(0, 3)
        .map((brand) => brand.brand)
    ).toEqual(["Skyline Suites", "StayMint Hotels", "CloudNine Travel"]);
    expect(
      parity
        .getBrandDirectoryResults?.({ category: "Electronics", sortBy: "popular" })
        .slice(0, 3)
        .map((brand) => brand.brand)
    ).toEqual(["PixelPort", "Circuit Nest", "Gadget Grove"]);
    expect(parity.getBrandDirectoryResults?.({ query: "no-such-brand" })).toEqual([]);
  });

  it("brand directory layout > given mobile and desktop widths > then grid metrics match staging density", () => {
    const parity = webDesignParity as {
      getBrandDirectoryGridMetrics?: (args: { contentWidth: number; viewportWidth: number }) => {
        cardWidth: number;
        columns: number;
        gap: number;
      };
    };

    expect(parity.getBrandDirectoryGridMetrics).toBeTypeOf("function");
    expect(parity.getBrandDirectoryGridMetrics?.({ contentWidth: 423, viewportWidth: 455 })).toEqual(
      {
        cardWidth: 205.5,
        columns: 2,
        gap: 12,
      }
    );
    expect(
      parity.getBrandDirectoryGridMetrics?.({ contentWidth: 1200, viewportWidth: 1440 })
    ).toEqual({
      cardWidth: 220.8,
      columns: 5,
      gap: 24,
    });
  });

  it("brand screen > given /brand route > then it renders the dedicated brand directory instead of the generic placeholder", () => {
    const screenFile = readDiscoverySources(mobileRoot);

    expect(screenFile).toContain("CustomerBrandDirectoryScreen");
    expect(screenFile).toContain("webBrandDirectory");
    expect(screenFile).toContain("filterDirectoryStores");
    expect(screenFile).toContain("useCustomerAccountResource");
    expect(screenFile).toContain("resolveLiveDirectoryStores");
    expect(screenFile).toContain("getBrandDirectoryGridMetrics");
    expect(screenFile).toContain("BrandDirectoryStoreCard");
    expect(screenFile).toContain("brandDirectoryGrid");
    expect(screenFile).not.toContain(
      "Browse cashback partners and open the best available tracking route."
    );
  });

  // Regression guard: directory category asides render a per-category icon via
  // getCategoryIcon (web shows a distinct glyph per category), not a single
  // uniform SlidersHorizontal filter glyph on every row.
  it("category aside icons > given directory category rows > then each uses getCategoryIcon, not a uniform filter glyph", () => {
    const screenSource = readDiscoverySources(mobileRoot);

    expect(screenSource).toContain('from "@mobile/theme/categoryIcons"');
    const lookups = screenSource.match(/getCategoryIcon\(/g) ?? [];
    expect(lookups.length).toBeGreaterThanOrEqual(3);
    expect(screenSource).not.toContain("SlidersIcon");
  });
});
