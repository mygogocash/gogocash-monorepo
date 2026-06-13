import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectId = process.env.FIREBASE_PROJECT_ID ?? "landing-page-4ae23";
// Anchor app-relative paths to this script's location, not process.cwd(), so
// the script works whether invoked from the app dir or the monorepo root.
const appDir = fileURLToPath(new URL("..", import.meta.url));
const firebaseJsonPath = join(appDir, "firebase.json");

/**
 * Resolve a runnable Firebase CLI invocation. Under npm workspace hoisting,
 * firebase-tools may live at the monorepo root node_modules or co-located in
 * the app — so resolve it via Node's module resolution (which walks up the
 * tree) instead of a hardcoded relative path. Fall back to `npx firebase`.
 *
 * @returns {{ command: string, prefixArgs: string[] }}
 */
function resolveFirebaseCli() {
  const require = createRequire(import.meta.url);
  try {
    // package.json "bin": { "firebase": "lib/bin/firebase.js" }
    const pkgJsonPath = require.resolve("firebase-tools/package.json");
    const pkgDir = dirname(pkgJsonPath);
    const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf8"));
    const binEntry =
      typeof pkg.bin === "string" ? pkg.bin : pkg.bin?.firebase ?? "lib/bin/firebase.js";
    const binPath = join(pkgDir, binEntry);
    if (existsSync(binPath)) {
      return { command: process.execPath, prefixArgs: [binPath] };
    }
  } catch {
    // firebase-tools not resolvable from here; fall through to npx.
  }
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  return { command: npx, prefixArgs: ["--yes", "firebase"] };
}

const firebaseCli = resolveFirebaseCli();
const baseConfig = JSON.parse(readFileSync(firebaseJsonPath, "utf8"));

if (!baseConfig.hosting || Array.isArray(baseConfig.hosting)) {
  throw new Error("firebase.json must define a single hosting config object");
}

const cliSites = process.argv.slice(2);
const envSites = (process.env.FIREBASE_HOSTING_SITES ?? "")
  .split(",")
  .map((site) => site.trim())
  .filter(Boolean);
const configuredSite = baseConfig.hosting.site;
const targetSites =
  cliSites.length > 0
    ? cliSites
    : envSites.length > 0
      ? envSites
      : configuredSite
        ? [configuredSite]
        : [];

if (targetSites.length === 0) {
  throw new Error(
    "No Firebase Hosting site was provided. Set hosting.site in firebase.json, FIREBASE_HOSTING_SITES, or pass sites as CLI arguments.",
  );
}

const configDir = mkdtempSync(join(tmpdir(), "firebase-hosting-"));

for (const site of targetSites) {
  const siteConfig = structuredClone(baseConfig);
  // Resolve the static output dir (out/) relative to the app dir so deploy
  // works regardless of cwd (app dir or monorepo root).
  siteConfig.hosting.public = resolve(appDir, siteConfig.hosting.public);
  siteConfig.hosting.site = site;

  const siteConfigPath = join(configDir, `${site}.firebase.json`);
  writeFileSync(siteConfigPath, JSON.stringify(siteConfig));

  console.log(`Deploying Firebase Hosting site: ${site}`);

  const result = spawnSync(
    firebaseCli.command,
    [
      ...firebaseCli.prefixArgs,
      "deploy",
      "--project",
      projectId,
      "--config",
      siteConfigPath,
      "--only",
      "hosting",
      "--non-interactive",
    ],
    {
      env: process.env,
      stdio: "inherit",
      // npx fallback (a .cmd shim on Windows) needs shell resolution.
      shell: firebaseCli.command !== process.execPath,
    },
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
