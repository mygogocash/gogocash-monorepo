/**
 * Role resolution for the NextAuth credentials flow. Extracted from the route
 * handler so the (security-sensitive) backfill logic is pure and unit-tested.
 */
import { DEFAULT_ROLE } from "@/lib/rbac";
import { mockAdminUsers } from "@/app/api/mock/data";

/**
 * Resolves a mock-login email to a role id. If the email matches an admin user,
 * their assigned role is used (so custom roles created in Role Management take
 * effect on login). Otherwise, for local/demo testing, sign in (password 1234)
 * as viewer@…, editor@…, or operator@…/manager@…; anything else is super_admin.
 */
export function mockRoleForEmail(email: string | null | undefined): string {
  const e = (email ?? "").trim().toLowerCase();
  const known = mockAdminUsers.find((u) => u.email.toLowerCase() === e);
  if (known?.role) return known.role;
  const local = e.split("@")[0];
  if (local === "viewer") return "viewer";
  if (local === "editor") return "editor";
  if (local === "operator" || local === "manager") return "admin";
  return "super_admin";
}

/**
 * The role id to persist on a JWT. An already-resolved role id is preserved
 * (including custom role ids). When the role is missing, fall back to the
 * email-based mock mapping ONLY in mock-auth mode; against a real backend, fail
 * to least-privilege (DEFAULT_ROLE) rather than the email-derived super_admin.
 */
export function resolveTokenRole(
  existingRole: unknown,
  email: string | null | undefined,
  mockAllowed: boolean,
): string {
  if (typeof existingRole === "string" && existingRole) return existingRole;
  return mockAllowed ? mockRoleForEmail(email) : DEFAULT_ROLE;
}
