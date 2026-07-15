import { beforeEach, describe, expect, it, vi } from "vitest";

const mockClient = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("@/lib/axios/client", () => ({ default: mockClient }));

import { getCouponInsights } from "./couponInsightsApi";

describe("coupon insights API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads a single coupon's paginated real insight contract", async () => {
    const payload = { coupon: { id: "coupon/unsafe" } };
    mockClient.get.mockResolvedValue({ data: payload });

    await expect(
      getCouponInsights("coupon/unsafe", { limit: 25, page: 2 }),
    ).resolves.toBe(payload);
    expect(mockClient.get).toHaveBeenCalledWith(
      "/offer/coupons/coupon%2Funsafe/insights",
      { params: { limit: 25, page: 2 } },
    );
  });
});
