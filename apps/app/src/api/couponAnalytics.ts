import { getSharedMobileApiClient } from "@mobile/api/sharedClient";

export type CouponEngagementType = "view" | "copy";

type CouponAnalyticsClient = {
  post<TResponse>(path: string, body: unknown): Promise<TResponse>;
};

type CouponAnalyticsDependencies = {
  getClient: (apiUrl: string) => Promise<CouponAnalyticsClient | null>;
};

const defaultDependencies: CouponAnalyticsDependencies = {
  getClient: getSharedMobileApiClient,
};

/**
 * A short, non-identifying idempotency key. One view id is retained for the
 * lifetime of a rendered coupon card; every successful copy action gets a new
 * id. No customer/session identifier is sent to the public analytics route.
 */
export function createCouponEventId(
  eventType: CouponEngagementType,
  now = Date.now(),
  random = Math.random(),
): string {
  const entropy = Math.floor(
    Math.max(0, Math.min(0.999999999, random)) * 1_000_000_000,
  );
  return `${eventType}-${now.toString(36)}-${entropy.toString(36)}`;
}

export async function recordCouponEngagement(
  input: {
    apiUrl: string;
    couponId: string;
    eventId: string;
    eventType: CouponEngagementType;
  },
  dependencies: CouponAnalyticsDependencies = defaultDependencies,
): Promise<boolean> {
  if (!input.apiUrl || !input.couponId || !input.eventId) return false;

  try {
    const client = await dependencies.getClient(input.apiUrl);
    if (!client) return false;
    await client.post<{ recorded: boolean }>(
      `/offer/coupons/${encodeURIComponent(input.couponId)}/events`,
      { eventId: input.eventId, eventType: input.eventType },
    );
    return true;
  } catch {
    // Analytics is best-effort and must never block viewing/copying a coupon.
    return false;
  }
}
