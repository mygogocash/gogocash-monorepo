"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api";
import { listRoles } from "@/lib/rbac/roleStore";
import type { RolesResponse } from "@/types/api";

export const ROLES_QUERY_KEY = ["admin", "roles"] as const;

/**
 * Single shared query for the dynamic role list (built-in + custom). Used by
 * `usePermissions`, the Role Management page, and the Admin Users table so they
 * share one cache entry and one fetcher.
 *
 * Falls back to the built-in role definitions when the backend has no
 * `/admin/roles` endpoint (current state) — without this the role list is empty
 * and the "Invite admin" dropdown has nothing to pick.
 */
export function useRolesQuery() {
  const { status } = useSession();
  return useQuery<RolesResponse>({
    queryKey: ROLES_QUERY_KEY,
    queryFn: async () => {
      try {
        return await apiClient.getRoles();
      } catch {
        return { data: listRoles() };
      }
    },
    staleTime: 60_000,
    enabled: status === "authenticated",
  });
}
