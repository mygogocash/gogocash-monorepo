import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

const preflight = await import("../../scripts/gogosense-preflight.mjs");

describe("GoGoSense preflight evidence bundle", () => {
  let tempDir: string | null = null;

  afterEach(async () => {
    vi.unstubAllGlobals();
    if (tempDir) {
      await rm(tempDir, { force: true, recursive: true });
      tempDir = null;
    }
  });

  it("lists checkpoint UI hierarchy files for final Android acceptance evidence", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "gogosense-evidence-summary-"));

    preflight.writeEvidenceBundle(
      {
        context: {
          activationDeeplink: "https://invl.me/example",
          apiUrl: "https://api.example.test",
          appPackage: "co.gogocash.app",
          authTokenPresent: true,
          device: "emulator-5554",
          foregroundPackage: "com.shopee.th",
          installedMerchantPackages: ["com.shopee.th"],
          merchantPackages: ["com.shopee.th"],
          merchants: [],
        },
        results: [
          { detail: "device evidence captured", name: "device evidence captured", status: "pass" },
          { detail: "gogocash://gogosense", name: "GoGoSense hub return", status: "pass" },
          { detail: "https://invl.me/example", name: "activation deeplink open", status: "pass" },
        ],
      },
      tempDir
    );

    const checklist = await readFile(join(tempDir, "acceptance-checklist.md"), "utf8");

    expect(checklist).toContain("- preflight-command.txt");
    expect(checklist).toContain("- device-adb-reverse.txt");
    expect(checklist).toContain("- merchant-foreground-ui.xml");
    expect(checklist).toContain("- gogosense-hub-ui.xml");
    expect(checklist).toContain("- activation-nudge-tap.txt");
    expect(checklist).toContain("- activation-nudge-tap-ui.xml");
    expect(checklist).toContain("- activation-deeplink-ui.xml");
  });

  it("parses the required activation nudge evidence gate", () => {
    const options = preflight.parseArgs(["--require-nudge", "--tap-nudge"], { ...process.env });

    expect(options.requireNudge).toBe(true);
    expect(options.tapNudge).toBe(true);
  });

  it("fails the required activation nudge gate when hub UI evidence is missing the nudge", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "gogosense-nudge-evidence-"));
    const fakeAdb = join(tempDir, "adb");
    const foregroundFile = join(tempDir, "foreground.txt");

    await writeFile(
      fakeAdb,
      `#!/bin/sh
if [ "$1" = "version" ]; then
  echo "Android Debug Bridge version 1.0.41"
  exit 0
fi
case " $* " in
  *" devices "*|*" devices")
    printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
    exit 0
    ;;
esac
if [ "$1" = "-s" ]; then
  shift 2
fi
if [ "$1" = "shell" ] && [ "$2" = "pm" ] && [ "$3" = "path" ]; then
  echo "package:/data/app/co.gogocash.app/base.apk"
  exit 0
fi
if [ "$1" = "shell" ] && [ "$2" = "appops" ]; then
  echo "GET_USAGE_STATS: allow"
  exit 0
fi
if [ "$1" = "shell" ] && [ "$2" = "pm" ] && [ "$3" = "list" ]; then
  printf 'package:co.gogocash.app\\npackage:com.shopee.th\\n'
  exit 0
fi
if [ "$1" = "shell" ] && [ "$2" = "monkey" ]; then
  echo "Events injected: 1"
  exit 0
fi
if [ "$1" = "shell" ] && [ "$2" = "dumpsys" ] && [ "$3" = "window" ]; then
  if [ -f "${foregroundFile}" ]; then
    cat "${foregroundFile}"
  else
    echo "mCurrentFocus=Window{abc u0 com.shopee.th/com.shopee.MainActivity}"
  fi
  exit 0
fi
if [ "$1" = "shell" ] && [ "$2" = "am" ]; then
  case " $* " in
    *"track.gogocash.co"*)
      echo "mCurrentFocus=Window{abc u0 com.android.chrome/com.google.android.apps.chrome.Main}" > "${foregroundFile}"
      ;;
    *)
      echo "mCurrentFocus=Window{abc u0 co.gogocash.app/.MainActivity}" > "${foregroundFile}"
      ;;
  esac
  echo "Starting: Intent"
  exit 0
fi
if [ "$1" = "exec-out" ] && [ "$2" = "screencap" ]; then
  printf 'PNGDATA'
  exit 0
fi
if [ "$1" = "exec-out" ] && [ "$2" = "uiautomator" ]; then
  printf '<hierarchy><node text="GoGoSense" content-desc="GoGoSense hub" /></hierarchy>'
  exit 0
fi
echo "unexpected adb args: $*" >&2
exit 1
`
    );
    await chmod(fakeAdb, 0o755);

    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const requestUrl = String(url);
      if (requestUrl.endsWith("/gogosense/merchants")) {
        return new Response(
          JSON.stringify([{ enabled: true, merchant_id: "shopee-th", android_packages: ["com.shopee.th"] }]),
          { headers: { "content-type": "application/json" }, status: 200 }
        );
      }
      if (requestUrl.endsWith("/gogosense/settings")) {
        return new Response(JSON.stringify({ enabled: true }), {
          headers: { "content-type": "application/json" },
          status: 200,
        });
      }
      if (requestUrl.endsWith("/gogosense/detect")) {
        return new Response(
          JSON.stringify({
            detectedPackage: "com.shopee.th",
            detectionEventId: "event-1",
            matched: true,
            merchantId: 101,
            networkMerchantId: 201,
          }),
          { headers: { "content-type": "application/json" }, status: 200 }
        );
      }
      if (requestUrl.endsWith("/gogosense/activate")) {
        return new Response(JSON.stringify({ deeplink: "https://track.gogocash.co/shopee" }), {
          headers: { "content-type": "application/json" },
          status: 200,
        });
      }

      throw new Error(`unexpected fetch ${requestUrl} ${init?.method ?? "GET"}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const report = await preflight.runPreflight({
      ...preflight.parseArgs([], { ...process.env }),
      adb: fakeAdb,
      apiUrl: "https://api.example.test",
      authToken: "token-1",
      activate: true,
      captureDeviceEvidence: true,
      device: "emulator-5554",
      detectPackage: "com.shopee.th",
      evidenceDir: tempDir,
      openMerchant: true,
      requireForeground: true,
      requireNudge: true,
      returnToGogosense: true,
    });

    const resultSummary = report.results.map((item) => `${item.name}:${item.status}`);
    const nudgeResult = report.results.find((item) => item.name === "GoGoSense activation nudge visible");

    expect(resultSummary).toContain("GoGoSense hub return:pass");
    expect(nudgeResult?.status).toBe("fail");
    await expect(readFile(join(tempDir, "gogosense-hub-ui.xml"), "utf8")).resolves.toContain("GoGoSense hub");
  });

  it("taps the activation nudge center from the captured UI hierarchy", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "gogosense-nudge-tap-"));
    const fakeAdb = join(tempDir, "adb");
    const foregroundFile = join(tempDir, "foreground.txt");
    const tapFile = join(tempDir, "tap.txt");

    await writeFile(
      fakeAdb,
      `#!/bin/sh
if [ "$1" = "version" ]; then
  echo "Android Debug Bridge version 1.0.41"
  exit 0
fi
case " $* " in
  *" devices "*|*" devices")
    printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
    exit 0
    ;;
esac
if [ "$1" = "-s" ]; then
  shift 2
fi
if [ "$1" = "shell" ] && [ "$2" = "pm" ] && [ "$3" = "path" ]; then
  echo "package:/data/app/co.gogocash.app/base.apk"
  exit 0
fi
if [ "$1" = "shell" ] && [ "$2" = "appops" ]; then
  echo "GET_USAGE_STATS: allow"
  exit 0
fi
if [ "$1" = "shell" ] && [ "$2" = "pm" ] && [ "$3" = "list" ]; then
  printf 'package:co.gogocash.app\\npackage:com.shopee.th\\n'
  exit 0
fi
if [ "$1" = "shell" ] && [ "$2" = "monkey" ]; then
  echo "Events injected: 1"
  exit 0
fi
if [ "$1" = "shell" ] && [ "$2" = "dumpsys" ] && [ "$3" = "window" ]; then
  if [ -f "${foregroundFile}" ]; then
    cat "${foregroundFile}"
  else
    echo "mCurrentFocus=Window{abc u0 com.shopee.th/com.shopee.MainActivity}"
  fi
  exit 0
fi
if [ "$1" = "shell" ] && [ "$2" = "am" ]; then
  case " $* " in
    *"track.gogocash.co"*)
      echo "mCurrentFocus=Window{abc u0 com.android.chrome/com.google.android.apps.chrome.Main}" > "${foregroundFile}"
      ;;
    *)
      echo "mCurrentFocus=Window{abc u0 co.gogocash.app/.MainActivity}" > "${foregroundFile}"
      ;;
  esac
  echo "Starting: Intent"
  exit 0
fi
if [ "$1" = "shell" ] && [ "$2" = "input" ] && [ "$3" = "tap" ]; then
  echo "$4,$5" > "${tapFile}"
  exit 0
fi
if [ "$1" = "exec-out" ] && [ "$2" = "screencap" ]; then
  printf 'PNGDATA'
  exit 0
fi
if [ "$1" = "exec-out" ] && [ "$2" = "uiautomator" ]; then
  printf '<hierarchy><node text="Activate cashback" content-desc="Activate cashback for Shopee" bounds="[10,20][110,220]" /></hierarchy>'
  exit 0
fi
echo "unexpected adb args: $*" >&2
exit 1
`
    );
    await chmod(fakeAdb, 0o755);

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL) => {
        const requestUrl = String(url);
        if (requestUrl.endsWith("/gogosense/merchants")) {
          return new Response(
            JSON.stringify([{ enabled: true, merchant_id: "shopee-th", android_packages: ["com.shopee.th"] }]),
            { headers: { "content-type": "application/json" }, status: 200 }
          );
        }
        if (requestUrl.endsWith("/gogosense/settings")) {
          return new Response(JSON.stringify({ enabled: true }), {
            headers: { "content-type": "application/json" },
            status: 200,
          });
        }
        if (requestUrl.endsWith("/gogosense/detect")) {
          return new Response(
            JSON.stringify({
              detectionEventId: "event-1",
              merchantId: 101,
              matched: true,
              networkMerchantId: 201,
              offerId: 301,
            }),
            { headers: { "content-type": "application/json" }, status: 200 }
          );
        }
        if (requestUrl.endsWith("/gogosense/activate")) {
          return new Response(JSON.stringify({ deeplink: "https://track.gogocash.co/shopee" }), {
            headers: { "content-type": "application/json" },
            status: 200,
          });
        }

        throw new Error(`unexpected fetch ${requestUrl}`);
      })
    );

    const report = await preflight.runPreflight({
      ...preflight.parseArgs([], { ...process.env }),
      adb: fakeAdb,
      apiUrl: "https://api.example.test",
      authToken: "token-1",
      activate: true,
      captureDeviceEvidence: true,
      device: "emulator-5554",
      detectPackage: "com.shopee.th",
      evidenceDir: tempDir,
      openDeeplink: true,
      openMerchant: true,
      requireForeground: true,
      requireNudge: true,
      returnToGogosense: true,
      tapNudge: true,
    });
    const tapResult = report.results.find((item) => item.name === "GoGoSense activation nudge tap");
    const resultSummary = report.results.map((item) => `${item.name}:${item.status}`);

    expect(tapResult).toMatchObject({
      status: "pass",
      detail: expect.stringContaining("tapped at 60,120"),
    });
    expect(resultSummary).toContain("activation deeplink open:pass");
    expect(resultSummary).toContain("activation deeplink foreground:pass");
    expect(report.context.activationDeeplinkForegroundPackage).toBe("com.android.chrome");
    await expect(readFile(tapFile, "utf8")).resolves.toBe("60,120\n");
    await expect(readFile(join(tempDir, "activation-nudge-tap.txt"), "utf8")).resolves.toContain("x=60\ny=120");
    await expect(readFile(join(tempDir, "activation-nudge-tap-ui.xml"), "utf8")).resolves.toContain(
      "Activate cashback"
    );
  });

  it("fails the required activation nudge gate when the hub return step is omitted", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "gogosense-nudge-precondition-"));
    const fakeAdb = join(tempDir, "adb");

    await writeFile(
      fakeAdb,
      `#!/bin/sh
if [ "$1" = "version" ]; then
  echo "Android Debug Bridge version 1.0.41"
  exit 0
fi
case " $* " in
  *" devices "*|*" devices")
    printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
    exit 0
    ;;
esac
if [ "$1" = "-s" ]; then
  shift 2
fi
if [ "$1" = "shell" ] && [ "$2" = "pm" ] && [ "$3" = "path" ]; then
  echo "package:/data/app/co.gogocash.app/base.apk"
  exit 0
fi
if [ "$1" = "shell" ] && [ "$2" = "appops" ]; then
  echo "GET_USAGE_STATS: allow"
  exit 0
fi
if [ "$1" = "shell" ] && [ "$2" = "pm" ] && [ "$3" = "list" ]; then
  printf 'package:co.gogocash.app\\npackage:com.shopee.th\\n'
  exit 0
fi
if [ "$1" = "shell" ] && [ "$2" = "monkey" ]; then
  echo "Events injected: 1"
  exit 0
fi
if [ "$1" = "shell" ] && [ "$2" = "dumpsys" ] && [ "$3" = "window" ]; then
  echo "mCurrentFocus=Window{abc u0 com.shopee.th/com.shopee.MainActivity}"
  exit 0
fi
if [ "$1" = "exec-out" ] && [ "$2" = "screencap" ]; then
  printf 'PNGDATA'
  exit 0
fi
if [ "$1" = "exec-out" ] && [ "$2" = "uiautomator" ]; then
  printf '<hierarchy />'
  exit 0
fi
echo "unexpected adb args: $*" >&2
exit 1
`
    );
    await chmod(fakeAdb, 0o755);

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL) => {
        const requestUrl = String(url);
        if (requestUrl.endsWith("/gogosense/merchants")) {
          return new Response(
            JSON.stringify([{ enabled: true, merchant_id: "shopee-th", android_packages: ["com.shopee.th"] }]),
            { headers: { "content-type": "application/json" }, status: 200 }
          );
        }
        if (requestUrl.endsWith("/gogosense/settings")) {
          return new Response(JSON.stringify({ enabled: true }), {
            headers: { "content-type": "application/json" },
            status: 200,
          });
        }

        throw new Error(`unexpected fetch ${requestUrl}`);
      })
    );

    const report = await preflight.runPreflight({
      ...preflight.parseArgs([], { ...process.env }),
      adb: fakeAdb,
      apiUrl: "https://api.example.test",
      authToken: "token-1",
      captureDeviceEvidence: true,
      device: "emulator-5554",
      evidenceDir: tempDir,
      openMerchant: true,
      requireForeground: true,
      requireNudge: true,
      tapNudge: true,
    });
    const nudgeResult = report.results.find((item) => item.name === "GoGoSense activation nudge visible");
    const tapResult = report.results.find((item) => item.name === "GoGoSense activation nudge tap");

    expect(nudgeResult).toMatchObject({
      status: "fail",
      detail: "--require-nudge needs --return-to-gogosense so gogosense-hub-ui.xml can be captured",
    });
    expect(tapResult).toMatchObject({
      status: "fail",
      detail: "--tap-nudge needs --return-to-gogosense so gogosense-hub-ui.xml can be captured",
    });
  });
});
