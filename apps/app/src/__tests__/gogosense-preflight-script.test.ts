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

  it("classifies staging merchant catalog readiness for final and controlled QA", () => {
    expect(preflight.catalogResult([{ merchant_id: "shopee" }], [])).toEqual({
      detail: "1 merchant(s) returned",
      name: "staging merchant catalog",
      status: "pass",
    });
    expect(preflight.catalogResult([], [])).toEqual({
      detail: "GET /gogosense/merchants returned []; seed staging with apps/api gogosense:seed-merchants",
      name: "staging merchant catalog",
      status: "fail",
    });
    expect(preflight.catalogResult([], ["com.shopee.th"])).toEqual({
      detail:
        "GET /gogosense/merchants returned []; using --merchant-packages for controlled QA, seed staging before final acceptance",
      name: "staging merchant catalog",
      status: "warn",
    });
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
        [
          "--api-url",
          "https://api.example.test/",
          "--auth-token",
          "token-1",
          "--detect-package",
          "com.a",
          "--install-apk",
          "/tmp/gogocash-dev-client.apk",
          "--merchant-packages",
          "com.a, com.b",
          "--require-auth",
          "--require-foreground",
        ],
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
      authToken: "token-1",
      detectPackage: "com.a",
      device: "device-1",
      expectedPackages: ["com.a", "com.b"],
      installApk: "/tmp/gogocash-dev-client.apk",
      requireAuth: true,
      requireForeground: true,
    });
  });

  it("builds the protected detection probe request expected by the API", () => {
    expect(preflight.buildDetectionRequest("com.shopee.th")).toMatchObject({
      method: "android_package",
      packageName: "com.shopee.th",
      platform: "android",
    });
    expect(new Date(preflight.buildDetectionRequest("com.shopee.th").observedAt).toString()).not.toBe(
      "Invalid Date"
    );
  });
});
