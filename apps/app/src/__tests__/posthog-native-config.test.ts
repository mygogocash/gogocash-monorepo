import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

function readMobileFile(relativePath: string) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), "utf8");
}

describe("posthog native config > env and dependencies", () => {
  it("documents EXPO_PUBLIC_POSTHOG_KEY in .env.example for native analytics", () => {
    const envExample = readMobileFile(".env.example");

    expect(envExample).toContain("EXPO_PUBLIC_POSTHOG_KEY=");
    expect(envExample).toContain("EXPO_PUBLIC_POSTHOG_HOST=");
  });

  it("includes posthog-react-native in package.json dependencies", () => {
    const packageJson = JSON.parse(readMobileFile("package.json")) as {
      dependencies?: Record<string, string>;
    };

    expect(packageJson.dependencies?.["posthog-react-native"]).toBeTruthy();
  });

  it("wires PostHogProvider through the crash-fenced client factory", () => {
    const appProviders = readMobileFile("src/providers/AppProviders.tsx");
    const observability = readMobileFile("src/observability/client.ts");

    expect(appProviders).toContain("PostHogProvider");
    // The client must come from createPostHogClient (init failure degrades to
    // the no-op client) — never from a raw apiKey prop, whose internal
    // construction crash blanked beta web on 2026-07-19.
    expect(appProviders).toContain("createPostHogClient(posthogConfig)");
    expect(appProviders).not.toContain("apiKey={");
    expect(observability).toContain("posthogKey");
    expect(observability).toContain("posthogHost");
  });

  it("includes a posthog storage module so the real client can initialize on web", () => {
    const packageJson = JSON.parse(readMobileFile("package.json")) as {
      dependencies?: Record<string, string>;
    };

    expect(
      packageJson.dependencies?.["@react-native-async-storage/async-storage"],
    ).toBeTruthy();
  });
});
