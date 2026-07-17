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

export async function mintUserTrackingLink({
  accessToken,
  apiUrl,
  deeplink,
  fetchImpl = fetch,
  merchantId,
  offerId,
}: {
  accessToken: string | undefined;
  apiUrl: string;
  /** Optional target page (GoGoLink's pasted product URL); "" for shop-level. */
  deeplink: string;
  fetchImpl?: typeof fetch;
  merchantId: number | undefined;
  offerId: number | undefined;
}): Promise<string | null> {
  if (!accessToken || !offerId || !merchantId) {
    return null;
  }
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
    });
    if (!response.ok) {
      return null;
    }
    const doc = (await response.json()) as { deeplink?: string };
    return credentialFreeHttpUrl(doc?.deeplink);
  } catch {
    return null;
  }
}
