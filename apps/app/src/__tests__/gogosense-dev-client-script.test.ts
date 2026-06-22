import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

type PackageJson = {
  scripts?: Record<string, string>;
};

const require = createRequire(import.meta.url);
const packageJson = require("../../package.json") as PackageJson;

// @ts-ignore - The dev-client helper is a Node .mjs CLI, not a typed app module.
const devClient = await import("../../scripts/gogosense-dev-client.mjs");

describe("GoGoSense Android dev-client script", () => {
  it("routes the npm command through the guarded launcher", () => {
    expect(packageJson.scripts?.["gogosense:dev-client"]).toBe(
      "node scripts/gogosense-dev-client.mjs"
    );
  });

  it("pins the Metro flags needed for Android dev-client acceptance", () => {
    expect(devClient.buildExpoArgs()).toEqual([
      "start",
      "--dev-client",
      "--host",
      "localhost",
      "--port",
      "8081",
      "--clear",
    ]);
  });

  it("preserves the app workspace module and IPv4 DNS workarounds", () => {
    const env = devClient.buildExpoEnv({ NODE_ENV: "test" }, "/repo/apps/app");

    expect(env.NODE_PATH).toBe("/repo/apps/app/node_modules");
    expect(env.NODE_OPTIONS).toContain("--dns-result-order=ipv4first");
  });

  it("builds the adb reverse command for localhost Metro on Android", () => {
    expect(devClient.adbReverseArgs()).toEqual(["reverse", "tcp:8081", "tcp:8081"]);
    expect(devClient.adbReverseDeviceArgs("emulator-5554")).toEqual([
      "-s",
      "emulator-5554",
      "reverse",
      "tcp:8081",
      "tcp:8081",
    ]);
  });

  it("recognizes connected devices from adb parser output", () => {
    expect(devClient.isConnectedAdbDevice({ serial: "emulator-5554", state: "device" })).toBe(true);
    expect(devClient.isConnectedAdbDevice({ serial: "emulator-5554", state: "offline" })).toBe(false);
  });
});
