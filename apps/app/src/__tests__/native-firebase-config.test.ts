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

  it("given no google services file exists > then omits the field and plugin so prebuild still works", () => {
    // No env and no committed apps/app/google-services.json (owner supplies it).
    const config = loadConfig()({ config: {} });

    expect(config.android.googleServicesFile).toBeUndefined();
    expect(config.plugins).not.toContain("@react-native-firebase/app");
  });
});
