/**
 * Per-user affiliate tracking links.
 *
 * The offer's raw `tracking_link` carries NO user identity — a click through
 * it converts anonymously and the cashback cannot attribute to the buyer.
 * `POST /involve/create-affiliate` (the same endpoint production web uses)
 * mints a per-user link with `aff_sub=user_id:<mongoId>` baked in server-side;
 * Involve echoes aff_sub into conversion postbacks, which is how the API
 * credits the purchase to the user.
 *
 * Returns null on ANY problem so callers can fall back to the raw tracking
 * link — losing attribution is bad, but losing the sale is worse.
 */
function credentialFreeHttpUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (
      (url.protocol !== "https:" && url.protocol !== "http:") ||
      url.username ||
      url.password
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

// A backend mint (POST /involve/create-affiliate) can chain auth + a 401 refresh
// + a retried provider call (PROVIDER_TIMEOUT_MS = 10s each on the API), so it
// may run for tens of seconds when the affiliate provider is slow or offline.
// The Shop Now overlay only covers ~2.5s (REDIRECT_MIN_DURATION_MS) and
// `openMerchantUrl` awaits this promise before opening the merchant — so with no
// client cap the redirect hangs ("takes a long time to open Lazada"). Abort
// after `timeoutMs` and return null; the caller then opens the raw tracking link
// (anonymous attribution, but the sale isn't lost). Tunable trade-off: higher =
// wider attribution window, lower = snappier redirect.
const DEFAULT_MINT_TIMEOUT_MS = 2500;

export async function mintUserTrackingLink({
  accessToken,
  apiUrl,
  deeplink,
  fetchImpl = fetch,
  merchantId,
  offerId,
  timeoutMs = DEFAULT_MINT_TIMEOUT_MS,
}: {
  accessToken: string | undefined;
  apiUrl: string;
  /** Optional target page (GoGoLink's pasted product URL); "" for shop-level. */
  deeplink: string;
  fetchImpl?: typeof fetch;
  merchantId: number | undefined;
  offerId: number | undefined;
  /** Abort the mint + return null after this many ms so the redirect never hangs. */
  timeoutMs?: number;
}): Promise<string | null> {
  if (!accessToken || !offerId || !merchantId) {
    return null;
  }
  const controller = new AbortController();
  const abortTimer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`${apiUrl}/involve/create-affiliate`, {
      body: JSON.stringify({
        deeplink,
        merchant_id: merchantId,
        offer_id: offerId,
      }),
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: controller.signal,
    });
    if (!response.ok) {
      return null;
    }
    const doc = (await response.json()) as { deeplink?: string };
    return credentialFreeHttpUrl(doc?.deeplink);
  } catch {
    // Includes AbortError on timeout — fall back to the raw link.
    return null;
  } finally {
    clearTimeout(abortTimer);
  }
}
