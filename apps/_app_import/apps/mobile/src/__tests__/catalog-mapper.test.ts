import { describe, expect, it } from "vitest";

import { mapOffersToCatalogBrands } from "@mobile/api/catalogMapper";
import { isOfferListResponse } from "@mobile/api/catalogTypes";
import type { OfferListResponse } from "@mobile/api/catalogTypes";

// Maps the live GET /offer envelope (shape verified against production) into the
// brand-card view-model the favorite screen renders. The sample mirrors a real
// record (Klook Travel) plus a sparse record to pin every fallback.
const sampleResponse: OfferListResponse = {
  page: 1,
  limit: 4,
  total: 181,
  totalPages: 46,
  data: [
    {
      _id: "68e360b7d1a55e0e7f455b84",
      offer_id: 803,
      offer_name: "Klook Travel - CPS",
      offer_name_display: "Klook Travel",
      categories: "Travel",
      commission_store: 3.5,
      logo: "https://img.involve.asia/ia_logo/803_unjtmslX.png",
      extra_store: true,
    },
    {
      // Sparse record: no display name, no category, no logo, no coupon flag.
      _id: "aaaa1111bbbb2222cccc3333",
      offer_name: "Mystery Shop - CPS",
      commission_store: "12",
    },
  ],
};

describe("catalog mapper > mapOffersToCatalogBrands", () => {
  it("given a live offer record > then maps id, display name, category, cashback, href, coupon and logo", () => {
    const [brand] = mapOffersToCatalogBrands(sampleResponse);
    expect(brand).toMatchObject({
      id: "68e360b7d1a55e0e7f455b84",
      name: "Klook Travel",
      category: "Travel",
      cashback: "3.5%",
      href: "/shop/68e360b7d1a55e0e7f455b84",
      showGrabCoupon: true,
      logo: "https://img.involve.asia/ia_logo/803_unjtmslX.png",
    });
  });

  it("given a sparse record > then falls back to offer_name, Others category, no coupon, no logo", () => {
    const [, brand] = mapOffersToCatalogBrands(sampleResponse);
    expect(brand).toMatchObject({
      id: "aaaa1111bbbb2222cccc3333",
      name: "Mystery Shop - CPS",
      category: "Others",
      cashback: "12%",
      showGrabCoupon: false,
    });
    expect(brand.logo).toBeUndefined();
  });

  it("given any record > then derives a stable tint from the brand name", () => {
    const first = mapOffersToCatalogBrands(sampleResponse);
    const second = mapOffersToCatalogBrands(sampleResponse);
    // Deterministic: same name → same tint, and it's a hex color.
    expect(first[0].tint).toBe(second[0].tint);
    expect(first[0].tint).toMatch(/^#[0-9A-F]{6}$/i);
    // Different names should usually differ — at minimum both resolve to palette colors.
    expect(first[1].tint).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it("given a record without a usable name or id > then drops it", () => {
    const mapped = mapOffersToCatalogBrands({
      ...sampleResponse,
      data: [{ _id: "", offer_name: "" }, ...sampleResponse.data],
    });
    expect(mapped).toHaveLength(2);
    expect(mapped[0].name).toBe("Klook Travel");
  });

  it("given an empty envelope > then returns an empty list", () => {
    expect(mapOffersToCatalogBrands({ ...sampleResponse, data: [] })).toEqual([]);
  });
});

describe("catalog mapper > isOfferListResponse", () => {
  it("accepts the live envelope and rejects fixture arrays and junk", () => {
    expect(isOfferListResponse(sampleResponse)).toBe(true);
    expect(isOfferListResponse([{ id: "fixture-row" }])).toBe(false);
    expect(isOfferListResponse(null)).toBe(false);
    expect(isOfferListResponse("nope")).toBe(false);
  });
});
