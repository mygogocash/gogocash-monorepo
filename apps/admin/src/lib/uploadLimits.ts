/**
 * Shared admin upload size ceiling for browser preflight + BFF proxy.
 * Keep in sync with `experimental.proxyClientMaxBodySize` in next.config.ts (#487).
 */
export const MAX_ADMIN_UPLOAD_BYTES = 32 * 1024 * 1024;
