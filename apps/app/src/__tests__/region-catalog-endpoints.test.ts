import { describe, expect, it } from "vitest";

import {
  resolveCustomerAccountResourceEndpoint,
} from "@mobile/account/customerAccountResourceEndpoints";
import { buildOfferSearchPath } from "@mobile/account/searchResource";

describe("customer account resource > region-aware endpoints", () => {
  it("brandCatalog > given Thailand region > then appends country query param", () => {
    expect(resolveCustomerAccountResourceEndpoint({ resourceId: "brandCatalog", regionCode: "TH" })).toBe(
      "/offer?limit=20&page=1&country=TH",
    );
  });

  it("catalog > given Taiwan region > then appends country query param", () => {
    expect(resolveCustomerAccountResourceEndpoint({ resourceId: "catalog", regionCode: "TW" })).toBe(
      "/offer?limit=4&page=1&country=TW",
    );
  });

  it("brandCatalog > given Southeast Asia region > then omits country for client-side filtering", () => {
    expect(resolveCustomerAccountResourceEndpoint({ resourceId: "brandCatalog", regionCode: "SEA" })).toBe(
      "/offer?limit=20&page=1",
    );
  });
});

describe("searchResource > buildOfferSearchPath", () => {
  it("given regionCode > then includes country in offer search path", () => {
    expect(
      buildOfferSearchPath({ limit: 20, page: 1, query: "shopee", regionCode: "TW" }),
    ).toBe("/offer?limit=20&page=1&search=shopee&country=TW");
  });
});
