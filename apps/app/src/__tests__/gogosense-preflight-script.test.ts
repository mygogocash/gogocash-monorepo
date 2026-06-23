import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

    expect(preflight.deviceConnectionDetail([])).toBe(
      "no adb devices listed; connect an Android device or start an emulator"
    );
    expect(preflight.deviceConnectionDetail([{ serial: "abc123", state: "offline" }])).toBe(
      "no adb device in state=device; connected states: abc123:offline; reconnect the device or run adb kill-server/start-server"
    );
    expect(preflight.deviceConnectionDetail([{ serial: "abc123", state: "unauthorized" }])).toBe(
      "no adb device in state=device; connected states: abc123:unauthorized; accept the USB debugging prompt or reset adb authorization"
    );
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
          "--capture-device-evidence",
          "--checkpoint-delay-ms",
          "1500",
          "--detect-package",
          "com.a",
          "--evidence-dir",
          "/tmp/gogosense-evidence",
          "--install-apk",
          "/tmp/gogocash-dev-client.apk",
          "--install-apk-sha256",
          "5bdad05fe54f21e7b583966a2204f67b0029856d73b01c702585eaa71d909e7a",
          "--merchant-apks",
          "/tmp/shopee-base.apk,/tmp/shopee-arm64.apk",
          "--grant-usage-access",
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
      captureDeviceEvidence: true,
      checkpointDelayMs: 1500,
      detectPackage: "com.a",
      device: "device-1",
      evidenceDir: "/tmp/gogosense-evidence",
      expectedPackages: ["com.a", "com.b"],
      grantUsageAccess: true,
      installApk: "/tmp/gogocash-dev-client.apk",
      installApkSha256: "5bdad05fe54f21e7b583966a2204f67b0029856d73b01c702585eaa71d909e7a",
      merchantApks: ["/tmp/shopee-base.apk", "/tmp/shopee-arm64.apk"],
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
  it("verifies the dev-client APK SHA-256 before install", async () => {
    const dir = await mkdtemp(join(tmpdir(), "gogosense-apk-"));
    const apkPath = join(dir, "gogocash-development.apk");

    try {
      await writeFile(apkPath, "dev-client");

      expect(
        preflight.devClientApkSha256Result(
          apkPath,
          "af66a07406116382ac972a0702deecf6905b367af946baf1b72e1c1b2311c25a"
        )
      ).toEqual({
        status: "pass",
        name: "GoGoCash dev-client APK SHA-256",
        detail: "af66a07406116382ac972a0702deecf6905b367af946baf1b72e1c1b2311c25a",
      });

      expect(
        preflight.devClientApkSha256Result(
          apkPath,
          "5bdad05fe54f21e7b583966a2204f67b0029856d73b01c702585eaa71d909e7a"
        )
      ).toMatchObject({
        status: "fail",
        name: "GoGoCash dev-client APK SHA-256",
      });

      expect(preflight.devClientApkSha256Result(apkPath, "")).toBeNull();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("gogosense preflight activation options", () => {
  it("parseArgs > enables activation and deeplink opening flags", () => {
    expect(preflight.parseArgs(["--activate"], { ...process.env }).activate).toBe(true);

    const openOptions = preflight.parseArgs(["--open-deeplink"], { ...process.env });

    expect(openOptions.activate).toBe(true);
    expect(openOptions.openDeeplink).toBe(true);
  });

  it("buildActivationRequest > maps matched detection fields to backend activation payload", () => {
    expect(
      preflight.buildActivationRequest({
        detectionEventId: "det_123",
        merchantId: "merchant-shopee",
        offerId: "5030",
        networkMerchantId: "103876",
      })
    ).toEqual({
      detectionEventId: "det_123",
      merchantId: "merchant-shopee",
      offerId: 5030,
      networkMerchantId: 103876,
      source: "gogosense",
    });
  });

  it("activationPayloadErrors > reports missing activation contract fields", () => {
    expect(
      preflight.activationPayloadErrors({
        merchantId: "",
        offerId: Number.NaN,
        networkMerchantId: Number.NaN,
        source: "gogosense",
      })
    ).toEqual(["merchantId", "offerId", "networkMerchantId"]);
  });

  it("runPreflight > posts activation after a matched protected detection", async () => {
    const fetchCalls: Array<{ init?: RequestInit; url: string }> = [];
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async (input, init) => {
      const url = String(input);
      fetchCalls.push({ init, url });

      let body: unknown = {};
      if (url.endsWith("/gogosense/merchants")) {
        body = [{ android_packages: ["com.shopee.th"] }];
      } else if (url.endsWith("/gogosense/detect")) {
        body = {
          detectionEventId: "det_123",
          matched: true,
          merchantId: "merchant-shopee",
          merchantName: "Shopee",
          networkMerchantId: 103876,
          offerId: 5030,
        };
      } else if (url.endsWith("/gogosense/activate")) {
        body = { deeplink: "https://invl.me/example" };
      }

      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify(body),
      } as Response;
    };

    try {
      const report = await preflight.runPreflight(
        preflight.parseArgs(
          [
            "--adb",
            "/definitely/missing-adb",
            "--api-url",
            "https://api.example.test",
            "--auth-token",
            "token",
            "--detect-package",
          "com.shopee.th",
            "--activate",
          ],
          { ...process.env }
        )
      );

      expect(fetchCalls.map((call) => call.url)).toEqual([
        "https://api.example.test/gogosense/merchants",
        "https://api.example.test/gogosense/settings",
        "https://api.example.test/gogosense/detect",
        "https://api.example.test/gogosense/activate",
      ]);
      expect(JSON.parse(String(fetchCalls[3].init?.body))).toEqual(
        {
          detectionEventId: "det_123",
          merchantId: "merchant-shopee",
          offerId: 5030,
          networkMerchantId: 103876,
          source: "gogosense",
        }
      );
      expect(report.results).toContainEqual({
        detail: "https://invl.me/example",
        name: "protected activation probe",
        status: "pass",
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("GoGoSense Android preflight evidence bundle", () => {
  it("writeEvidenceBundle > writes report, summary, and deeplink evidence files", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "gogosense-evidence-"));

    try {
      preflight.writeEvidenceBundle(
        {
          context: {
            adb: "/tmp/adb",
            apiUrl: "https://api.example.test",
            activationDeeplink: "https://invl.me/example",
            device: "emulator-5554",
            foregroundPackage: "com.shopee.th",
          },
          results: [
            { name: "android device connected", status: "pass" },
            { name: "GoGoCash usage access", status: "pass" },
            { name: "protected activation probe", status: "pass", detail: "https://invl.me/example" },
            { name: "activation deeplink open", status: "warn" },
          ],
        },
        tempDir
      );

      await expect(readFile(join(tempDir, "activation-deeplink.txt"), "utf8")).resolves.toBe(
        "https://invl.me/example\n"
      );
      await expect(readFile(join(tempDir, "summary.txt"), "utf8")).resolves.toContain(
        "activationDeeplink=https://invl.me/example"
      );
      await expect(readFile(join(tempDir, "acceptance-checklist.md"), "utf8")).resolves.toContain(
        "- [x] Activation deeplink returned: pass - https://invl.me/example"
      );
      await expect(readFile(join(tempDir, "acceptance-checklist.md"), "utf8")).resolves.toContain(
        "- [ ] Activation deeplink opened: warn"
      );

      const report = JSON.parse(await readFile(join(tempDir, "preflight-report.json"), "utf8"));
      expect(report.context.device).toBe("emulator-5554");
      expect(report.results).toHaveLength(4);
    } finally {
      await rm(tempDir, { force: true, recursive: true });
    }
  });
});

describe("GoGoSense Android preflight device evidence capture", () => {
  it("writeDeviceEvidenceBundle > captures foreground, logcat, and screenshot evidence", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "gogosense-device-evidence-"));
    const fakeAdb = join(tempDir, "adb");

    await writeFile(
      fakeAdb,
      `#!/bin/sh
if [ "$1" = "-s" ]; then
  shift 2
fi
if [ "$1" = "shell" ] && [ "$2" = "monkey" ]; then
  printf 'Events injected: 1\n'
  exit 0
fi
if [ "$1" = "shell" ] && [ "$2" = "am" ]; then
  printf 'Starting: Intent { act=android.intent.action.VIEW dat=gogocash://gogosense pkg=co.gogocash.app }\n'
  exit 0
fi
if [ "$1" = "shell" ] && [ "$2" = "dumpsys" ]; then
  echo "mCurrentFocus=Window{u0 com.shopee.th/com.shopee.app.ui.home.HomeActivity}"
  exit 0
fi
if [ "$1" = "logcat" ]; then
  echo "GoGoSense Activate cashback"
  exit 0
fi
if [ "$1" = "exec-out" ] && [ "$2" = "screencap" ]; then
  printf 'PNGDATA'
  exit 0
fi
echo "ok"
`
    );
    await chmod(fakeAdb, 0o755);

    try {
      preflight.writeDeviceEvidenceBundle(
        { context: { device: "emulator-5554" }, results: [] },
        {
          adb: fakeAdb,
          captureDeviceEvidence: true,
          evidenceDir: tempDir,
        }
      );

      await expect(readFile(join(tempDir, "device-window.txt"), "utf8")).resolves.toContain(
        "com.shopee.th"
      );
      await expect(readFile(join(tempDir, "device-logcat.txt"), "utf8")).resolves.toContain(
        "Activate cashback"
      );
      await expect(readFile(join(tempDir, "device-screenshot.png"), "utf8")).resolves.toBe("PNGDATA");
      await expect(readFile(join(tempDir, "device-screenshot.txt"), "utf8")).resolves.toContain(
        "ok=true"
      );
    } finally {
      await rm(tempDir, { force: true, recursive: true });
    }
  });
});

describe("GoGoSense Android preflight merchant APK install", () => {
  it("runPreflight > installs merchant split APKs before supported merchant verification", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "gogosense-preflight-"));
    const commandLog = join(tempDir, "adb.log");
    const fakeAdb = join(tempDir, "adb");
    const shopeeBase = join(tempDir, "com.shopee.th.apk");
    const shopeeConfig = join(tempDir, "config.arm64_v8a.apk");
    const originalFetch = globalThis.fetch;

    await writeFile(shopeeBase, "");
    await writeFile(shopeeConfig, "");
    await writeFile(
      fakeAdb,
      `#!/bin/sh
echo "$@" >> "${commandLog}"
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ]; then
  shift 2
fi
if [ "$1" = "install-multiple" ]; then
  echo "Success"
  exit 0
fi
if [ "$1" = "shell" ] && [ "$2" = "pm" ]; then
  printf 'package:co.gogocash.app\\npackage:com.shopee.th\\n'
  exit 0
fi
if [ "$1" = "shell" ] && [ "$2" = "appops" ]; then
  echo "GET_USAGE_STATS: allow"
  exit 0
fi
if [ "$1" = "shell" ] && [ "$2" = "dumpsys" ]; then
  echo "mCurrentFocus=Window{u0 com.shopee.th/com.shopee.app.ui.home.HomeActivity}"
  exit 0
fi
echo "ok"
`
    );
    await chmod(fakeAdb, 0o755);

    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify([
          {
            merchant_id: "shopee-th",
            enabled: true,
            android_packages: ["com.shopee.th"],
          },
        ]),
        { status: 200, headers: { "content-type": "application/json" } }
      )) as typeof fetch;

    try {
      const report = await preflight.runPreflight({
        ...preflight.parseArgs([], { ...process.env }),
        adb: fakeAdb,
        apiUrl: "https://api.example.test",
        grantUsageAccess: true,
        merchantApks: [shopeeBase, shopeeConfig],
        expectedPackages: ["com.shopee.th"],
        openMerchant: true,
        returnToGogosense: true,
        captureDeviceEvidence: true,
        checkpointDelayMs: 0,
        evidenceDir: tempDir,
      });

      const commands = await readFile(commandLog, "utf8");

      expect(commands).toContain(`install-multiple -r ${shopeeBase} ${shopeeConfig}`);
      expect(commands).toContain("shell monkey -p com.shopee.th -c android.intent.category.LAUNCHER 1");
      expect(commands.indexOf("shell monkey -p com.shopee.th")).toBeGreaterThanOrEqual(0);
      expect(commands.indexOf("shell monkey -p com.shopee.th")).toBeLessThan(
        commands.indexOf("shell dumpsys window")
      );
      expect(commands).toContain(
        "shell am start -a android.intent.action.VIEW -d gogocash://gogosense co.gogocash.app"
      );
      expect(commands.indexOf("shell dumpsys window")).toBeLessThan(
        commands.indexOf("shell am start -a android.intent.action.VIEW -d gogocash://gogosense co.gogocash.app")
      );
      expect(
        report.results.some((item) => item.name === "supported merchant launch" && item.status === "pass")
      ).toBe(true);
      expect(report.results.some((item) => item.name === "GoGoSense hub return" && item.status === "pass")).toBe(
        true
      );
      await expect(readFile(join(tempDir, "merchant-foreground-window.txt"), "utf8")).resolves.toContain(
        "merchant-foreground: adb shell dumpsys window"
      );
      await expect(readFile(join(tempDir, "merchant-foreground-screenshot.txt"), "utf8")).resolves.toContain(
        "merchant-foreground: adb exec-out screencap -p"
      );
      await expect(readFile(join(tempDir, "gogosense-hub-window.txt"), "utf8")).resolves.toContain(
        "gogosense-hub: adb shell dumpsys window"
      );
      await expect(readFile(join(tempDir, "gogosense-hub-screenshot.txt"), "utf8")).resolves.toContain(
        "gogosense-hub: adb exec-out screencap -p"
      );
      expect(commands).toContain("shell appops set co.gogocash.app GET_USAGE_STATS allow");
      expect(commands.indexOf("shell appops set")).toBeLessThan(commands.indexOf("shell appops get"));
      expect(report.results).toContainEqual(
        expect.objectContaining({
          name: "supported merchant APK install",
          status: "pass",
        })
      );
      expect(report.results).toContainEqual(
        expect.objectContaining({
          name: "GoGoCash usage access grant",
          status: "pass",
        })
      );
      expect(report.results).toContainEqual(
        expect.objectContaining({
          name: "supported merchant app installed",
          status: "pass",
        })
      );
    } finally {
      globalThis.fetch = originalFetch;
      await rm(tempDir, { force: true, recursive: true });
    }
  });
});

describe("GoGoSense Android preflight dev-client APK integrity", () => {
  it("runPreflight > stops before adb install when the dev-client APK SHA-256 mismatches", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "gogosense-apk-integrity-"));
    const adbPath = join(tempDir, "adb");
    const apkPath = join(tempDir, "gogocash-development.apk");
    const logPath = join(tempDir, "adb.log");
    const originalFetch = globalThis.fetch;

    try {
      await writeFile(apkPath, "dev-client");
      await writeFile(
        adbPath,
        `#!/bin/sh
echo "$*" >> "${logPath}"
if [ "$1" = "version" ]; then
  echo "Android Debug Bridge version 1.0.41"
  exit 0
fi
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ]; then
  shift 2
fi
if [ "$1" = "shell" ] && [ "$2" = "pm" ] && [ "$3" = "list" ]; then
  exit 0
fi
if [ "$1" = "install" ]; then
  echo "unexpected install" >&2
  exit 42
fi
exit 0
`
      );
      await chmod(adbPath, 0o755);

      globalThis.fetch = async (url) => {
        if (String(url).endsWith("/gogosense/merchants")) {
          return new Response(JSON.stringify([]), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }

        return new Response("{}", {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      };

      const report = await preflight.runPreflight({
        ...preflight.parseArgs([], { ...process.env }),
        adb: adbPath,
        apiUrl: "https://api.example.test",
        appPackage: "co.gogocash.app",
        installApk: apkPath,
        installApkSha256: "5bdad05fe54f21e7b583966a2204f67b0029856d73b01c702585eaa71d909e7a",
      });

      expect(report.results).toContainEqual(
        expect.objectContaining({
          name: "GoGoCash dev-client APK SHA-256",
          status: "fail",
        })
      );
      await expect(readFile(logPath, "utf8")).resolves.not.toContain("install -r");
    } finally {
      globalThis.fetch = originalFetch;
      await rm(tempDir, { force: true, recursive: true });
    }
  });

  it("runPreflight > verifies the supplied APK hash even when the app is already installed", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "gogosense-apk-installed-"));
    const adbPath = join(tempDir, "adb");
    const apkPath = join(tempDir, "gogocash-development.apk");
    const logPath = join(tempDir, "adb.log");
    const originalFetch = globalThis.fetch;

    try {
      await writeFile(apkPath, "dev-client");
      await writeFile(
        adbPath,
        `#!/bin/sh
echo "$*" >> "${logPath}"
if [ "$1" = "version" ]; then
  echo "Android Debug Bridge version 1.0.41"
  exit 0
fi
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ]; then
  shift 2
fi
if [ "$1" = "shell" ] && [ "$2" = "pm" ] && [ "$3" = "path" ]; then
  echo "package:/data/app/co.gogocash.app/base.apk"
  exit 0
fi
if [ "$1" = "install" ]; then
  echo "unexpected install" >&2
  exit 42
fi
exit 0
`
      );
      await chmod(adbPath, 0o755);

      globalThis.fetch = async (url) => {
        if (String(url).endsWith("/gogosense/merchants")) {
          return new Response(JSON.stringify([]), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }

        return new Response("{}", {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      };

      const report = await preflight.runPreflight({
        ...preflight.parseArgs([], { ...process.env }),
        adb: adbPath,
        apiUrl: "https://api.example.test",
        appPackage: "co.gogocash.app",
        installApk: apkPath,
        installApkSha256: "5bdad05fe54f21e7b583966a2204f67b0029856d73b01c702585eaa71d909e7a",
      });

      expect(report.results).toContainEqual(
        expect.objectContaining({
          name: "GoGoCash dev-client APK SHA-256",
          status: "fail",
        })
      );
      await expect(readFile(logPath, "utf8")).resolves.not.toContain("install -r");
    } finally {
      globalThis.fetch = originalFetch;
      await rm(tempDir, { force: true, recursive: true });
    }
  });
});
