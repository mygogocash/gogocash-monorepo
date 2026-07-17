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
          discount_type: "cash",
          discount_currency: "THB",
          min_spend: "100",
          min_spend_currency: "THB",
          start_date: "2026-07-10",
          start_time: "09:30",
          end_date: "2026-07-22",
          end_time: "22:15",
          destination_url: "https://tracking.example.test/godaddy?aff=1",
          link: "https://example.test/godaddy",
          code_enabled: false,
          eligibility: "members",
          max_cap: "500",
          max_cap_enabled: true,
          max_cap_currency: "THB",
          one_time_use_enabled: false,
          usage_per_user: "3",
          remaining_quantity: "4",
          terms_and_conditions: "Valid for members only.",
        },
      ]),
    ).toEqual([
      {
        id: "6a564de4535424c5c9370c0e",
        code: null,
        codeEnabled: false,
        description: "10% off eligible orders",
        discount: 10,
        discountCurrency: "THB",
        discountType: "cash",
        endDate: "2026-07-22",
        endTime: "22:15",
        eligibility: "members",
        destinationUrl: "https://tracking.example.test/godaddy?aff=1",
        link: "https://example.test/godaddy",
        maxCap: 500,
        maxCapCurrency: "THB",
        minimumSpend: "100",
        minimumSpendCurrency: "THB",
        name: "Love U",
        oneTimeUse: false,
        remainingQuantity: 4,
        startDate: "2026-07-10",
        startTime: "09:30",
        termsAndConditions: "Valid for members only.",
        usagePerUser: 3,
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

  it("given a disabled max cap > then omits the cap from the customer contract", () => {
    expect(
      mapPublicShopCoupons([
        {
          _id: "no-cap",
          name: "No cap deal",
          max_cap: 0,
          max_cap_enabled: false,
          max_cap_currency: "THB",
        },
      ]),
    ).toEqual([
      expect.objectContaining({
        maxCap: null,
        maxCapCurrency: null,
      }),
    ]);
  });
  it("given a sparse legacy coupon > then preserves unknown money and usage semantics", () => {
    const [coupon] = mapPublicShopCoupons([
      {
        _id: "legacy-sparse",
        name: "Legacy sparse",
        discount: 10,
        max_cap: 500,
        min_spend: "100",
      },
    ]);

    expect(coupon).toMatchObject({
      destinationUrl: null,
      discountCurrency: null,
      discountType: null,
      link: null,
      maxCap: null,
      maxCapCurrency: null,
      minimumSpendCurrency: null,
      oneTimeUse: null,
    });
  });

  it.each([
    [
      " https://track.example/exact?aff=1 ",
      "https://track.example/exact?aff=1",
    ],
    ["javascript:alert(1)", null],
    ["/relative", null],
    ["https://coupon-user@track.example/exact", null],
    ["https://:coupon-secret@track.example/exact", null],
  ])("maps only a verified HTTP destination %p", (destination, expected) => {
    const [coupon] = mapPublicShopCoupons([
      { _id: "destination", name: "Destination", destination_url: destination },
    ]);
    expect(coupon.destinationUrl).toBe(expected);
  });
});
