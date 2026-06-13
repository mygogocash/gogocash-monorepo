#!/usr/bin/env node
/**
 * Deletes a stuck App Hosting build by ID so `firebase deploy` can allocate the next ID.
 *
 * Fixes HTTP 409 "unable to queue the operation" when createBuild reuses an existing buildId
 * (e.g. build-2026-04-04-006) that still exists server-side but blocks the queue.
 *
 * Auth (first match wins):
 *   1. GOOGLE_OAUTH_ACCESS_TOKEN
 *   2. `gcloud auth print-access-token` (user login: gcloud auth login)
 *   3. Application Default Credentials (gcloud auth application-default login)
 *   4. GOOGLE_APPLICATION_CREDENTIALS (service account JSON)
 *
 * Usage:
 *   node scripts/apphosting-delete-build.mjs <buildId>
 *
 * The buildId is the exact value from the deploy error URL (e.g. build-2026-04-04-006).
 * Or: APP_HOSTING_BUILD_ID=build-... node scripts/apphosting-delete-build.mjs
 *
 * Example:
 *   node scripts/apphosting-delete-build.mjs build-2026-04-04-006
 */
import { GoogleAuth } from "google-auth-library";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function readFirebasercDefaultProject(fallback) {
  try {
    const rc = JSON.parse(readFileSync(join(root, ".firebaserc"), "utf8"));
    return rc.projects?.default || fallback;
  } catch {
    return fallback;
  }
}

const projectId =
  process.env.FIREBASE_APP_HOSTING_PROJECT || readFirebasercDefaultProject("gogocash-app-staging");
const location = process.env.FIREBASE_APP_HOSTING_LOCATION || "us-central1";
const backendId = process.env.FIREBASE_APP_HOSTING_BACKEND || "gogocash-web";

const buildId = process.argv[2] || process.env.APP_HOSTING_BUILD_ID;
if (!buildId?.trim()) {
  console.error(
    "Missing buildId. Copy it from the failed deploy error (…/builds?buildId=…).\n" +
      "  npm run apphosting:delete-stale-build -- build-YYYY-MM-DD-NNN\n" +
      "  APP_HOSTING_BUILD_ID=build-... npm run apphosting:delete-stale-build"
  );
  process.exit(1);
}

const name = `projects/${projectId}/locations/${location}/backends/${backendId}/builds/${buildId.trim()}`;
const url = `https://firebaseapphosting.googleapis.com/v1beta/${name}`;

async function getAccessToken() {
  const fromEnv = process.env.GOOGLE_OAUTH_ACCESS_TOKEN?.trim();
  if (fromEnv) {
    return { token: fromEnv, source: "GOOGLE_OAUTH_ACCESS_TOKEN" };
  }

  const g = spawnSync("gcloud", ["auth", "print-access-token"], {
    encoding: "utf8",
    shell: false,
  });
  if (g.status === 0 && g.stdout?.trim()) {
    return { token: g.stdout.trim(), source: "gcloud auth print-access-token" };
  }

  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  if (token.token) {
    return { token: token.token, source: "Application Default Credentials" };
  }

  return { token: null, source: null };
}

const { token, source } = await getAccessToken();
if (!token) {
  console.error(
    "Could not obtain an access token. Try one of:\n" +
      "  gcloud auth login && gcloud auth print-access-token\n" +
      "  gcloud auth application-default login\n" +
      "  export GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json\n" +
      "  export GOOGLE_OAUTH_ACCESS_TOKEN=..."
  );
  process.exit(1);
}

console.log(`DELETE ${name} (auth: ${source})`);

const res = await fetch(url, {
  method: "DELETE",
  headers: { Authorization: `Bearer ${token}` },
});

const text = await res.text();
if (res.status === 404) {
  console.log("Build not found (404) — may already be gone. Try: npm run deploy:firebase");
  process.exit(0);
}
if (!res.ok) {
  console.error(`HTTP ${res.status}: ${text}`);
  process.exit(1);
}

console.log("OK — build delete accepted (long-running operation). Response:", text.slice(0, 500));
console.log("You can run: npm run deploy:firebase");
