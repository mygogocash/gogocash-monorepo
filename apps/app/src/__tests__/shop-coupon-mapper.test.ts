import { describe, expect, it } from "vitest";

import { mapPublicShopCoupons } from "@mobile/api/shopCouponMapper";

describe("mapPublicShopCoupons", () => {
  it("given the public GoDaddy coupon > then maps a code-less deal without inventing a code", () => {
    expect(
      mapPublicShopCoupons([
        {
          _id: "6a564de4535424c5c9370c0e",
          name: " Love U ",
          description: " 10% off eligible orders ",
          code: "   ",
          discount: "10",
          min_spend: "100",
          start_date: "2026-07-10",
          end_date: "2026-07-22",
          link: "https://example.test/godaddy",
        },
      ]),
    ).toEqual([
      {
        id: "6a564de4535424c5c9370c0e",
        code: null,
        description: "10% off eligible orders",
        discount: 10,
        endDate: "2026-07-22",
        link: "https://example.test/godaddy",
        minimumSpend: "100",
        name: "Love U",
        startDate: "2026-07-10",
      },
    ]);
  });

  it("given malformed rows or wrapper payloads > then ignores invalid rows and maps valid data", () => {
    expect(
      mapPublicShopCoupons({
        data: [
          null,
          { _id: "missing-name", name: "" },
          { _id: "save-20", name: "Save 20", code: "SAVE20", discount: 20 },
        ],
      }),
    ).toEqual([
      expect.objectContaining({
        code: "SAVE20",
        discount: 20,
        id: "save-20",
        name: "Save 20",
      }),
    ]);
  });
});
