import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readScreen = (name: string) =>
  readFileSync(new URL(`../screens/discovery/${name}`, import.meta.url), "utf8");

const cases = [
  {
    fixture: "webBrandDirectory.promo",
    routeId: "brand",
    screen: "CustomerBrandDirectoryScreen.tsx",
  },
  {
    fixture: "webShopDirectory.promo",
    routeId: "shops",
    screen: "CustomerShopDirectoryScreen.tsx",
  },
  {
    fixture: "webProductDiscovery.promo",
    routeId: "discover",
    screen: "CustomerProductDiscoveryScreen.tsx",
  },
] as const;

describe("specific page banner screen wiring", () => {
  it.each(cases)("loads the isolated banner above the heading on $routeId", (entry) => {
    const source = readScreen(entry.screen);

    expect(source).toContain("useSpecificPageBanner");
    expect(source).toContain(`useSpecificPageBanner("${entry.routeId}", ${entry.fixture})`);
    expect(source).toContain("<SpecificPageBannerCarousel");
    expect(source).toContain("specificPageBanner.retry();");
  });

  it("does not keep the fixture-default carousel escape hatch", () => {
    const carousel = readScreen("SpecificPageBannerCarousel.tsx");

    expect(carousel).not.toContain("promo = webShopDirectory.promo");
    expect(carousel).toContain("if (!href)");
    expect(carousel).toContain("trackPromotionSelect");
    expect(carousel).toContain("Math.min(activeIndex, maxPageIndex)");
    expect(carousel).toContain("slide.slot ?? index + 1");
  });
});
