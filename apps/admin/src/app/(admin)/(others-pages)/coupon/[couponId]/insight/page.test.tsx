import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/common/PageBreadCrumb", () => ({
  default: () => null,
}));
vi.mock("@/components/coupon/CouponHistoryTable", () => ({
  default: () => null,
}));

import CouponInsightPage from "./page";

describe("CouponInsightPage rendering mode", () => {
  it("resolves the coupon route without awaiting unused search params", async () => {
    const readSearchParams = vi.fn(() => {
      throw new Error(
        "searchParams must not opt this page into dynamic rendering",
      );
    });
    const props = {
      params: Promise.resolve({ couponId: "coupon-123" }),
    } as unknown as Parameters<typeof CouponInsightPage>[0];
    Object.defineProperty(props, "searchParams", { get: readSearchParams });

    const page = await CouponInsightPage(props);

    expect(page).toBeTruthy();
    expect(readSearchParams).not.toHaveBeenCalled();
  });
});
