import { getSharedMobileApiClient } from "@mobile/api/sharedClient";

export type MissingOrderSubmission = {
  amount: string;
  apiUrl: string;
  files: readonly { name: string; uri: string }[];
  note: string;
  offerId: string;
  orderId: string;
  purchaseDate: string;
};

export async function submitMissingOrder(payload: MissingOrderSubmission): Promise<unknown> {
  const client = await getSharedMobileApiClient(payload.apiUrl);
  if (!client) {
    throw new Error("No mobile session store is available.");
  }

  const formData = new FormData();
  formData.append("offer_id", payload.offerId);
  formData.append("orderId", payload.orderId);
  formData.append("purchaseDate", payload.purchaseDate);
  formData.append("note", payload.note);
  formData.append("amount", payload.amount);

  for (const file of payload.files) {
    if (!file.uri) {
      continue;
    }
    const blob = await fetch(file.uri).then((response) => response.blob());
    formData.append("documents", blob, file.name);
  }

  return client.postFormData("/offer/saveMissingOrder", formData);
}

export function mapBrandCatalogToMissingOrderShops(
  brands: readonly { id: string; name: string }[],
): { id: string; label: string }[] {
  const shops = brands.map((brand) => ({ id: brand.id, label: brand.name }));
  return [...shops, { id: "other", label: "Other (enter brand name)" }];
}
