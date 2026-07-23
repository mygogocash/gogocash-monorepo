import { normalizeAdminApiUrl } from "@/lib/adminApiMode";

/**
 * Railway/private-network BFF upstream safety for #407.
 *
 * Admin browser traffic goes through same-origin `/api/backend/*`. That route
 * must call Nest on the private Railway service hostname. Pointing server-side
 * `API_URL` at a public edge host (`*.up.railway.app` or `api*.gogocash.co`)
 * recreates the residual Policy Save failure mode after Atlas integrity is ready.
 */

export type AdminUpstreamIssueCode =
  | "ADMIN_UPSTREAM_MISSING"
  | "ADMIN_UPSTREAM_UNSAFE_PUBLIC";

export type AdminUpstreamResolution =
  | { ok: true; url: string }
  | { ok: false; code: AdminUpstreamIssueCode; reason: string };

/** True when the process is running on Railway (any environment). */
export function isRailwayRuntime(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return Boolean(
    env.RAILWAY_ENVIRONMENT?.trim() ||
      env.RAILWAY_SERVICE_NAME?.trim() ||
      env.RAILWAY_PROJECT_ID?.trim(),
  );
}

/**
 * Hostnames that must never be used as the server-side BFF upstream (`API_URL`).
 * Localhost and `*.railway.internal` are always allowed.
 */
export function isUnsafePublicAdminUpstream(url: string): boolean {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }

  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".railway.internal")
  ) {
    return false;
  }

  // Public Railway TCP/HTTP proxy hosts (residual #407 hairpin).
  if (hostname.endsWith(".up.railway.app") || hostname.endsWith(".railway.app")) {
    return true;
  }

  // Public GoGoCash API custom domains — browser/BFF mode signal only.
  if (/^api(-staging|-beta|-dev)?\.gogocash\.co$/.test(hostname)) {
    return true;
  }

  return false;
}

/**
 * Resolve the Nest upstream for `/api/backend/*`.
 *
 * - Railway: `API_URL` is required and must be private-safe.
 * - Local/dev: `API_URL` preferred, else `NEXT_PUBLIC_API_URL` (public OK).
 * - Explicitly unsafe `API_URL` is always rejected (even locally).
 */
export function resolveAdminUpstream(
  env: NodeJS.ProcessEnv = process.env,
): AdminUpstreamResolution {
  const privateUrl = normalizeAdminApiUrl(env.API_URL);
  const publicUrl = normalizeAdminApiUrl(env.NEXT_PUBLIC_API_URL);
  const railway = isRailwayRuntime(env);

  if (privateUrl) {
    if (isUnsafePublicAdminUpstream(privateUrl)) {
      return {
        ok: false,
        code: "ADMIN_UPSTREAM_UNSAFE_PUBLIC",
        reason:
          "API_URL points at a public edge host. Use http://gogocash-api.railway.internal:8080 on Railway (see docs/railway-env-matrix.md).",
      };
    }
    return { ok: true, url: privateUrl };
  }

  if (railway) {
    return {
      ok: false,
      code: "ADMIN_UPSTREAM_MISSING",
      reason:
        "API_URL is required on Railway for the admin BFF. Set API_URL=http://gogocash-api.railway.internal:8080 (do not fall back to NEXT_PUBLIC_API_URL).",
    };
  }

  if (publicUrl) {
    return { ok: true, url: publicUrl };
  }

  return {
    ok: false,
    code: "ADMIN_UPSTREAM_MISSING",
    reason: "Neither API_URL nor NEXT_PUBLIC_API_URL is configured.",
  };
}
