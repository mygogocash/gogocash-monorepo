/**
 * Fallback JWT string when NextAuth session has no `accessToken` (local mock / static export).
 * Keep in sync with mock login responses in `src/lib/mockApiCore.ts` and NextAuth callbacks.
 */
export const DEFAULT_MOCK_ACCESS_TOKEN = "mock-jwt-token-for-development";
