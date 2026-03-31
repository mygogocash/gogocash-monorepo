import { env } from "@/env";

const DEV_FALLBACK_SECRET = "dev-only-nextauth-secret-min-32-characters-required";

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
  throw new Error("NEXTAUTH_SECRET is required. Set it in the server environment.");
}
