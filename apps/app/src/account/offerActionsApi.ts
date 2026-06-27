import { getSharedMobileApiClient } from "@mobile/api/sharedClient";

export async function toggleFavoriteOffer(
  apiUrl: string,
  offerId: string,
): Promise<unknown> {
  const client = await getSharedMobileApiClient(apiUrl);
  if (!client) {
    throw new Error("No mobile session store is available.");
  }

  return client.post(`/offer/favorite/${encodeURIComponent(offerId)}`);
}
