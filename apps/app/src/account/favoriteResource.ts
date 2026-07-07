import { getSharedMobileApiClient } from "@mobile/api/sharedClient";
import { hasUsableMobileSessionToken } from "@mobile/auth/sessionValidity";
import { getSharedSessionStore } from "@mobile/auth/sharedSessionStore";
import { getMobileEnv } from "@mobile/config/env";

export async function toggleFavoriteOffer({
  apiUrl,
  offerId,
}: {
  apiUrl: string;
  offerId: string;
}): Promise<unknown> {
  const client = await getSharedMobileApiClient(apiUrl);
  if (!client) {
    throw new Error("No mobile session store is available.");
  }

  return client.post(`/offer/favorite/${encodeURIComponent(offerId)}`);
}

export async function fetchFavoriteOfferIds({
  apiUrl,
  limit = 100,
  page = 1,
}: {
  apiUrl: string;
  limit?: number;
  page?: number;
}): Promise<string[]> {
  const client = await getSharedMobileApiClient(apiUrl);
  if (!client) {
    return [];
  }

  const env = getMobileEnv();
  const sessionStore = await getSharedSessionStore();
  const session = await sessionStore?.getSession();
  if (!hasUsableMobileSessionToken(session ?? null, env.accountDataSource)) {
    return [];
  }

  const response = await client.get<{
    data?: { offer_id?: { _id?: string } | string }[];
  }>(`/offer/favorite/${page}/${limit}`);

  return (
    response?.data
      ?.map((row) => {
        const offer = row.offer_id;
        if (typeof offer === "string") {
          return offer;
        }
        return offer?._id;
      })
      .filter((id): id is string => Boolean(id)) ?? []
  );
}
