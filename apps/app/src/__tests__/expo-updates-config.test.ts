import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("expo updates config > app.config.js", () => {
  const configSource = readFileSync(
    resolve(__dirname, "../../app.config.js"),
    "utf8",
  );

  it("defines runtimeVersion policy appVersion for OTA compatibility", () => {
    expect(configSource).toContain("runtimeVersion");
    expect(configSource).toContain("policy: \"appVersion\"");
  });

  it("defines EAS updates URL when project id is available", () => {
    expect(configSource).toContain("updates:");
    expect(configSource).toContain("https://u.expo.dev/");
    expect(configSource).toContain("EXPO_PUBLIC_EAS_PROJECT_ID");
    expect(configSource).toContain('checkAutomatically: "ON_LOAD"');
    expect(configSource).toContain("fallbackToCacheTimeout: 0");
  });

  it("lists expo-updates config plugin for native OTA manifest wiring", () => {
    expect(configSource).toContain('"expo-updates"');
  });
});
