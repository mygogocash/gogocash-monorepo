import type { QueryFunction } from "@tanstack/react-query";
import { fetcher } from "@/lib/axios/client";
import { DataOffer } from "@/interfaces/offer";

/** Shared TanStack Query key for `GET /offer/extra`. */
export const offerExtraQueryKey = ["getOfferExtra"] as const;

const offerExtraQueryFn: QueryFunction<DataOffer[]> = async () => {
  const data = await fetcher("/offer/extra");
  return data as DataOffer[];
};

/** Options for `useQuery` — keep fetch policy in one place. */
export const offerExtraQueryOptions = {
  queryKey: offerExtraQueryKey,
  queryFn: offerExtraQueryFn,
  staleTime: 0,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
} as const;
