import { describe, expect, it } from "vitest";

import {
  mapBackendTopBrands,
  resolveTopBrands,
  type TopBrandCard,
  type TopBrandsPayload,
} from "@mobile/account/topBrandResource";

const FIXTURE: readonly TopBrandCard[] = [
  {
    brand: "Fixture Co",
    cashback: "9.9%",
    label: "Grab Coupon",
    logoUri: "https://cdn/fix.png",
    showGrabCoupon: true,
    tint: "#000000",
  },
];

describe("mapBackendTopBrands", () => {
  it("given a null payload > then returns an empty list", () => {
    expect(mapBackendTopBrands(null)).toEqual([]);
  });

  it("given backend brands > then maps name/logo/cashback and fills cosmetic fields", () => {
    const payload: TopBrandsPayload = {
      data: [
        { offer_id: 2, brand: "Bravo", logo: "https://cdn/b.png", cashback: "10.0%" },
        { offer_id: 1, brand: "Alpha", logo: "https://cdn/a.png", cashback: "12.5%" },
      ],
    };

    expect(mapBackendTopBrands(payload)).toEqual([
      {
        brand: "Bravo",
        cashback: "10.0%",
        label: "Grab Coupon",
        logoUri: "https://cdn/b.png",
        showGrabCoupon: false,
        tint: "#6366F1",
      },
      {
        brand: "Alpha",
        cashback: "12.5%",
        label: "Grab Coupon",
        logoUri: "https://cdn/a.png",
        showGrabCoupon: false,
        tint: "#2563EB",
      },
    ]);
  });
});

describe("resolveTopBrands", () => {
  it("given fixtures source > then returns the fallback", () => {
    expect(resolveTopBrands("fixtures", null, FIXTURE)).toEqual(FIXTURE);
  });

  it("given backend source with brands > then returns the mapped list", () => {
    const payload: TopBrandsPayload = {
      data: [{ offer_id: 1, brand: "Alpha", logo: "https://cdn/a.png", cashback: "12.5%" }],
    };

    expect(resolveTopBrands("backend", payload, FIXTURE)).toEqual([
      {
        brand: "Alpha",
        cashback: "12.5%",
        label: "Grab Coupon",
        logoUri: "https://cdn/a.png",
        showGrabCoupon: false,
        tint: "#6366F1",
      },
    ]);
  });

  it("given backend source with an empty payload > then falls back", () => {
    expect(resolveTopBrands("backend", { data: [] }, FIXTURE)).toEqual(FIXTURE);
  });

  it("given backend source with null data > then falls back", () => {
    expect(resolveTopBrands("backend", null, FIXTURE)).toEqual(FIXTURE);
  });
});
