"use client";

import React from "react";
import { usePermissions } from "@/hooks/usePermissions";
import type { Permission } from "@/lib/rbac";

/**
 * Renders `children` only if the current role holds `permission`; otherwise
 * renders `fallback` (default: nothing). Client-side convenience gate for
 * buttons and sections — back it with server checks for anything sensitive.
 */
export function Can({
  permission,
  fallback = null,
  children,
}: {
  permission: Permission;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { can } = usePermissions();
  return <>{can(permission) ? children : fallback}</>;
}
