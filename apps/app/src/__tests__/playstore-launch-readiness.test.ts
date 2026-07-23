import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");
const repoRoot = path.resolve(mobileRoot, "../..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), "utf8");
}

// Google Play launch prep 2026-07-11 — pins from the 4-dimension readiness
// audit so the store-build contract can't silently regress.
describe("Play Store launch readiness", () => {
  const easJson = JSON.parse(read("eas.json"));
  const appConfig = read("app.config.js");

  it("production profile > given a store build > then live backend data and no Sentry upload attempt", () => {
    const prod = easJson.build.production.env;
    // Launch decision: production users see live account data (staging parity).
    expect(prod.EXPO_PUBLIC_ACCOUNT_DATA_SOURCE).toBe("backend");
    // No Sentry upload creds exist yet — a production build must not fail on
    // source-map upload. Remove once SENTRY_AUTH_TOKEN lives in EAS secrets.
    expect(prod.SENTRY_DISABLE_AUTO_UPLOAD).toBe("true");
    expect(prod.EXPO_PUBLIC_API_URL).toBe("https://api.gogocash.co");
  });

  it("closedtest profile > given the 14-day closed-test clock > then it builds a store AAB on staging config", () => {
    // Personal Play accounts must run a 12-tester/14-day closed test before
    // production. This profile lets the clock start before the production
    // Firebase project exists: store-uploadable AAB, coherent staging config.
    const ct = easJson.build.closedtest;
    expect(ct.channel).toBe("staging");
    expect(ct.distribution).toBeUndefined(); // AAB, not internal APK
    expect(ct.env.EXPO_PUBLIC_API_URL).toBe("https://api-staging.gogocash.co");
    expect(ct.env.EXPO_PUBLIC_APP_ENV).toBe("staging");
    expect(ct.env.EXPO_PUBLIC_ACCOUNT_DATA_SOURCE).toBe("backend");
    expect(ct.env.SENTRY_DISABLE_AUTO_UPLOAD).toBe("true");
    // The closed-test build is store-distributed, so it must ship the SAME
    // permission surface as production — GoGoTrack (PACKAGE_USAGE_STATS +
    // foreground-service) gated OFF. Otherwise the closed-test review hits
    // the usage-access rejection risk and testers exercise a flow production
    // won't have. GoGoTrack dogfooding → a separate internal-testing build.
    expect(ct.env.EXPO_PUBLIC_ENABLE_GOTOTRACK).toBe("0");
  });

  it("beta profile > given the Railway beta rollout > then it builds a store AAB on the beta channel against api-beta", () => {
    // Railway beta (2026-07): store-distributed build so existing users can
    // exercise the new stack at beta.gogocash.co before the canonical
    // app/api.gogocash.co cutover. Same store-safe surface as closedtest
    // (GoGoTrack OFF, no Sentry upload); its own OTA channel so beta JS
    // updates never reach staging-channel testers. APP_ENV stays "staging"
    // while the beta stack runs staging-grade creds — flips to "production"
    // together with the real-credential swap.
    const beta = easJson.build.beta;
    expect(beta.channel).toBe("beta");
    expect(beta.distribution).toBeUndefined(); // AAB, store-uploadable
    expect(beta.autoIncrement).toBe(true);
    expect(beta.env.EXPO_PUBLIC_API_URL).toBe("https://api-beta.gogocash.co");
    expect(beta.env.EXPO_PUBLIC_FRONTEND_URL).toBe("https://beta.gogocash.co");
    expect(beta.env.EXPO_PUBLIC_APP_ENV).toBe("staging");
    expect(beta.env.EXPO_PUBLIC_ACCOUNT_DATA_SOURCE).toBe("backend");
    expect(beta.env.SENTRY_DISABLE_AUTO_UPLOAD).toBe("true");
    expect(beta.env.EXPO_PUBLIC_ENABLE_GOTOTRACK).toBe("0");
    // GoGoPass (membership/subscription) is hidden for the beta rollout. The
    // flag is default-ON and ONLY the literal "0" hides (see
    // src/config/featureFlags.ts) — so no other profile may pin it: unset env
    // keeps today's behavior everywhere else.
    expect(beta.env.EXPO_PUBLIC_ENABLE_GOGOPASS).toBe("0");
    // Distribution rides the existing closed-testing track until cutover.
    expect(easJson.submit.beta.android.track).toBe("GoGoCash Alpha");
  });

  it("android app links > given app.gogocash.co URLs > then autoVerify intent filters exist", () => {
    expect(appConfig).toContain("intentFilters");
    expect(appConfig).toContain("autoVerify: true");
    expect(appConfig).toMatch(/host: "app\.gogocash\.co"/);
  });

  it("assetlinks > given App Links verification > then the web export serves a statement for co.gogocash.app", () => {
    const assetlinks = JSON.parse(read("public/.well-known/assetlinks.json"));
    expect(assetlinks[0].relation).toContain(
      "delegate_permission/common.handle_all_urls",
    );
    expect(assetlinks[0].target.package_name).toBe("co.gogocash.app");
    expect(Array.isArray(assetlinks[0].target.sha256_cert_fingerprints)).toBe(
      true,
    );
  });

  it("gototrack usage-access > given a store build > then the plugin actively strips the module-manifest permissions", () => {
    // PACKAGE_USAGE_STATS is a Play review landmine, and (field bug
    // 2026-07-11) the gototrack-detector LOCAL MODULE's library manifest
    // merges FOREGROUND_SERVICE(_SPECIAL_USE) at Gradle time even when the
    // plugin is skipped — vc42's compiled manifest proved it. The plugin now
    // ALWAYS runs: additive when enabled, tools:node="remove" when disabled.
    expect(appConfig).toContain("EXPO_PUBLIC_ENABLE_GOTOTRACK");
    expect(appConfig).toMatch(
      /\["\.\/plugins\/withGototrackUsageAccess", \{ enabled: enableGototrack \}\]/,
    );
    const plugin = read("plugins/withGototrackUsageAccess.js");
    expect(plugin).toContain("applyGototrackStripManifest");
    expect(plugin).toContain('"tools:node": "remove"');
    expect(plugin).toContain("GototrackMonitorService");
  });

  it("target sdk > given Play's 35+ requirement > then the target is pinned explicitly", () => {
    expect(appConfig).toMatch(/targetSdkVersion: 36/);
    expect(appConfig).toMatch(/compileSdkVersion: 36/);
  });

  it("staging EAS workflow > given a dispatch > then it cannot target production or submit", () => {
    const workflow = fs.readFileSync(
      path.join(repoRoot, ".github/workflows/deploy-app-native-eas.yml"),
      "utf8",
    );
    expect(workflow).toContain("environment: staging");
    expect(workflow).toContain("EAS_PROFILE: preview");
    expect(workflow).toContain("EAS_CHANNEL: staging");
    expect(workflow).toContain("ANDROID_ARTIFACT_EXT: apk");
    expect(workflow).not.toMatch(/^      (?:profile|channel):/m);
    expect(workflow).not.toMatch(/^\s*- submit\s*$/m);
    expect(workflow).not.toContain("https://api.gogocash.co");
  });

  it("launch runbook > given the console checklist > then docs/PLAYSTORE_LAUNCH.md exists", () => {
    const doc = fs.readFileSync(
      path.join(repoRoot, "docs/PLAYSTORE_LAUNCH.md"),
      "utf8",
    );
    expect(doc).toContain("Data safety");
    expect(doc).toContain("account deletion");
    expect(doc).toContain("google-services");
  });
});
