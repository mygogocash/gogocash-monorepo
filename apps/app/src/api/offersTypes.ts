// Backend DTO for POST /offer/my-offers (FirebaseAuthGuard): a bare array of
// lean Deeplink docs (involve/schemas/deeplink.schema.ts) joined with
// offer_name by the service. Only consumed fields are typed.
export type MyOfferRecord = {
  _id?: string;
  createdAt?: string;
  deeplink?: string;
  merchant_id?: number;
  offer_id?: number | string;
  offer_name?: string;
};

/** Narrow an unknown backend payload to the bare my-offers list. */
export function isMyOfferList(payload: unknown): payload is MyOfferRecord[] {
  return Array.isArray(payload);
}
