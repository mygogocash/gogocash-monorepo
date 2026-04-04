import { env } from "@/env";

const DEV_FALLBACK_SECRET = "dev-only-nextauth-secret-min-32-characters-required";

/**
 * `next build` sets NODE_ENV=production but often runs without a real secret (local/CI).
 * Runtime (`next start`, serverless) must still set NEXTAUTH_SECRET in real deployments.
 */
function shouldUseProductionBuildPlaceholder(): boolean {
  if (process.env.CI === "true") return true;
  if (process.env.SKIP_ENV_VALIDATION === "1") return true;
  if (process.env.npm_lifecycle_event === "build") return true;
  return false;
}

/**
 * NextAuth must not receive an empty secret (HKDF throws; the callback route can 500 with a
 * non-JSON body, and the client then fails on `response.json()`).
 */
export function getNextAuthSecret(): string {
  const fromValidated = env.NEXTAUTH_SECRET?.trim();
  if (fromValidated) return fromValidated;
  const fromProcess = process.env.NEXTAUTH_SECRET?.trim();
  if (fromProcess) return fromProcess;
  if (process.env.NODE_ENV !== "production") {
    process.stderr.write(
      "[next-auth] NEXTAUTH_SECRET is unset; using a dev-only default. Set NEXTAUTH_SECRET in .env.local.\n"
    );
    return DEV_FALLBACK_SECRET;
  }
  if (shouldUseProductionBuildPlaceholder()) {
    // Intentionally no stderr here: `next build` runs many worker processes; each would log once and
    // flood CI output. Set NEXTAUTH_SECRET for real production runtime.
    return DEV_FALLBACK_SECRET;
  }
  throw new Error("NEXTAUTH_SECRET is required. Set it in the server environment.");
}
