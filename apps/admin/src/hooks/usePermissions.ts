"use client";

import { useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRolesQuery } from "@/hooks/useRoles";
import { asRole, can as staticCan, type Permission } from "@/lib/rbac";

/**
 * Resolves the current user's role + permission checks from the dynamic role
 * store (so custom roles are honored), falling back to the built-in static
 * matrix while the role list is in flight. Backs all client gating (sidebar,
 * `<Can>`, buttons, route guard).
 */
export function usePermissions() {
  const { data: session, status } = useSession();
  const roleId = (session?.user?.role as string | undefined) ?? "viewer";

  const rolesQuery = useRolesQuery();
  const rolesLoaded = rolesQuery.data !== undefined;
  const settled = rolesQuery.isSuccess || rolesQuery.isError;
  const perms = rolesQuery.data?.data.find((r) => r.id === roleId)?.permissions;

  const can = useCallback(
    (permission: Permission): boolean =>
      perms
        ? perms.includes(permission)
        : staticCan(asRole(roleId), permission),
    [perms, roleId],
  );
  const canAny = useCallback(
    (permissions: Permission[]) => permissions.some((p) => can(p)),
    [can],
  );

  return {
    role: roleId,
    /** True once the session is known and the role list has settled (success or error). */
    ready: status !== "loading" && settled,
    /** True only when the role list actually loaded (false on fetch error). */
    rolesLoaded,
    can,
    canAny,
  };
}
