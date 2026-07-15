import { fromApiRole } from "@/lib/rbac";

export type AdminAuthRoleClaims = {
  apiRole?: string;
  role: string;
};

/** Preserve the backend role for API-aligned actions while keeping conservative UI mapping. */
export function resolveAdminAuthRoleClaims(
  apiRole: unknown,
): AdminAuthRoleClaims {
  const rawRole = typeof apiRole === "string" && apiRole ? apiRole : undefined;
  return {
    ...(rawRole ? { apiRole: rawRole } : {}),
    role: fromApiRole(rawRole),
  };
}
