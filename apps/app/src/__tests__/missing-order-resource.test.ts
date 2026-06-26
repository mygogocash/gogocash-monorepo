import { describe, expect, it } from "vitest";
import { mapBrandCatalogToMissingOrderShops } from "../account/missingOrderResource";

describe("mapBrandCatalogToMissingOrderShops", () => {
  it("given live brands > then maps offer ids and appends Other option", () => {
    expect(
      mapBrandCatalogToMissingOrderShops([
        { id: "offer-1", name: "Shopee" },
        { id: "offer-2", name: "Lazada" },
      ]),
    ).toEqual([
      { id: "offer-1", label: "Shopee" },
      { id: "offer-2", label: "Lazada" },
      { id: "other", label: "Other (enter brand name)" },
    ]);
  });
});
