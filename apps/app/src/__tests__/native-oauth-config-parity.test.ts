import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const appRoot = resolve(__dirname, "../..");
const repoRoot = resolve(appRoot, "../..");

const readAppFile = (rel: string) =>
  readFileSync(resolve(appRoot, rel), "utf8");
const readRepoFile = (rel: string) =>
  readFileSync(resolve(repoRoot, rel), "utf8");

describe("native oauth config parity", () => {
  it(".env.example documents the native OAuth dormancy env", () => {
    const envExample = readAppFile(".env.example");
    expect(envExample).toContain("EXPO_PUBLIC_NATIVE_OAUTH_PROVIDERS=");
  });

  it("the hardened staging EAS workflow carries the social activation envs", () => {
    // `eas update` inlines EXPO_PUBLIC_* at export time and does NOT read
    // eas.json build-profile env — without these lines an OTA can never
    // activate native Google / Facebook / Apple sign-in.
    const workflow = readRepoFile(
      ".github/workflows/deploy-app-native-eas.yml",
    );
    expect(workflow).toContain("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID");
    expect(workflow).toContain("EXPO_PUBLIC_NATIVE_OAUTH_PROVIDERS");
    expect(workflow).toContain(
      "EXPO_PUBLIC_NATIVE_OAUTH_PROVIDERS: ${{ secrets.EXPO_PUBLIC_NATIVE_OAUTH_PROVIDERS }}",
    );
  });

  it("eas.json closedtest and preview builds carry the Google web client id", () => {
    // eas.json's schema REJECTS empty-string env values ("is not allowed to be
    // empty" — it broke the staging OTA publish), so the dormant
    // EXPO_PUBLIC_NATIVE_OAUTH_PROVIDERS flag must stay ABSENT here until it
    // gets a real value (dormancy = unset). Only non-empty envs live in
    // eas.json; pin both directions.
    const easJson = JSON.parse(readAppFile("eas.json")) as {
      build: Record<string, { env?: Record<string, string> }>;
    };
    for (const profile of ["closedtest", "preview"] as const) {
      const env = easJson.build[profile]?.env ?? {};
      expect(env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID).toBeTruthy();
      for (const value of Object.values(env)) {
        expect(value).not.toBe("");
      }
    }
  });

  it("OTA-safety guard: the native Facebook/Apple flow must not add native modules", () => {
    // The whole point of the RNFB hosted-OAuth design is that it rides the
    // native code already shipped in runtime 0.3.0 binaries (vc44+). Adding
    // any of these packages would silently require a new store build.
    const pkg = JSON.parse(readAppFile("package.json")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const banned of [
      "expo-auth-session",
      "expo-web-browser",
      "expo-crypto",
      "react-native-fbsdk-next",
    ]) {
      expect(allDeps[banned]).toBeUndefined();
    }
  });
});
