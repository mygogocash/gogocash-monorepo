#!/usr/bin/env node
/**
 * Local deploy to Firebase Hosting (gogocash-staging).
 * Requires: NEXTAUTH_SECRET, NEXTAUTH_URL in the environment.
 * Prereq: firebase login (or GOOGLE_APPLICATION_CREDENTIALS for CI-style auth).
 *
 * Usage:
 *   export NEXTAUTH_SECRET="…"
 *   export NEXTAUTH_URL="https://gogocash-staging-637d5.web.app"
 *   node scripts/deploy-firebase-staging.mjs
 *
 * Or: npm run deploy:firebase:staging
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);

const required = ["NEXTAUTH_SECRET", "NEXTAUTH_URL"];
for (const key of required) {
  const v = process.env[key];
  if (typeof v !== "string" || !v.trim()) {
    console.error(
      `[deploy-firebase-staging] Missing ${key}. Set it before running (see docs/FIREBASE_STAGING_INTERNAL_REVIEW.md).`,
    );
    process.exit(1);
  }
}

if (!existsSync(path.join(root, "firebase.json"))) {
  console.error("[deploy-firebase-staging] firebase.json not found.");
  process.exit(1);
}

console.log("[deploy-firebase-staging] Building static export (BUILD_FOR_FIREBASE=1)…");
execSync("npm run build:firebase", {
  stdio: "inherit",
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
});

console.log("[deploy-firebase-staging] Deploying to Firebase (gogocash-staging)…");
execSync("npx firebase deploy --only hosting --project gogocash-staging --non-interactive", {
  stdio: "inherit",
  env: process.env,
});

console.log("[deploy-firebase-staging] Done.");
