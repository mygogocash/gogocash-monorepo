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
 */
export function shouldRedirectToSignInOn401(options: {
  status: number | undefined;
  realApi: boolean;
  isBrowser: boolean;
  pathname: string;
}): boolean {
  return (
    options.realApi &&
    options.isBrowser &&
    options.status === 401 &&
    !options.pathname.startsWith(SIGN_IN_PATH)
  );
}
