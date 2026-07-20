export const SIGN_IN_PATH = "/signin";

/**
 * Real-API mode only: a 401 through the BFF means the NextAuth session (or its
 * embedded Nest JWT) is gone, so the browser should be sent back to sign-in.
 * Never redirect in mock mode (mock login legitimately 401s bad credentials),
 * outside the browser, or when already on the sign-in page (reload loop).
 *
 * Shared by BOTH HTTP layers (lib/axios/client.ts and lib/api.ts) so an
 * expired session recovers identically everywhere. Lives in its own module
 * because lib/api.ts must not import lib/axios/client.ts (that module creates
 * an axios instance at load, which the api test harness's axios mock cannot
 * satisfy).
 *
 * Some Nest admin/user lookups historically threw `UnauthorizedException` with
 * message "User not found" for a missing resource (not a bad session). Treat
 * those as non-auth failures so the admin UI does not bounce to `/signin`.
 */
export function isResourceNotFoundUnauthorized(
  data: unknown,
): boolean {
  if (!data || typeof data !== "object") return false;
  const message = (data as { message?: unknown }).message;
  if (typeof message === "string") {
    return /user not found/i.test(message.trim());
  }
  if (Array.isArray(message)) {
    return message.some(
      (m) => typeof m === "string" && /user not found/i.test(m.trim()),
    );
  }
  return false;
}

export function shouldRedirectToSignInOn401(options: {
  status: number | undefined;
  realApi: boolean;
  isBrowser: boolean;
  pathname: string;
  /** Optional response body — used to ignore resource-not-found 401s. */
  data?: unknown;
}): boolean {
  return (
    options.realApi &&
    options.isBrowser &&
    options.status === 401 &&
    !options.pathname.startsWith(SIGN_IN_PATH) &&
    !isResourceNotFoundUnauthorized(options.data)
  );
}
