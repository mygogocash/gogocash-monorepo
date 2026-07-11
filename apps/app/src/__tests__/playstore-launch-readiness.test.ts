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

  it("android app links > given app.gogocash.co URLs > then autoVerify intent filters exist", () => {
    expect(appConfig).toContain("intentFilters");
    expect(appConfig).toContain("autoVerify: true");
    expect(appConfig).toMatch(/host: "app\.gogocash\.co"/);
  });

  it("assetlinks > given App Links verification > then the web export serves a statement for co.gogocash.app", () => {
    const assetlinks = JSON.parse(read("public/.well-known/assetlinks.json"));
    expect(assetlinks[0].relation).toContain("delegate_permission/common.handle_all_urls");
    expect(assetlinks[0].target.package_name).toBe("co.gogocash.app");
    expect(Array.isArray(assetlinks[0].target.sha256_cert_fingerprints)).toBe(true);
  });

  it("gototrack usage-access > given a production store build > then the restricted permission is gated out", () => {
    // PACKAGE_USAGE_STATS is a Play review landmine (restricted permission,
    // declaration form + rejection risk). First store release ships without
    // it; EXPO_PUBLIC_ENABLE_GOTOTRACK=1 re-enables for internal builds.
    expect(appConfig).toContain("EXPO_PUBLIC_ENABLE_GOTOTRACK");
    expect(appConfig).not.toMatch(/^\s*"\.\/plugins\/withGototrackUsageAccess",\s*$/m);
    expect(appConfig).toMatch(/enableGototrack \? \["\.\/plugins\/withGototrackUsageAccess"\] : \[\]/);
  });

  it("target sdk > given Play's 35+ requirement > then the target is pinned explicitly", () => {
    expect(appConfig).toMatch(/targetSdkVersion: 36/);
    expect(appConfig).toMatch(/compileSdkVersion: 36/);
  });

  it("eas workflow > given a production dispatch > then env follows the profile and channel is a choice", () => {
    const workflow = fs.readFileSync(
      path.join(repoRoot, ".github/workflows/deploy-app-native-eas.yml"),
      "utf8",
    );
    expect(workflow).toContain(
      "environment: ${{ inputs.profile == 'production' && 'production' || 'staging' }}",
    );
    // channel is a dropdown, not free text — no typo'd OTA channels.
    expect(workflow).toMatch(/channel:[\s\S]{0,220}type: choice/);
    // production artifacts are AABs, not mislabeled APKs.
    expect(workflow).toContain("ANDROID_ARTIFACT_EXT");
  });

  it("launch runbook > given the console checklist > then docs/PLAYSTORE_LAUNCH.md exists", () => {
    const doc = fs.readFileSync(path.join(repoRoot, "docs/PLAYSTORE_LAUNCH.md"), "utf8");
    expect(doc).toContain("Data safety");
    expect(doc).toContain("account deletion");
    expect(doc).toContain("google-services");
  });
});
