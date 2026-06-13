#!/usr/bin/env node
/**
 * Pre-flight checks before `firebase deploy --only apphosting:gogocash-web`.
 * Does not set secrets or console env — those stay in Firebase / Secret Manager.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function readJson(rel) {
  return JSON.parse(readFileSync(join(root, rel), "utf8"));
}

function run(label, cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    encoding: "utf8",
    shell: false,
    ...opts,
  });
  if (r.status !== 0) {
    console.error(`\n[firebase-deploy-preflight] ${label} failed (exit ${r.status}).`);
    if (r.stderr) console.error(r.stderr.trim());
    process.exit(1);
  }
  return (r.stdout || "").trim();
}

const ver = run("firebase --version", "npx", ["firebase", "--version"]);
console.log(`Firebase CLI: ${ver}`);

const useOut = run("firebase use", "npx", ["firebase", "use"]);
console.log(useOut || "(active Firebase project printed above if configured)");

try {
  const rc = readJson(".firebaserc");
  const def = rc.projects?.default;
  if (def) {
    console.log(`\n.firebaserc default project: ${def}`);
    if (def !== "gogocash-app-staging") {
      console.warn(
        "\n[firebase-deploy-preflight] Warning: default project is not gogocash-app-staging. Run: firebase use gogocash-app-staging",
      );
    }
  }
} catch {
  console.warn("\n[firebase-deploy-preflight] Could not read .firebaserc.");
}

console.log(`
Manual checklist (Firebase Console / CLI — not automated here):
  - Blaze billing on the GCP project
  - App Hosting backend id matches firebase.json (gogocash-web)
  - Secret: npx firebase apphosting:secrets:set NEXTAUTH_SECRET  (then reference in apphosting.yaml or console)
  - Console env: NEXT_PUBLIC_FIREBASE_API_KEY, AUTH_DOMAIN, PROJECT_ID, APP_ID (BUILD + RUNTIME)
  - Auth → Authorized domains for your hosted / custom URL
  - OAuth redirect URLs match NEXTAUTH_URL / canonical site URL

Template keys for console paste: firebase-console.staging.env.example
`);
