import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import * as webDesignParity from "@mobile/design/webDesignParity";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

type CategoryDirectoryItem = {
  href: string;
  imageAsset: string;
  title: string;
};

describe("Category index parity", () => {
  it("category index parity > given web category directory contract > then Expo exposes title, count, search, pagination, and category cards", () => {
    const parity = webDesignParity as {
      webCategoryDirectory?: {
        cardEyebrow: string;
        cardCta: string;
        cards: readonly CategoryDirectoryItem[];
        countLabel: string;
        emptyBody: string;
        emptyTitle: string;
        pagination: { pageSize: number };
        searchPlaceholder: string;
        title: string;
        titleIcon: string;
      };
    };

    expect(parity.webCategoryDirectory).toMatchObject({
      title: "Categories",
      titleIcon: "📂",
      countLabel: "5 categories available",
      searchPlaceholder: "Find a category",
      cardEyebrow: "Category",
      cardCta: "Browse this collection",
      emptyTitle: "No categories match that search.",
      emptyBody: "Try another category name.",
      pagination: { pageSize: 16 },
    });
    expect(parity.webCategoryDirectory?.cards).toEqual([
      { title: "Travel", href: "/category/Travel", imageAsset: "quest-banner-en" },
      { title: "Electronics", href: "/category/Electronics", imageAsset: "popular-electronic" },
      { title: "Beauty", href: "/category/Beauty", imageAsset: "popular-beauty" },
      {
        title: "Health & Beauty",
        href: "/category/Health%20&%20Beauty",
        imageAsset: "popular-beauty",
      },
      { title: "Others", href: "/category/Others", imageAsset: "popular-dinner" },
    ]);
  });

  it("category index behavior > given search query and pagination > then matching category cards filter like web", () => {
    const parity = webDesignParity as {
      getCategoryDirectoryMatches?: (query: string) => CategoryDirectoryItem[];
      getCategoryDirectoryCountLabel?: (count: number) => string;
      getCategoryDirectoryPage?: (
        query: string,
        page: number
      ) => {
        cards: [
          CategoryDirectoryItem,
          ...CategoryDirectoryItem[],
        ] | CategoryDirectoryItem[];
        totalPages: number;
        totalResults: number;
      };
    };

    expect(parity.getCategoryDirectoryMatches).toBeTypeOf("function");
    expect(parity.getCategoryDirectoryCountLabel).toBeTypeOf("function");
    expect(parity.getCategoryDirectoryPage).toBeTypeOf("function");
    expect(parity.getCategoryDirectoryCountLabel?.(1)).toBe("1 category available");
    expect(parity.getCategoryDirectoryCountLabel?.(5)).toBe("5 categories available");
    expect(parity.getCategoryDirectoryMatches?.("beauty").map((item) => item.title)).toEqual([
      "Beauty",
      "Health & Beauty",
    ]);
    expect(parity.getCategoryDirectoryMatches?.("elec").map((item) => item.title)).toEqual([
      "Electronics",
    ]);
    expect(parity.getCategoryDirectoryMatches?.("").map((item) => item.title)).toEqual([
      "Travel",
      "Electronics",
      "Beauty",
      "Health & Beauty",
      "Others",
    ]);
    expect(parity.getCategoryDirectoryPage?.("", 1)).toMatchObject({
      totalPages: 1,
      totalResults: 5,
    });
    expect(parity.getCategoryDirectoryPage?.("elec", 1).cards.map((item) => item.title)).toEqual([
      "Electronics",
    ]);
  });

  it("category index layout > given mobile and desktop widths > then grid metrics match staging density", () => {
    const parity = webDesignParity as {
      getCategoryDirectoryGridMetrics?: (args: {
        contentWidth: number;
        viewportWidth: number;
      }) => {
        cardWidth: number;
        columns: number;
        gap: number;
      };
    };

    expect(parity.getCategoryDirectoryGridMetrics).toBeTypeOf("function");
    expect(
      parity.getCategoryDirectoryGridMetrics?.({ contentWidth: 419, viewportWidth: 455 })
    ).toEqual({
      cardWidth: 201.5,
      columns: 2,
      gap: 16,
    });
    expect(
      parity.getCategoryDirectoryGridMetrics?.({ contentWidth: 1200, viewportWidth: 1440 })
    ).toEqual({
      cardWidth: 288,
      columns: 4,
      gap: 16,
    });
  });

  it("category index screen > given /category route > then it renders the web directory instead of the generic discovery placeholder", () => {
    const screenFile = fs.readFileSync(
      path.join(mobileRoot, "src/screens/CustomerDiscoveryScreen.tsx"),
      "utf8"
    );

    expect(screenFile).toContain("webCategoryDirectory");
    expect(screenFile).toContain("getCategoryDirectoryMatches");
    expect(screenFile).toContain("getCategoryDirectoryGridMetrics");
    expect(screenFile).toContain("getCategoryDirectoryPage");
    expect(screenFile).toContain("CustomerMobileBottomNav");
    expect(screenFile).toContain("category-directory-card");
    expect(screenFile).toContain("CategoryDirectoryPagination");
    expect(screenFile).not.toContain(
      "Find cashback by shopping category and compare reward rates before leaving GoGoCash."
    );
  });
});
