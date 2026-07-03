import type { AccountDataSource } from "@mobile/auth/routeGuard";
import type { MobileSession } from "@mobile/auth/session";

/** Fixtures-only demo token — must never authorize backend API calls. */
export const DEMO_MOBILE_SESSION_TOKEN = "demo-session";

export function hasUsableMobileSessionToken(
  session: MobileSession | null | undefined,
  accountDataSource: AccountDataSource,
): boolean {
  const token = session?.access_token;

  if (typeof token !== "string" || token.length === 0) {
    return false;
  }

  if (accountDataSource === "backend" && token === DEMO_MOBILE_SESSION_TOKEN) {
    return false;
  }

  return true;
}
