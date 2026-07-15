import { beforeEach, describe, expect, it, vi } from "vitest";

const mockClient = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));

vi.mock("@/lib/axios/client", () => ({ default: mockClient }));

import { getCouponInsights, recordCouponRedemption } from "./couponInsightsApi";

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

  it("records a confirmed redemption against an encoded coupon id", async () => {
    const input = {
      occurredAt: "2026-07-15T08:30:00.000Z",
      referenceId: "merchant-order-42",
    };
    const payload = { recorded: true };
    mockClient.post.mockResolvedValue({ data: payload });

    await expect(recordCouponRedemption("coupon/unsafe", input)).resolves.toBe(
      payload,
    );
    expect(mockClient.post).toHaveBeenCalledWith(
      "/offer/coupons/coupon%2Funsafe/redemptions",
      input,
    );
  });
});
