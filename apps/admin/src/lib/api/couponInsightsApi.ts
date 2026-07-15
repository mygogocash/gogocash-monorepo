import client from "@/lib/axios/client";

export type CouponInsightRedemption = {
  id: string;
  referenceId: string;
  status: "redeemed";
  usedAt: string;
  userEmail: string;
  userId: string;
};

export type CouponInsightsResponse = {
  coupon: {
    code: string;
    discount: number;
    id: string;
    name: string;
    offerName: string;
  };
  metrics: {
    codeCopies: number;
    copyRate: number;
    detailViews: number;
    usageAmount: number;
    usageUnit: "redemptions";
  };
  redemptions: {
    data: CouponInsightRedemption[];
    limit: number;
    page: number;
    total: number;
    totalPages: number;
  };
};

export async function getCouponInsights(
  couponId: string,
  params: { limit: number; page: number },
): Promise<CouponInsightsResponse> {
  const { data } = await client.get<CouponInsightsResponse>(
    `/offer/coupons/${encodeURIComponent(couponId)}/insights`,
    { params },
  );
  return data;
}
