import { describe, expect, it } from "vitest";
import { PUBLIC_ADMIN_CONFIGURED_RESOURCE_IDS } from "../account/customerAccountResourceIds";
import {
  resolveCustomerAccountResourceRequest,
  shouldFetchCustomerAccountResourceFromBackend,
} from "../account/customerAccountResourceEndpoints";

describe("resolveCustomerAccountResourceRequest", () => {
  it("offers > then describes the real backend contract: POST /offer/my-offers with a paged body", () => {
    expect(resolveCustomerAccountResourceRequest({ resourceId: "offers" })).toEqual({
      body: { limit: 10, page: 1 },
      method: "POST",
      path: "/offer/my-offers",
    });
  });

  it("profile > then stays a plain GET of the existing endpoint", () => {
    expect(resolveCustomerAccountResourceRequest({ resourceId: "profile" })).toEqual({
      method: "GET",
      path: "/user/profile",
    });
  });

  it("wallet > then describes the real backend contract: POST /withdraw/check", () => {
    expect(resolveCustomerAccountResourceRequest({ resourceId: "wallet" })).toEqual({
      method: "POST",
      path: "/withdraw/check",
    });
  });

  it("brandCatalog > then requests a modest first page for faster home paint", () => {
    expect(resolveCustomerAccountResourceRequest({ resourceId: "brandCatalog" })).toEqual({
      method: "GET",
      path: "/offer?limit=20&page=1&country=TH",
    });
  });

  it("merchant > then keeps the encoded merchant id in the GET path", () => {
    expect(
      resolveCustomerAccountResourceRequest({ merchantId: "brand a", resourceId: "merchant" })
    ).toEqual({
      method: "GET",
      path: "/offer/brand%20a",
    });
  });

  it("merchantCoupons > then requests public coupons for the encoded merchant id", () => {
    expect(
      resolveCustomerAccountResourceRequest({
        merchantId: "brand a",
        resourceId: "merchantCoupons",
      })
    ).toEqual({
      method: "GET",
      path: "/offer/get-coupon-id/brand%20a",
    });
  });

  it("allBrandBanner > then requests the separate public directory banner", () => {
    expect(resolveCustomerAccountResourceRequest({ resourceId: "allBrandBanner" })).toEqual({
      method: "GET",
      path: "/offer/banner-all-brand-page",
    });
  });
});

describe("PUBLIC_ADMIN_CONFIGURED_RESOURCE_IDS", () => {
  it("includes merchant coupons with the public admin-curated resources", () => {
    expect(PUBLIC_ADMIN_CONFIGURED_RESOURCE_IDS).toEqual([
      "allBrandBanner",
      "homeBanner",
      "merchant",
      "merchantCoupons",
      "topBrand",
    ]);
  });
});

describe("shouldFetchCustomerAccountResourceFromBackend", () => {
  const apiUrl = "http://localhost:8080";

  it("fixtures mode + topBrand + apiUrl > then fetches from backend", () => {
    expect(
      shouldFetchCustomerAccountResourceFromBackend({
        accountDataSource: "fixtures",
        resourceId: "topBrand",
        enabled: true,
        apiUrl,
      }),
    ).toBe(true);
  });

  it("fixtures mode + homeBanner + apiUrl > then fetches from backend", () => {
    expect(
      shouldFetchCustomerAccountResourceFromBackend({
        accountDataSource: "fixtures",
        resourceId: "homeBanner",
        enabled: true,
        apiUrl,
      }),
    ).toBe(true);
  });

  it("fixtures mode + merchant + apiUrl > then fetches from backend", () => {
    expect(
      shouldFetchCustomerAccountResourceFromBackend({
        accountDataSource: "fixtures",
        resourceId: "merchant",
        enabled: true,
        apiUrl,
      }),
    ).toBe(true);
  });

  it("fixtures mode + merchantCoupons + apiUrl > then fetches from backend", () => {
    expect(
      shouldFetchCustomerAccountResourceFromBackend({
        accountDataSource: "fixtures",
        resourceId: "merchantCoupons",
        enabled: true,
        apiUrl,
      }),
    ).toBe(true);
  });

  it("fixtures mode + profile > then stays on fixtures only", () => {
    expect(
      shouldFetchCustomerAccountResourceFromBackend({
        accountDataSource: "fixtures",
        resourceId: "profile",
        enabled: true,
        apiUrl,
      }),
    ).toBe(false);
  });

  it("fixtures mode + topBrand + empty apiUrl > then does not fetch", () => {
    expect(
      shouldFetchCustomerAccountResourceFromBackend({
        accountDataSource: "fixtures",
        resourceId: "topBrand",
        enabled: true,
        apiUrl: "",
      }),
    ).toBe(false);
  });

  it("backend mode + profile + apiUrl > then fetches from backend", () => {
    expect(
      shouldFetchCustomerAccountResourceFromBackend({
        accountDataSource: "backend",
        resourceId: "profile",
        enabled: true,
        apiUrl,
      }),
    ).toBe(true);
  });

  it("disabled mode > then never fetches", () => {
    expect(
      shouldFetchCustomerAccountResourceFromBackend({
        accountDataSource: "disabled",
        resourceId: "topBrand",
        enabled: true,
        apiUrl,
      }),
    ).toBe(false);
  });

  it("enabled false > then never fetches", () => {
    expect(
      shouldFetchCustomerAccountResourceFromBackend({
        accountDataSource: "backend",
        resourceId: "topBrand",
        enabled: false,
        apiUrl,
      }),
    ).toBe(false);
  });
});
