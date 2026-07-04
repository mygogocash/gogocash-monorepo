#!/usr/bin/env node
/**
 * Dev-only: inject staging JWT via deep link and open Wallet on a connected Android device.
 * Token is read from committed preflight evidence (staging e2e customer), not printed.
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const evidencePath = resolve(
  "evidence/staging/T-018-phase7-android16-fix/preflight-report.json",
);
const report = JSON.parse(readFileSync(evidencePath, "utf8"));
const injectStep = report.results?.find((step) => step.name === "GoGoCash auth token inject");
const tokenMatch = injectStep?.detail?.match(/token=([^&]+)/);

if (!tokenMatch?.[1]) {
  console.error("Could not extract staging auth token from preflight evidence.");
  process.exit(1);
}

const callbackUrl = process.argv[2] ?? "/wallet";
const params = new URLSearchParams({ token: tokenMatch[1], callbackUrl });
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
