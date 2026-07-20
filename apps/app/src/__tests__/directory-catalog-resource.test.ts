import { describe, expect, it } from "vitest";

import {
  filterDirectoryStores,
  mapBackendCategoryIconImages,
  mapBackendCategoryIconKeys,
  mapBackendCategoryList,
  mapCatalogBrandsToDirectoryStores,
  resolveCategoryIconImages,
  resolveCategoryIconKeys,
  resolveCategoryList,
  resolveLiveDirectoryStores,
} from "@mobile/account/directoryCatalogResource";
import type { CatalogBrand } from "@mobile/api/catalogMapper";

const LIVE_BRANDS: readonly CatalogBrand[] = [
  {
    id: "offer-a",
    name: "Alpha Shop",
    category: "Electronics",
    cashback: "12.5%",
    href: "/shop/offer-a",
    showGrabCoupon: true,
    tint: "#2563EB",
  },
  {
    id: "offer-b",
    name: "Beta Travel",
    category: "Travel",
    cashback: "8.0%",
    href: "/shop/offer-b",
    showGrabCoupon: false,
    tint: "#0EA5E9",
  },
];

describe("directoryCatalogResource", () => {
  it("mapCatalogBrandsToDirectoryStores > maps catalog rows into directory card shape", () => {
    expect(mapCatalogBrandsToDirectoryStores(LIVE_BRANDS)[0]).toMatchObject({
      brand: "Alpha Shop",
      cashback: "12.5%",
      category: "Electronics",
      href: "/shop/offer-a",
      id: "offer-a",
      showGrabCoupon: true,
    });
  });

  it("filterDirectoryStores > filters by category and search query", () => {
    const stores = mapCatalogBrandsToDirectoryStores(LIVE_BRANDS);
    expect(
      filterDirectoryStores({
        category: "Travel",
        query: "",
        stores,
      }).map((store) => store.brand)
    ).toEqual(["Beta Travel"]);
  });

  it("resolveLiveDirectoryStores > backend offer list > returns mapped stores", () => {
    const payload = {
      data: [
        {
          _id: "offer-a",
          commission_store: 12.5,
          offer_name: "Alpha Raw",
          offer_name_display: "Alpha Shop",
          status: "approved",
        },
      ],
      limit: 80,
      page: 1,
      total: 1,
      totalPages: 1,
    };

    expect(
      resolveLiveDirectoryStores("backend", payload, []).map((store) => store.brand)
    ).toEqual(["Alpha Shop"]);
  });

  it("mapBackendCategoryList > prefixes All and drops empty names", () => {
    expect(
      mapBackendCategoryList({
        data: [{ name: "Travel" }, { name: " " }, { name: "Electronics" }],
      })
    ).toEqual(["All", "Travel", "Electronics"]);
  });

  it("mapBackendCategoryList > given bare API array > then maps names the same way", () => {
    expect(
      mapBackendCategoryList([
        { name: "Travel", icon_key: "travel" },
        { name: "Gifting", icon_key: "gift" },
      ]),
    ).toEqual(["All", "Travel", "Gifting"]);
  });

  it("mapBackendCategoryIconKeys > keeps admin-chosen icon_key by name", () => {
    expect(
      mapBackendCategoryIconKeys([
        { name: "Travel", icon_key: "travel" },
        { name: "Custom Gifts", icon_key: "gift" },
        { name: "No Key" },
      ]),
    ).toEqual({
      Travel: "travel",
      "Custom Gifts": "gift",
    });
  });

  it("mapBackendCategoryIconImages > keeps uploaded image URLs by name", () => {
    expect(
      mapBackendCategoryIconImages([
        { name: "Travel", image: "https://cdn.example/travel.png" },
        { name: "Pets", icon_key: "pets" },
      ]),
    ).toEqual({
      Travel: "https://cdn.example/travel.png",
    });
  });

  it("resolveCategoryList / resolveCategoryIconKeys > backend bare array > uses live docs", () => {
    const payload = [
      { name: "Travel", icon_key: "travel" },
      { name: "Pets", icon_key: "pets" },
    ];

    expect(resolveCategoryList("backend", payload, ["All", "Fixture"])).toEqual([
      "All",
      "Travel",
      "Pets",
    ]);
    expect(resolveCategoryIconKeys("backend", payload)).toEqual({
      Travel: "travel",
      Pets: "pets",
    });
    expect(resolveCategoryIconKeys("fixtures", payload)).toEqual({});
    expect(
      resolveCategoryIconImages("backend", [
        { name: "Travel", image: "https://cdn.example/t.png" },
      ]),
    ).toEqual({ Travel: "https://cdn.example/t.png" });
  });
});

describe("CategoryGlyph wiring", () => {
  it("directory asides prefer CategoryGlyph with icon keys and images", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const shop = readFileSync(
      resolve(__dirname, "../screens/discovery/ShopDirectoryCategoryAside.tsx"),
      "utf8",
    );
    const brand = readFileSync(
      resolve(__dirname, "../screens/discovery/BrandDirectoryCategoryAside.tsx"),
      "utf8",
    );
    expect(shop).toContain("categoryIconKeys?.[category]");
    expect(shop).toContain("categoryIconImages?.[category]");
    expect(brand).toContain("categoryIconKeys?.[category]");
    expect(brand).toContain("categoryIconImages?.[category]");
  });
});
