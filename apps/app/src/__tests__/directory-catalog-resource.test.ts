import { describe, expect, it } from "vitest";

import {
  filterDirectoryStores,
  mapBackendCategoryList,
  mapCatalogBrandsToDirectoryStores,
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
});
