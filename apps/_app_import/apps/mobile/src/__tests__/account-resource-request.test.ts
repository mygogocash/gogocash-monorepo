import { describe, expect, it } from "vitest";
import { resolveCustomerAccountResourceRequest } from "../account/customerAccountResource";

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

  it("merchant > then keeps the encoded merchant id in the GET path", () => {
    expect(
      resolveCustomerAccountResourceRequest({ merchantId: "brand a", resourceId: "merchant" })
    ).toEqual({
      method: "GET",
      path: "/offer/brand%20a",
    });
  });
});
