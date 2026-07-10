import { createRequire } from "node:module";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const requireCjs = createRequire(import.meta.url);
const configPath = resolve(__dirname, "../../app.config.js");

function loadConfig(): (ctx: { config: Record<string, unknown> }) => {
  version: string;
  android: { googleServicesFile?: string };
  ios: { googleServicesFile?: string };
  plugins: unknown[];
} {
  delete requireCjs.cache[requireCjs.resolve(configPath)];
  return requireCjs(configPath);
}

describe("native firebase config > app.config.js", () => {
  afterEach(() => {
    delete process.env.GOOGLE_SERVICES_JSON;
    delete process.env.GOOGLE_SERVICE_INFO_PLIST;
  });

  it("bumps the app version so the RNFB native module gets its own OTA runtime", () => {
    const config = loadConfig()({ config: {} });
    // APK 39 (0.1.0) has no RNFB native module — this JS must never OTA onto it.
    expect(config.version).toBe("0.2.0");
  });

  it("given GOOGLE_SERVICES_JSON is set (EAS file secret) > then wires the android googleServicesFile and the RNFB plugin", () => {
    process.env.GOOGLE_SERVICES_JSON = "/tmp/eas-secrets/google-services.json";
    const config = loadConfig()({ config: {} });

    expect(config.android.googleServicesFile).toBe("/tmp/eas-secrets/google-services.json");
    expect(config.plugins).toContain("@react-native-firebase/app");
  });

  it("given the committed google-services.json > then wires the local file and the RNFB plugin", () => {
    // apps/app/google-services.json is committed (generated 2026-07-10 via
    // `firebase apps:sdkconfig` for co.gogocash.app in gogocash-staging), so
    // the default state is native-Firebase-enabled. The config still degrades
    // gracefully if the file is removed — the env-override test above pins the
    // precedence, and the omission branch stays in app.config.js as a guard.
    const config = loadConfig()({ config: {} });

    expect(config.android.googleServicesFile).toBe("./google-services.json");
    // The RNFB plugin runs BOTH platform mods when enabled — its iOS mod hard-
    // fails prebuild without a plist (CodeQL swift run on PR #192), so the iOS
    // file must ship alongside the android one.
    expect(config.ios.googleServicesFile).toBe("./GoogleService-Info.plist");
    expect(config.plugins).toContain("@react-native-firebase/app");
  });

  it("always builds iOS with static frameworks — the RNFB pods install via autolinking regardless", () => {
    // pod install fails outright without this: FirebaseAuth's ObjC deps
    // (GoogleUtilities et al.) define no modules, so Swift pods cannot
    // integrate as static libraries (CodeQL swift run 29081966292). The
    // firebase-ios-sdk requirement on Expo is useFrameworks: "static", and it
    // must be UNCONDITIONAL because autolinking pulls the pods from
    // package.json even when the @react-native-firebase/app plugin is omitted.
    const config = loadConfig()({ config: {} });

    expect(config.plugins).toContainEqual([
      "expo-build-properties",
      { ios: { useFrameworks: "static" } },
    ]);
  });
});
