import { describe, expect, it } from "vitest";

// @ts-ignore - The app preflight helper is a Node .mjs CLI, not a typed app module.
const preflight = await import("../../scripts/gogosense-preflight.mjs");

describe("GoGoSense Android preflight script helpers", () => {
  it("extracts Android merchant packages from API catalog shapes", () => {
    expect(
      preflight.merchantPackages([
        { android_packages: ["com.shopee.th", " com.lazada.android "] },
        { androidPackages: ["com.agoda.mobile.consumer"] },
        { package_names: "com.example.single" },
        { android_packages: ["com.shopee.th"] },
      ])
    ).toEqual(["com.agoda.mobile.consumer", "com.example.single", "com.lazada.android", "com.shopee.th"]);
  });

  it("parses adb device, appops, package, and foreground output", () => {
    expect(
      preflight.parseDevices("List of devices attached\nemulator-5554\tdevice\nabc123\toffline\n")
    ).toEqual([
      { serial: "emulator-5554", state: "device" },
      { serial: "abc123", state: "offline" },
    ]);
    expect(preflight.parseUsageAccess("GET_USAGE_STATS: allow")).toBe(true);
    expect(preflight.parseUsageAccess("GET_USAGE_STATS: ignore")).toBe(false);
    expect(preflight.parseInstalledPackages("package:co.gogocash.app\npackage:com.shopee.th\n")).toEqual(
      new Set(["co.gogocash.app", "com.shopee.th"])
    );
    expect(
      preflight.parseForegroundPackage(
        "mCurrentFocus=Window{abc u0 com.shopee.th/com.shopee.app.ui.home.HomeActivity}"
      )
    ).toBe("com.shopee.th");
  });

  it("supports environment defaults and command-line overrides", () => {
    expect(
      preflight.parseArgs(
        ["--api-url", "https://api.example.test/", "--merchant-packages", "com.a, com.b", "--require-foreground"],
        {
          ADB_PATH: "/tmp/adb",
          ANDROID_SERIAL: "device-1",
          GOGOCASH_ANDROID_PACKAGE: "co.test.app",
          NODE_ENV: "test",
        }
      )
    ).toMatchObject({
      adb: "/tmp/adb",
      apiUrl: "https://api.example.test",
      appPackage: "co.test.app",
      device: "device-1",
      expectedPackages: ["com.a", "com.b"],
      requireForeground: true,
    });
  });
});
