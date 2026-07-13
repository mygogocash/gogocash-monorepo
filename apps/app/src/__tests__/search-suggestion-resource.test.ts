import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { mapOfferCatalogToCompactBrandCards } from "@mobile/account/brandCatalogResource";
import {
  rankPopularLiveBrandTerms,
  resolveSearchSuggestionItem,
} from "@mobile/account/searchSuggestionResource";
import type { OfferListResponse } from "@mobile/api/catalogTypes";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

function readMobileFile(relativePath: string) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), "utf8");
}

const groceryCatalogPayload: OfferListResponse = {
  page: 1,
  limit: 80,
  total: 1,
  totalPages: 1,
  data: [
    {
      _id: "offer-grocery",
      offer_name_display: "Grocery Galaxy",
      commission_store: "12.5",
      logo: "https://cdn.example/grocery-galaxy.png",
      disabled: false,
      status: "approved",
    },
  ],
};

describe("resolveSearchSuggestionItem", () => {
  it("given backend catalog with logo > returns logoUri for matching term", () => {
    const liveCards = mapOfferCatalogToCompactBrandCards(groceryCatalogPayload);

    expect(
      resolveSearchSuggestionItem("Grocery Galaxy", liveCards, "#EAF3FB"),
    ).toEqual(
      expect.objectContaining({
        brand: "Grocery Galaxy",
        cashback: "12.5%",
        href: "/shop/offer-grocery",
        logoUri: "https://cdn.example/grocery-galaxy.png",
      }),
    );
  });

  it("given fixture popular panel without logo > enriches from promo section cards", () => {
    expect(
      resolveSearchSuggestionItem("Grocery Galaxy", [], "#EAF3FB"),
    ).toEqual(
      expect.objectContaining({
        brand: "Grocery Galaxy",
        cashback: "12.5%",
        logoBackground: "#EAF3FB",
        logoUri: "https://cdn.simpleicons.org/instacart",
      }),
    );
  });

  it("given unknown term > returns initials fallback without logoUri", () => {
    expect(resolveSearchSuggestionItem("Mystery Mart", [], "#CCCCCC")).toEqual({
      brand: "Mystery Mart",
      cashback: "",
      href: undefined,
      logoBackground: "#CCCCCC",
      logoText: "MM",
      logoTextColor: "#00CC99",
      logoUri: undefined,
    });
  });
});

describe("search suggestion UI wiring", () => {
  it("SearchSuggestionsGrid > given live catalog cards > then resolves logoUri via helper", () => {
    const gridSource = readMobileFile("src/screens/search/SearchSuggestionsGrid.tsx");

    expect(gridSource).toContain("resolveSearchSuggestionItem");
    expect(gridSource).toContain("liveCards");
    expect(gridSource).toContain("logoUri={item.logoUri}");
    expect(gridSource).not.toContain("function resolveSuggestionItem");
  });

  it("CustomerSearchScreen > given brand catalog resource > then passes live cards to the grid", () => {
    const searchScreen = readMobileFile("src/screens/CustomerSearchScreen.tsx");

    expect(searchScreen).toContain('resourceId: "brandCatalog"');
    expect(searchScreen).toContain("resolveLiveBrandCards");
    expect(searchScreen).toContain("liveCards=");
  });

  it("HomeSearchPopularPopover > given brand catalog > then resolves popular rows with live logos", () => {
    const popover = readMobileFile("src/screens/home/HomeSearchPopularPopover.tsx");

    expect(popover).toContain("resolveSearchSuggestionItem");
    expect(popover).toContain("liveCards");
  });
});

describe("rankPopularLiveBrandTerms", () => {
  // Staging 2026-07-13: the popular panel's live fallback took the first
  // catalog brands verbatim, which all displayed 0% cashback — a weak
  // "Popular right now" list. Brands with real rates must rank first.
  const card = (brand: string, cashback: string) =>
    ({ brand, cashback, category: "Marketplace", href: "/shop/x", tint: "#EAF3FB" }) as const;

  it("given mixed cashback rates > then higher rates rank first", () => {
    const terms = rankPopularLiveBrandTerms([
      card("King Power", "0%"),
      card("Shopee", "0.29%"),
      card("Lazada", "2.02%"),
      card("KTC Credit Card (TH)", "0%"),
    ]);

    expect(terms).toEqual(["Lazada", "Shopee", "King Power", "KTC Credit Card (TH)"]);
  });

  it("given equal rates > then the catalog order is preserved (stable)", () => {
    const terms = rankPopularLiveBrandTerms([
      card("Alpha", "1.0%"),
      card("Beta", "1.0%"),
      card("Gamma", "1.0%"),
    ]);

    expect(terms).toEqual(["Alpha", "Beta", "Gamma"]);
  });

  it("given unparseable cashback copy > then it ranks as zero instead of crashing", () => {
    const terms = rankPopularLiveBrandTerms([
      card("Mystery", "up to —"),
      card("Shopee", "0.29%"),
    ]);

    expect(terms).toEqual(["Shopee", "Mystery"]);
  });

  it("the popover ranks its live fallback terms by cashback", () => {
    const popover = readMobileFile("src/screens/home/HomeSearchPopularPopover.tsx");

    expect(popover).toContain("rankPopularLiveBrandTerms(");
  });
});
