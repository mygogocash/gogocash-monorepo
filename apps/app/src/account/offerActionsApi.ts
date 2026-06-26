import { getSharedMobileApiClient } from "@mobile/api/sharedClient";
import { getSharedSessionStore } from "@mobile/auth/sharedSessionStore";
import { getFirebaseIdToken } from "@mobile/auth/firebaseClient";

export type SaveMissingOrderInput = {
  amount: string;
  attachments: readonly { name: string; uri: string }[];
  note: string;
  offerId: string;
  orderId: string;
  purchaseDate: string;
};

async function resolveAuthToken(): Promise<string> {
  const firebaseToken = await getFirebaseIdToken();
  if (firebaseToken) {
    return firebaseToken;
  }

  const sessionStore = await getSharedSessionStore();
  const session = sessionStore ? await sessionStore.getSession() : null;
  return typeof session?.access_token === "string" ? session.access_token : "";
}

export async function saveMissingOrderClaim(
  apiUrl: string,
  input: SaveMissingOrderInput,
): Promise<unknown> {
  const token = await resolveAuthToken();
  const formData = new FormData();
  formData.append("offer_id", input.offerId);
  formData.append("orderId", input.orderId);
  formData.append("purchaseDate", input.purchaseDate);
  formData.append("note", input.note);
  formData.append("amount", input.amount);

  for (const attachment of input.attachments) {
    if (!attachment.uri) {
      continue;
    }

    if (typeof fetch !== "undefined" && attachment.uri.startsWith("blob:")) {
      const blob = await fetch(attachment.uri).then((response) => response.blob());
      formData.append("documents", blob, attachment.name);
      continue;
    }

    formData.append("documents", {
      name: attachment.name,
      type: "image/jpeg",
      uri: attachment.uri,
    } as unknown as Blob);
  }

  const baseUrl = apiUrl.replace(/\/+$/, "");
  const response = await fetch(`${baseUrl}/offer/saveMissingOrder`, {
    body: formData,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    method: "POST",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(payload.message ?? `Missing order submit failed (${response.status}).`);
  }

  return response.json().catch(() => ({}));
}

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
