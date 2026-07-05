#!/usr/bin/env node
/**
 * Dev-only: inject staging JWT via deep link and open Wallet on a connected Android device.
 *
 * Token resolution order:
 * 1. `--auth-token <jwt>`
 * 2. `GOGOTRACK_AUTH_TOKEN` / `GOGOSENSE_AUTH_TOKEN`
 * 3. committed preflight evidence (legacy fallback)
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const evidencePath = resolve(
  "evidence/staging/T-018-phase7-android16-fix/preflight-report.json",
);

function readTokenFromEvidence() {
  const report = JSON.parse(readFileSync(evidencePath, "utf8"));
  const injectStep = report.results?.find((step) => step.name === "GoGoCash auth token inject");
  const tokenMatch = injectStep?.detail?.match(/token=([^&]+)/);
  return tokenMatch?.[1]?.trim() ?? null;
}

function parseArgs(argv) {
  let authToken = null;
  let callbackUrl = "/wallet";

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--auth-token") {
      authToken = argv[index + 1]?.trim() ?? null;
      index += 1;
      continue;
    }

    if (!arg.startsWith("--")) {
      callbackUrl = arg;
    }
  }

  return { authToken, callbackUrl };
}

const { authToken: cliToken, callbackUrl } = parseArgs(process.argv.slice(2));
const authToken =
  cliToken ||
  process.env.GOGOTRACK_AUTH_TOKEN?.trim() ||
  process.env.GOGOSENSE_AUTH_TOKEN?.trim() ||
  readTokenFromEvidence();

if (!authToken) {
  console.error(
    "No staging auth token. Set GOGOTRACK_AUTH_TOKEN, pass --auth-token, or refresh preflight evidence.",
  );
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
