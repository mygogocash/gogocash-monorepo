"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api";
import { DEFAULT_MOCK_ACCESS_TOKEN } from "@/lib/authTokens";

export const ROLES_QUERY_KEY = ["admin", "roles"] as const;

/**
 * Single shared query for the dynamic role list (built-in + custom). Used by
 * `usePermissions`, the Role Management page, and the Admin Users table so they
 * share one cache entry and one fetcher.
 */
export function useRolesQuery() {
  const { data: session, status } = useSession();
  const token =
    (session as { accessToken?: string })?.accessToken ??
    DEFAULT_MOCK_ACCESS_TOKEN;
  return useQuery({
    queryKey: ROLES_QUERY_KEY,
    queryFn: () => apiClient.getRoles(token),
    staleTime: 60_000,
    enabled: status === "authenticated",
  });
}
