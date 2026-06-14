"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";
import { isRole, permissionForRoute } from "@/lib/rbac";

/**
 * Client-side route gate that honors custom (dynamic) roles — which the edge
 * proxy can't resolve from the runtime role store. Redirects to /403 when the
 * current role lacks the route's view permission. Built-in tiers are already
 * enforced at the proxy; this covers custom roles, and **fails closed**: if the
 * role list can't load, a custom (non-built-in) role is denied rather than
 * silently allowed.
 */
export default function RoutePermissionGuard({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const { can, ready, role, rolesLoaded } = usePermissions();

  const permission = permissionForRoute(pathname);
  const custom = !isRole(role);
  const denied =
    !!permission &&
    pathname !== "/403" &&
    ready &&
    (custom && !rolesLoaded ? true : !can(permission));

  useEffect(() => {
    if (denied) router.replace("/403");
  }, [denied, router]);

  if (denied) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">Redirecting…</p>
      </div>
    );
  }
  return <>{children}</>;
}
