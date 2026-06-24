/** Shared React Query defaults for the customer app (mirrors AppProviders). */
export const CUSTOMER_QUERY_STALE_TIME_MS = 1000 * 60 * 5;

export const customerQueryDefaults = {
  retry: 2,
  staleTime: CUSTOMER_QUERY_STALE_TIME_MS,
} as const;
