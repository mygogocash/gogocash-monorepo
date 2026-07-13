"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { DEFAULT_PLATFORM_FEE_PERCENT } from "@/lib/commissionFee";
import type { ResponseFee } from "@/types/api";

const SYSTEM_FEE_PERCENT_QUERY_KEY = [
  "admin",
  "system-fee-percent",
] as const;

/**
 * Resolve the platform fee % from the Fee Structure response
 * (`GET /admin/get-fee-rate` → `ResponseFee[]`, first entry's `system` field).
 *
 * The configured value is used verbatim when usable — including 0, which is a
 * valid "no fee" configuration. The 30% default applies only when the response
 * is missing, malformed, or out of the sane [0, 100) range.
 */
export function resolveSystemFeePercent(
  response: ResponseFee[] | null | undefined,
): { feePercent: number; isFallback: boolean } {
  const system = response?.[0]?.system;
  if (
    typeof system === "number" &&
    Number.isFinite(system) &&
    system >= 0 &&
    system < 100
  ) {
    return { feePercent: system, isFallback: false };
  }
  return { feePercent: DEFAULT_PLATFORM_FEE_PERCENT, isFallback: true };
}

/**
 * Platform fee % configured under Fee Structure, shared via react-query so all
 * commission entry surfaces (offer editor, create-brand form) use one cache
 * entry. Returns the 30% fallback (`isFallback: true`) while loading or when
 * the fetch fails.
 */
export function useSystemFeePercent(): {
  feePercent: number;
  isFallback: boolean;
} {
  const { data, isError } = useQuery<ResponseFee[]>({
    queryKey: SYSTEM_FEE_PERCENT_QUERY_KEY,
    queryFn: () => apiClient.getFee(),
    staleTime: 60_000,
  });
  return resolveSystemFeePercent(isError ? undefined : data);
}
