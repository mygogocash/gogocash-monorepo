import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("native Google Sign-In config > app.config.js + .env.example", () => {
  const appConfigSource = readFileSync(resolve(__dirname, "../../app.config.js"), "utf8");
  const envExampleSource = readFileSync(resolve(__dirname, "../../.env.example"), "utf8");
  const packageJson = JSON.parse(
    readFileSync(resolve(__dirname, "../../package.json"), "utf8")
  ) as { dependencies?: Record<string, string> };

  it("depends on @react-native-google-signin/google-signin", () => {
    expect(packageJson.dependencies?.["@react-native-google-signin/google-signin"]).toBeTruthy();
  });

  it("bumps app version to 0.3.0 for the native Google Sign-In module", () => {
    expect(appConfigSource).toContain('version: "0.3.0"');
  });

  it("always registers the Google Sign-In config plugin", () => {
    expect(appConfigSource).toContain("@react-native-google-signin/google-signin");
  });

  it("wires iosUrlScheme from the iOS client id when set", () => {
    expect(appConfigSource).toContain("iosUrlScheme");
    expect(appConfigSource).toContain("EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID");
  });

  it("exposes Google client ids on expo extra", () => {
    expect(appConfigSource).toContain("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID");
    expect(appConfigSource).toMatch(/googleWebClientId|GOOGLE_WEB_CLIENT_ID/);
  });

  it("documents empty Google client id env vars in .env.example", () => {
    expect(envExampleSource).toContain("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=");
    expect(envExampleSource).toContain("EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=");
  });
});
