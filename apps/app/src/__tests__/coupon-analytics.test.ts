import { describe, expect, it, vi } from "vitest";

import {
  createCouponEventId,
  recordCouponEngagement,
} from "@mobile/api/couponAnalytics";

describe("coupon analytics", () => {
  it("builds bounded client event ids without customer PII", () => {
    expect(createCouponEventId("view", 1_721_033_400_000, 0.25)).toMatch(
      /^view-[a-z0-9]+-[a-z0-9]+$/,
    );
  });

  it("posts only view/copy events to the public coupon endpoint", async () => {
    const post = vi.fn().mockResolvedValue({ recorded: true });
    const getClient = vi.fn().mockResolvedValue({ post });

    await expect(
      recordCouponEngagement(
        {
          apiUrl: "https://api-staging.gogocash.co",
          couponId: "507f1f77bcf86cd799439011",
          eventId: "copy-action-123456",
          eventType: "copy",
        },
        { getClient },
      ),
    ).resolves.toBe(true);

    expect(post).toHaveBeenCalledWith(
      "/offer/coupons/507f1f77bcf86cd799439011/events",
      { eventId: "copy-action-123456", eventType: "copy" },
    );
  });

  it("fails quietly because analytics must never break coupon use", async () => {
    const getClient = vi.fn().mockRejectedValue(new Error("offline"));

    await expect(
      recordCouponEngagement(
        {
          apiUrl: "https://api-staging.gogocash.co",
          couponId: "507f1f77bcf86cd799439011",
          eventId: "view-page-123456",
          eventType: "view",
        },
        { getClient },
      ),
    ).resolves.toBe(false);
  });
});
