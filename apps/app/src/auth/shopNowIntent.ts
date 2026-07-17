const SESSION_KEY = "gogocash.pendingShopNow";
const COUPON_SESSION_KEY = "gogocash.pendingShopNowCoupon";

let pendingShopNowId: string | null = null;
let pendingCouponId: string | null = null;

export type PendingShopNowIntentDetails = {
  couponId?: string;
};

/** Remember which shop the user tried to open before sign-in (show-once per attempt). */
export function setPendingShopNowIntent(
  shopId: string,
  details: PendingShopNowIntentDetails = {},
): void {
  pendingShopNowId = shopId;
  pendingCouponId = details.couponId?.trim() || null;

  if (typeof window !== "undefined" && window.sessionStorage) {
    try {
      window.sessionStorage.setItem(SESSION_KEY, shopId);
      if (pendingCouponId) {
        window.sessionStorage.setItem(COUPON_SESSION_KEY, pendingCouponId);
      } else {
        window.sessionStorage.removeItem(COUPON_SESSION_KEY);
      }
    } catch {
      // Quota / private mode — in-memory flag still works for this app session.
    }
  }
}

/** Read a matching pending intent without consuming it. */
export function peekPendingShopNowIntent(
  shopId: string,
): PendingShopNowIntentDetails | null {
  let pending = pendingShopNowId;
  let couponId = pendingCouponId;

  if (!pending && typeof window !== "undefined" && window.sessionStorage) {
    try {
      pending = window.sessionStorage.getItem(SESSION_KEY);
      couponId = window.sessionStorage.getItem(COUPON_SESSION_KEY);
    } catch {
      pending = null;
      couponId = null;
    }
  }

  if (pending !== shopId) {
    return null;
  }

  return couponId ? { couponId } : {};
}

/** Returns details once when the signed-in user returns to the matching shop. */
export function consumePendingShopNowIntentDetails(
  shopId: string,
): PendingShopNowIntentDetails | null {
  const details = peekPendingShopNowIntent(shopId);
  if (!details) return null;

  pendingShopNowId = null;
  pendingCouponId = null;

  if (typeof window !== "undefined" && window.sessionStorage) {
    try {
      window.sessionStorage.removeItem(SESSION_KEY);
      window.sessionStorage.removeItem(COUPON_SESSION_KEY);
    } catch {
      // ignore
    }
  }

  return details;
}

/** Backward-compatible boolean consumer for ordinary Shop Now callers/tests. */
export function consumePendingShopNowIntent(shopId: string): boolean {
  return consumePendingShopNowIntentDetails(shopId) !== null;
}

/** @internal Test helper */
export function resetPendingShopNowIntentForTests(): void {
  pendingShopNowId = null;
  pendingCouponId = null;

  if (typeof window !== "undefined" && window.sessionStorage) {
    try {
      window.sessionStorage.removeItem(SESSION_KEY);
      window.sessionStorage.removeItem(COUPON_SESSION_KEY);
    } catch {
      // ignore
    }
  }
}
