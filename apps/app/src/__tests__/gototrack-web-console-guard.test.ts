import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

describe("promptSettingsStorage web parity", () => {
  it("promptSettingsStorage > given Expo web > then uses localStorage only and never SecureStore", () => {
    const source = fs.readFileSync(
      path.join(mobileRoot, "src/gototrack/promptSettingsStorage.ts"),
      "utf8",
    );

    expect(source).toContain('Platform.OS === "web"');
    expect(source).not.toContain("writeWebFlag(enabled);\n\n  const secureStore");
  });
});

describe("clearMobileAppSession web parity", () => {
  it("clearMobileAppSession > given Expo web > then skips native SecureStore clearing", () => {
    const source = fs.readFileSync(
      path.join(mobileRoot, "src/auth/session.ts"),
      "utf8",
    );

    expect(source).toContain('Platform.OS !== "web"');
  });
});

describe("gototrack detector web bundle", () => {
  it("detectorInstance > given web bundle > then lazy-loads native module only on Android", () => {
    const source = fs.readFileSync(
      path.join(mobileRoot, "src/gototrack/detectorInstance.ts"),
      "utf8",
    );

    expect(source).not.toContain('from "../../modules/gototrack-detector"');
    expect(source).toContain('Platform.OS !== "android"');
  });
});
