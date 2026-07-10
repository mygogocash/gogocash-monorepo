#!/usr/bin/env node
/**
 * Dev-only: inject staging JWT via deep link and open Wallet on a connected Android device.
 *
 * Token resolution order:
 * 1. `--auth-token <jwt>`
 * 2. `GOGOTRACK_AUTH_TOKEN` / `GOGOSENSE_AUTH_TOKEN`
 *
 * The legacy third fallback (committed preflight evidence report token) was removed on
 * purpose: that token is expired, so an unset env silently injected a stale JWT — the
 * `adb am start` reported success while the wallet stayed logged out (a false pass; see
 * docs/android-bug-hunt-audit-2026-07-09.md, finding inject-wallet-silent-stale-token).
 * A missing token now fails fast instead.
 */
import { homedir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

/**
 * @param {readonly string[]} argv
 * @returns {{ authToken: string | null, callbackUrl: string }}
 */
export function parseInjectArgs(argv) {
  let authToken = null;
  let callbackUrl = "/wallet";

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--auth-token") {
      authToken = argv[index + 1]?.trim() || null;
      index += 1;
      continue;
    }

    if (!arg.startsWith("--")) {
      callbackUrl = arg;
    }
  }

  return { authToken, callbackUrl };
}

/**
 * @param {{ cliToken?: string | null, env?: Record<string, string | undefined> }} [options]
 * @returns {string | null}
 */
export function resolveInjectAuthToken({ cliToken = null, env = process.env } = {}) {
  const candidates = [cliToken, env.GOGOTRACK_AUTH_TOKEN, env.GOGOSENSE_AUTH_TOKEN];
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return null;
}

function main() {
  const { authToken: cliToken, callbackUrl } = parseInjectArgs(process.argv.slice(2));
  const authToken = resolveInjectAuthToken({ cliToken });

  if (!authToken) {
    console.error("No staging auth token. Set GOGOTRACK_AUTH_TOKEN or pass --auth-token <jwt>.");
    process.exit(1);
  }

  const params = new URLSearchParams({ token: authToken, callbackUrl });
  const targetUrl = `gogocash://auth/callback?${params.toString()}`;
  const adb =
    process.env.ADB ?? resolve(homedir(), "Library/Android/sdk/platform-tools/adb");

  const result = spawnSync(
    adb,
    [
      "shell",
      `am start -a android.intent.action.VIEW -d '${targetUrl.replaceAll("'", "'\\''")}' co.gogocash.app`,
    ],
    { encoding: "utf8" },
  );

  if (result.status !== 0) {
    console.error(result.stderr || result.stdout || "adb auth inject failed");
    process.exit(result.status ?? 1);
  }

  console.log(`Opened auth callback → ${callbackUrl} on co.gogocash.app`);
}

// Only run the side-effectful CLI when executed directly — importing this module
// (e.g. from the vitest suite) must never shell out to adb.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
