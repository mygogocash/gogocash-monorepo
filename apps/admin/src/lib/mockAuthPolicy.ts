/**
 * Whether the mock admin password (1234) is accepted without a real API check.
 * - Real API configured (NEXT_PUBLIC_API_URL set): never allowed.
 * - Local dev: allowed.
 * - Staging / internal servers: set ALLOW_MOCK_ADMIN_PASSWORD=true.
 * - Firebase static export: NEXT_PUBLIC_FIREBASE_STATIC=1 at build time (internal review builds).
 */
import { isAdminApiConfigured } from "@/lib/adminApiMode";

export function isMockAdminPasswordAllowed(): boolean {
  // Explicit opt-in wins (e.g. an internal-test env where both a real API
  // URL and a mock-auth shortcut are desired). Must be set deliberately.
  if (process.env.ALLOW_MOCK_ADMIN_PASSWORD === "true") return true;
  // Real API is the source of truth — never bypass with mock password.
  if (isAdminApiConfigured(process.env.NEXT_PUBLIC_API_URL)) return false;
  if (process.env.NODE_ENV === "development") return true;
  if (process.env.NEXT_PUBLIC_FIREBASE_STATIC === "1") return true;
  return false;
}
