/**
 * Deep links from Admin Panel → Customer App.
 *
 * Configure `NEXT_PUBLIC_APP_URL` to the Customer App base URL for the
 * current environment (ai-test: https://app-ai-test.gogocash.co,
 * staging: https://app-staging.gogocash.co). Defaults to localhost for dev.
 */

const APP_BASE = (
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
).replace(/\/$/, "");

export const appLinks = {
  home: (): string => APP_BASE,
  offer: (offerId: string | number): string => `${APP_BASE}/offer/${offerId}`,
  user: (userId: string): string => `${APP_BASE}/profile/${userId}`,
  login: (): string => `${APP_BASE}/login`,
} as const;

export const APP_BASE_URL = APP_BASE;
