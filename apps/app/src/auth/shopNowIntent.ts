const SESSION_KEY = "gogocash.pendingShopNow";

let pendingShopNowId: string | null = null;

/** Remember which shop the user tried to open before sign-in (show-once per attempt). */
export function setPendingShopNowIntent(shopId: string): void {
  pendingShopNowId = shopId;

  if (typeof window !== "undefined" && window.sessionStorage) {
    try {
      window.sessionStorage.setItem(SESSION_KEY, shopId);
    } catch {
      // Quota / private mode — in-memory flag still works for this app session.
    }
  }
}

/** Returns true once when the signed-in user returns to the matching shop detail route. */
export function consumePendingShopNowIntent(shopId: string): boolean {
  let pending = pendingShopNowId;

  if (!pending && typeof window !== "undefined" && window.sessionStorage) {
    try {
      pending = window.sessionStorage.getItem(SESSION_KEY);
    } catch {
      pending = null;
    }
  }

  if (pending !== shopId) {
    return false;
  }

  pendingShopNowId = null;

  if (typeof window !== "undefined" && window.sessionStorage) {
    try {
      window.sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
  }

  return true;
}

/** @internal Test helper */
export function resetPendingShopNowIntentForTests(): void {
  pendingShopNowId = null;

  if (typeof window !== "undefined" && window.sessionStorage) {
    try {
      window.sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
  }
}
