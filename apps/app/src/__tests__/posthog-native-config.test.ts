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

  it("wires PostHogProvider when a key is configured", () => {
    const appProviders = readMobileFile("src/providers/AppProviders.tsx");
    const observability = readMobileFile("src/observability/client.ts");

    expect(appProviders).toContain("PostHogProvider");
    expect(appProviders).toContain("posthogConfig.posthogKey");
    expect(observability).toContain("posthogKey");
    expect(observability).toContain("posthogHost");
  });
});
