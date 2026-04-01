import { apiClient } from "@/lib/api";
import type { OffersQuery, OffersResponse } from "@/types/api";

/** Default first page of offers — used for prefetch and initial list state. */
export const DEFAULT_OFFERS_LIST_QUERY: OffersQuery = {
  search: "",
  limit: 10,
  page: 1,
  country: "",
};

/**
 * Stable query key for TanStack Query (serializable, order-stable).
 * Prefix `["offers", "list"]` is invalidated after offer mutations.
 */
export function offersListQueryKey(q: OffersQuery) {
  return [
    "offers",
    "list",
    q.search ?? "",
    q.page ?? 1,
    q.limit ?? 10,
    q.country ?? "",
    q.category ?? "",
    q.status ?? "",
    q.type ?? "",
  ] as const;
}

export async function fetchOffersList(query: OffersQuery): Promise<OffersResponse> {
  return apiClient.getOffers(query);
}
