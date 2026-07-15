import client from "@/lib/axios/client";

export type CouponInsightRedemption = {
  id: string;
  referenceId: string;
  status: "redeemed";
  usedAt: string;
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

export type RecordCouponRedemptionInput = {
  occurredAt: string;
  referenceId: string;
};

export type RecordCouponRedemptionResponse = {
  recorded: boolean;
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

export async function recordCouponRedemption(
  couponId: string,
  input: RecordCouponRedemptionInput,
): Promise<RecordCouponRedemptionResponse> {
  const { data } = await client.post<RecordCouponRedemptionResponse>(
    `/offer/coupons/${encodeURIComponent(couponId)}/redemptions`,
    input,
  );
  return data;
}
