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

  it("landingRails > then resolves the public curated-rails endpoint", () => {
    expect(resolveCustomerAccountResourceEndpoint({ resourceId: "landingRails", regionCode: "TH" })).toBe(
      "/offer/landing-rails",
    );
  });
});

describe("searchResource > buildOfferSearchPath", () => {
  it("given regionCode > then includes country in offer search path", () => {
    expect(
      buildOfferSearchPath({ limit: 20, page: 1, query: "shopee", regionCode: "TW" }),
    ).toBe("/offer?limit=20&page=1&search=shopee&country=TW");
  });

  it("given category > then includes category query for category-detail browse (#438)", () => {
    expect(
      buildOfferSearchPath({
        category: "Electronics",
        limit: 80,
        page: 1,
        regionCode: "TH",
      }),
    ).toBe("/offer?limit=80&page=1&category=Electronics&country=TH");
  });

  it("given category All > then omits category param", () => {
    expect(
      buildOfferSearchPath({ category: "All", limit: 80, page: 1 }),
    ).toBe("/offer?limit=80&page=1");
  });
});
