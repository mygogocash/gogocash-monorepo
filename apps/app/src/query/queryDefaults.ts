/** Shared React Query defaults for the customer app (mirrors AppProviders). */
export const CUSTOMER_QUERY_STALE_TIME_MS = 1000 * 60 * 5;

/** Public brand/banner/catalog feeds — admin changes should show within ~1 minute. */
export const PUBLIC_CATALOG_QUERY_STALE_TIME_MS = 1000 * 60;

export const customerQueryDefaults = {
  retry: 2,
  staleTime: CUSTOMER_QUERY_STALE_TIME_MS,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
} as const;
