import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { mapOfferCatalogToCompactBrandCards } from "@mobile/account/brandCatalogResource";
import { resolveSearchSuggestionItem } from "@mobile/account/searchSuggestionResource";
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
        logoUri: "https://cdn.simpleicons.org/instacart/ffffff",
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
