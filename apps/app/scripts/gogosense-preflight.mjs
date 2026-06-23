#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const defaultApiUrl = "https://api-staging.gogocash.co";
const defaultAppPackage = "co.gogocash.app";
const defaultGogosenseUrl = "gogocash://gogosense";
const merchantCatalogPath = "/gogosense/merchants";

function splitList(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function nonNegativeInt(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function wait(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function waitForCheckpoint(options) {
  if (options.captureDeviceEvidence && options.evidenceDir && options.checkpointDelayMs > 0) {
    await wait(options.checkpointDelayMs);
  }
}

function findDefaultAdb() {
  const sdkAdb = resolve(homedir(), "Library/Android/sdk/platform-tools/adb");
  return existsSync(sdkAdb) ? sdkAdb : "adb";
}

function parseArgs(argv = process.argv.slice(2), env = process.env) {
  const options = {
    adb: env.ADB_PATH || findDefaultAdb(),
    apiUrl: env.GOGOSENSE_API_URL || env.EXPO_PUBLIC_API_URL || defaultApiUrl,
    appPackage: env.GOGOCASH_ANDROID_PACKAGE || defaultAppPackage,
    activate: env.GOGOSENSE_ACTIVATE === "1",
    authToken: env.GOGOSENSE_AUTH_TOKEN || "",
    captureDeviceEvidence: env.GOGOSENSE_CAPTURE_DEVICE_EVIDENCE === "1",
    checkpointDelayMs: nonNegativeInt(env.GOGOSENSE_CHECKPOINT_DELAY_MS, 0),
    device: env.ANDROID_SERIAL || "",
    detectPackage: env.GOGOSENSE_DETECT_PACKAGE || "",
    evidenceDir: env.GOGOSENSE_EVIDENCE_DIR || "",
    installApk: env.GOGOSENSE_DEV_CLIENT_APK || "",
    installApkSha256: env.GOGOSENSE_DEV_CLIENT_APK_SHA256 || "",
    merchantApks: splitList(env.GOGOSENSE_MERCHANT_APKS || ""),
    openMerchant: env.GOGOSENSE_OPEN_MERCHANT === "1",
    returnToGogosense: env.GOGOSENSE_RETURN_TO_GOGOSENSE === "1",
    expectedPackages: splitList(env.GOGOSENSE_MERCHANT_PACKAGES || ""),
    help: false,
    grantUsageAccess: env.GOGOSENSE_GRANT_USAGE_ACCESS === "1",
    json: false,
    openDeeplink: env.GOGOSENSE_OPEN_DEEPLINK === "1",
    requireAuth: false,
    requireForeground: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      index += 1;
      return argv[index] || "";
    };

    if (arg === "--adb") options.adb = next();
    else if (arg === "--api-url") options.apiUrl = next();
    else if (arg === "--app-package") options.appPackage = next();
    else if (arg === "--activate") options.activate = true;
    else if (arg === "--auth-token") options.authToken = next();
    else if (arg === "--capture-device-evidence") options.captureDeviceEvidence = true;
    else if (arg === "--checkpoint-delay-ms") options.checkpointDelayMs = nonNegativeInt(next(), 0);
    else if (arg === "--device") options.device = next();
    else if (arg === "--detect-package") options.detectPackage = next();
    else if (arg === "--evidence-dir") options.evidenceDir = next();
    else if (arg === "--install-apk") options.installApk = next();
    else if (arg === "--install-apk-sha256") options.installApkSha256 = next();
    else if (arg === "--merchant-apks") options.merchantApks = splitList(next());
    else if (arg === "--merchant-packages") options.expectedPackages = splitList(next());
    else if (arg === "--json") options.json = true;
    else if (arg === "--grant-usage-access") options.grantUsageAccess = true;
    else if (arg === "--open-merchant") options.openMerchant = true;
    else if (arg === "--return-to-gogosense") options.returnToGogosense = true;
    else if (arg === "--open-deeplink") {
      options.activate = true;
      options.openDeeplink = true;
    }
    else if (arg === "--require-auth") options.requireAuth = true;
    else if (arg === "--require-foreground") options.requireForeground = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  options.apiUrl = options.apiUrl.replace(/\/+$/, "");
  return options;
}

function adbArgs(options, args) {
  return options.device ? ["-s", options.device, ...args] : args;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    timeout: options.timeoutMs || 15000,
  });

  return {
    error: result.error,
    ok: result.status === 0,
    status: result.status,
    stderr: (result.stderr || "").trim(),
    stdout: (result.stdout || "").trim(),
  };
}

function runBinary(command, args, options = {}) {
  const result = spawnSync(command, args, {
    timeout: options.timeoutMs || 30000,
  });

  return {
    error: result.error,
    ok: result.status === 0,
    status: result.status,
    stderr: result.stderr?.toString("utf8") || "",
    stdout: result.stdout || Buffer.alloc(0),
  };
}

async function fetchMerchants(apiUrl) {
  const response = await fetch(`${apiUrl}${merchantCatalogPath}`, {
    headers: { accept: "application/json" },
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(merchantCatalogFetchError(response.status, text));
  }

  try {
    const payload = JSON.parse(text);
    return Array.isArray(payload) ? payload : [];
  } catch (error) {
    throw new Error(`GET /gogosense/merchants returned invalid JSON: ${error.message}`);
  }
}

function merchantCatalogFetchError(status, text = "") {
  const base = `GET ${merchantCatalogPath} returned ${status}: ${text.slice(0, 200)}`;

  if (status === 404) {
    return [
      `${base}; GoGoSense API route is missing at this base URL.`,
      "Verify GOGOSENSE_API_URL/EXPO_PUBLIC_API_URL, deploy the current API to staging,",
      "then seed merchants with npm run gogosense:seed-merchants -w apps/api.",
    ].join(" ");
  }

  return base;
}

async function fetchProtectedJson(apiUrl, path, authToken, init = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      authorization: `Bearer ${authToken}`,
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(init.headers || {}),
    },
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`${init.method || "GET"} ${path} returned ${response.status}: ${text.slice(0, 200)}`);
  }

  try {
    return text ? JSON.parse(text) : null;
  } catch (error) {
    throw new Error(`${init.method || "GET"} ${path} returned invalid JSON: ${error.message}`);
  }
}

function buildDetectionRequest(packageName) {
  return {
    observedAt: new Date().toISOString(),
    method: "android_package",
    packageName,
    platform: "android",
  };
}

function buildActivationRequest(detectionResponse) {
  const payload = {
    merchantId: detectionResponse?.merchantId || "",
    offerId: Number(detectionResponse?.offerId),
    networkMerchantId: Number(detectionResponse?.networkMerchantId),
    source: "gogosense",
  };

  if (detectionResponse?.detectionEventId) {
    payload.detectionEventId = detectionResponse.detectionEventId;
  }

  return payload;
}

function activationPayloadErrors(payload) {
  const errors = [];
  if (!payload.merchantId) errors.push("merchantId");
  if (!Number.isFinite(payload.offerId)) errors.push("offerId");
  if (!Number.isFinite(payload.networkMerchantId)) errors.push("networkMerchantId");
  return errors;
}

function merchantPackages(merchants) {
  const packages = new Set();

  for (const merchant of merchants) {
    const candidates =
      merchant.android_packages ||
      merchant.androidPackages ||
      merchant.package_names ||
      merchant.packageNames ||
      merchant.packages ||
      [];
    const list = Array.isArray(candidates) ? candidates : [candidates];
    for (const packageName of list) {
      if (typeof packageName === "string" && packageName.trim()) {
        packages.add(packageName.trim());
      }
    }
  }

  return [...packages].sort();
}

function parseDevices(output) {
  return output
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [serial, state] = line.split(/\s+/);
      return { serial, state };
    });
}

function deviceConnectionDetail(devices) {
  if (!devices.length) {
    return "no adb devices listed; connect an Android device or start an emulator";
  }

  const states = devices.map((device) => `${device.serial}:${device.state || "unknown"}`).join(", ");
  if (devices.some((device) => device.state === "unauthorized")) {
    return `no adb device in state=device; connected states: ${states}; accept the USB debugging prompt or reset adb authorization`;
  }

  if (devices.some((device) => device.state === "offline")) {
    return `no adb device in state=device; connected states: ${states}; reconnect the device or run adb kill-server/start-server`;
  }

  return `no adb device in state=device; connected states: ${states}`;
}

function parseInstalledPackages(output) {
  return new Set(
    output
      .split(/\r?\n/)
      .map((line) => line.replace(/^package:/, "").trim())
      .filter(Boolean)
  );
}

function parseUsageAccess(output) {
  return /\bGET_USAGE_STATS:\s*allow\b/.test(output) || /\bGET_USAGE_STATS:\s*mode=allow\b/.test(output);
}

function parseForegroundPackage(output) {
  const patterns = [
    /mCurrentFocus=.*?\s([a-zA-Z0-9_.]+)\/[a-zA-Z0-9_.$]+/,
    /mFocusedApp=.*?\s([a-zA-Z0-9_.]+)\/[a-zA-Z0-9_.$]+/,
    /topResumedActivity=.*?\s([a-zA-Z0-9_.]+)\/[a-zA-Z0-9_.$]+/,
  ];

  for (const pattern of patterns) {
    const match = output.match(pattern);
    if (match?.[1]) return match[1];
  }

  return "";
}

function result(status, name, detail = "") {
  return { status, name, detail };
}

function devClientApkSha256Result(apkPath, expectedSha256) {
  const expected = String(expectedSha256 || "").trim().toLowerCase();
  if (!expected) return null;

  if (!/^[a-f0-9]{64}$/.test(expected)) {
    return result("fail", "GoGoCash dev-client APK SHA-256", "expected SHA-256 must be 64 hex characters");
  }

  if (!apkPath) {
    return result(
      "fail",
      "GoGoCash dev-client APK SHA-256",
      "install APK path is required when SHA-256 is set"
    );
  }

  if (!existsSync(apkPath)) {
    return result("fail", "GoGoCash dev-client APK SHA-256", `APK not found: ${apkPath}`);
  }

  const actual = createHash("sha256").update(readFileSync(apkPath)).digest("hex");
  if (actual !== expected) {
    return result(
      "fail",
      "GoGoCash dev-client APK SHA-256",
      `expected ${expected}, got ${actual}`
    );
  }

  return result("pass", "GoGoCash dev-client APK SHA-256", actual);
}

function evidenceSummary(report) {
  const counts = report.results.reduce(
    (summary, item) => ({ ...summary, [item.status]: (summary[item.status] || 0) + 1 }),
    {}
  );
  const lines = [
    `api=${report.context.apiUrl}`,
    `adb=${report.context.adb}`,
    `device=${report.context.device || "none"}`,
    `foreground=${report.context.foregroundPackage || "none"}`,
    `activationDeeplink=${report.context.activationDeeplink || "none"}`,
    `pass=${counts.pass || 0}`,
    `warn=${counts.warn || 0}`,
    `fail=${counts.fail || 0}`,
  ];

  return `${lines.join("\n")}\n`;
}

const acceptanceChecklistItems = [
  ["Android device connected", "android device connected"],
  ["GoGoCash dev client installed", "GoGoCash app installed"],
  ["Dev-client APK hash verified", "GoGoCash dev-client APK SHA-256"],
  ["Usage Access granted", "GoGoCash usage access"],
  ["Supported merchant app installed", "supported merchant app installed"],
  ["Supported merchant launched", "supported merchant launch"],
  ["Supported merchant foreground", "supported merchant foreground"],
  ["GoGoSense hub returned", "GoGoSense hub return"],
  ["Authenticated API reachable", "authenticated GoGoSense API"],
  ["Detection probe matched", "protected detection probe"],
  ["Activation deeplink returned", "protected activation probe"],
  ["Activation deeplink opened", "activation deeplink open"],
];

function acceptanceChecklist(report) {
  const lines = [
    "# GoGoSense Acceptance Checklist",
    "",
    `Device: ${report.context.device || "none"}`,
    `Foreground package: ${report.context.foregroundPackage || "none"}`,
    `Activation deeplink: ${report.context.activationDeeplink || "none"}`,
    "",
  ];

  for (const [label, resultName] of acceptanceChecklistItems) {
    const item = report.results.find((candidate) => candidate.name === resultName);
    const status = item?.status || "missing";
    const detail = item?.detail ? ` - ${item.detail}` : "";
    lines.push(`- [${status === "pass" ? "x" : " "}] ${label}: ${status}${detail}`);
  }

  lines.push("");
  lines.push("Evidence files to attach when present:");
  lines.push("- preflight-report.json");
  lines.push("- summary.txt");
  lines.push("- activation-deeplink.txt");
  lines.push("- device-window.txt");
  lines.push("- device-logcat.txt");
  lines.push("- device-screenshot.png");
  lines.push("- merchant-foreground-window.txt");
  lines.push("- merchant-foreground-screenshot.png");
  lines.push("- gogosense-hub-window.txt");
  lines.push("- gogosense-hub-screenshot.png");
  lines.push("- activation-deeplink-window.txt");
  lines.push("- activation-deeplink-screenshot.png");
  lines.push("");

  return `${lines.join("\n")}\n`;
}

function writeEvidenceBundle(report, evidenceDir) {
  if (!evidenceDir) return;

  mkdirSync(evidenceDir, { recursive: true });
  writeFileSync(`${evidenceDir}/acceptance-checklist.md`, acceptanceChecklist(report));
  writeFileSync(`${evidenceDir}/preflight-report.json`, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(`${evidenceDir}/summary.txt`, evidenceSummary(report));

  if (report.context.activationDeeplink) {
    writeFileSync(`${evidenceDir}/activation-deeplink.txt`, `${report.context.activationDeeplink}\n`);
  }
}

function commandEvidence(command, result) {
  return [
    `command=${command}`,
    `ok=${result.ok ? "true" : "false"}`,
    `status=${result.status ?? "unknown"}`,
    "--- stdout ---",
    result.stdout || "",
    "--- stderr ---",
    result.stderr || result.error?.message || "",
    "",
  ].join("\n");
}

function writeDeviceEvidenceBundle(report, options) {
  if (!options.evidenceDir || !options.captureDeviceEvidence) return;

  mkdirSync(options.evidenceDir, { recursive: true });

  if (!report.context.device) {
    writeFileSync(`${options.evidenceDir}/device-evidence.txt`, "skipped: no adb device in state=device\n");
    return;
  }

  const deviceOptions = { ...options, device: report.context.device };
  const windowRun = run(options.adb, adbArgs(deviceOptions, ["shell", "dumpsys", "window"]), {
    timeoutMs: 30000,
  });
  writeFileSync(
    `${options.evidenceDir}/device-window.txt`,
    commandEvidence("adb shell dumpsys window", windowRun)
  );

  const logcatRun = run(options.adb, adbArgs(deviceOptions, ["logcat", "-d", "-t", "300"]), {
    timeoutMs: 30000,
  });
  writeFileSync(
    `${options.evidenceDir}/device-logcat.txt`,
    commandEvidence("adb logcat -d -t 300", logcatRun)
  );

  const screenshotRun = runBinary(options.adb, adbArgs(deviceOptions, ["exec-out", "screencap", "-p"]));
  if (screenshotRun.ok && screenshotRun.stdout.length > 0) {
    writeFileSync(`${options.evidenceDir}/device-screenshot.png`, screenshotRun.stdout);
    writeFileSync(`${options.evidenceDir}/device-screenshot.txt`, "command=adb exec-out screencap -p\nok=true\n");
  } else {
    writeFileSync(
      `${options.evidenceDir}/device-screenshot.txt`,
      commandEvidence("adb exec-out screencap -p", {
        ...screenshotRun,
        stdout: "",
      })
    );
  }
}

function catalogResult(merchants, expectedPackages = []) {
  if (merchants.length > 0) {
    return result("pass", "staging merchant catalog", `${merchants.length} merchant(s) returned`);
  }

  if (expectedPackages.length > 0) {
    return result(
      "warn",
      "staging merchant catalog",
      "GET /gogosense/merchants returned []; using --merchant-packages for controlled QA, seed staging before final acceptance"
    );
  }

  return result(
    "fail",
    "staging merchant catalog",
    "GET /gogosense/merchants returned []; seed staging with apps/api gogosense:seed-merchants"
  );
}

function usageAccessResult(appInstalledOk, appops, appPackage) {
  if (!appInstalledOk) {
    return result(
      "fail",
      "Usage Access grant",
      `${appPackage} is not installed; install the GoGoCash dev client before granting Android Usage Access`
    );
  }

  return appops.ok && parseUsageAccess(appops.stdout)
    ? result("pass", "Usage Access grant", appops.stdout)
    : result(
        "fail",
        "Usage Access grant",
        appops.stdout || appops.stderr || `grant with: adb shell appops set ${appPackage} GET_USAGE_STATS allow`
      );
}

function grantUsageAccessResult(appPackage, grantRun) {
  if (grantRun.ok) {
    return result(
      "pass",
      "GoGoCash usage access grant",
      grantRun.stdout || `${appPackage} GET_USAGE_STATS set to allow`
    );
  }

  return result(
    "fail",
    "GoGoCash usage access grant",
    grantRun.stderr ||
      grantRun.stdout ||
      `adb shell appops set ${appPackage} GET_USAGE_STATS allow failed`
  );
}

function supportedMerchantInstallResult(installedMerchantPackages, merchantPackages) {
  if (installedMerchantPackages.length > 0) {
    return result("pass", "supported merchant app installed", installedMerchantPackages.join(", "));
  }

  if (merchantPackages.length === 0) {
    return result(
      "fail",
      "supported merchant app installed",
      "no merchant packages to check; fix the merchant catalog or pass --merchant-packages for controlled QA"
    );
  }

  return result(
    "fail",
    "supported merchant app installed",
    `none installed from: ${merchantPackages.slice(0, 8).join(", ")}${merchantPackages.length > 8 ? ", ..." : ""}`
  );
}

function devClientInstallResult(apkPath, installRun) {
  if (installRun.ok) {
    return result("pass", "GoGoCash dev-client install", installRun.stdout || `installed ${apkPath}`);
  }

  return result(
    "fail",
    "GoGoCash dev-client install",
    installRun.stderr || installRun.stdout || `adb install -r ${apkPath} failed`
  );
}

function merchantApkInstallResult(apkPaths, installRun) {
  if (installRun.ok) {
    return result(
      "pass",
      "supported merchant APK install",
      installRun.stdout || `installed ${apkPaths.length} APK file(s)`
    );
  }

  return result(
    "fail",
    "supported merchant APK install",
    installRun.stderr ||
      installRun.stdout ||
      `adb install-multiple -r ${apkPaths.join(" ")} failed`
  );
}

function merchantLaunchResult(packageName, launchRun) {
  if (launchRun.ok) {
    return result("pass", "supported merchant launch", `${packageName} launcher intent sent`);
  }

  return result(
    "fail",
    "supported merchant launch",
    launchRun.stderr || launchRun.stdout || `adb monkey launch failed for ${packageName}`
  );
}

function gogosenseHubReturnResult(url, appPackage, launchRun) {
  if (launchRun.ok) {
    return result("pass", "GoGoSense hub return", `${url} opened in ${appPackage}`);
  }

  return result(
    "fail",
    "GoGoSense hub return",
    launchRun.stderr || launchRun.stdout || `adb am start failed for ${url}`
  );
}

function writeDeviceCheckpointEvidence(report, options, checkpoint) {
  if (!options.captureDeviceEvidence || !options.evidenceDir || !report.context.device) return;

  const slug = checkpoint
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const adbArgs = (args) => ["-s", report.context.device, ...args];

  mkdirSync(options.evidenceDir, { recursive: true });

  const windowRun = run(options.adb, adbArgs(["shell", "dumpsys", "window"]), { timeout: 30000 });
  writeFileSync(
    `${options.evidenceDir}/${slug}-window.txt`,
    commandEvidence(`${checkpoint}: adb shell dumpsys window`, windowRun)
  );

  const screenshotRun = spawnSync(options.adb, adbArgs(["exec-out", "screencap", "-p"]), {
    encoding: "buffer",
    timeout: 30000,
  });
  const screenshot = {
    error: screenshotRun.error,
    ok: screenshotRun.status === 0 && !screenshotRun.error,
    status: screenshotRun.status ?? 0,
    stderr: screenshotRun.stderr?.toString("utf8") || "",
    stdout: screenshotRun.stdout || Buffer.alloc(0),
  };
  writeFileSync(
    `${options.evidenceDir}/${slug}-screenshot.txt`,
    commandEvidence(`${checkpoint}: adb exec-out screencap -p`, {
      ...screenshot,
      stdout: screenshot.stdout?.length ? `<${screenshot.stdout.length} bytes>` : "",
    })
  );
  if (screenshot.ok && screenshot.stdout?.length) {
    writeFileSync(`${options.evidenceDir}/${slug}-screenshot.png`, screenshot.stdout);
  }
}

async function runPreflight(options) {
  const results = [];
  let activationDeeplink = "";
  let detectionResponse = null;
  const context = {
    adb: options.adb,
    apiUrl: options.apiUrl,
    activationDeeplink,
    appPackage: options.appPackage,
    authTokenPresent: Boolean(options.authToken),
    detectPackage: options.detectPackage || null,
    device: options.device || null,
    foregroundPackage: "",
    installedMerchantPackages: [],
    merchantPackages: [],
  };

  let merchants = [];
  try {
    merchants = await fetchMerchants(options.apiUrl);
    results.push(catalogResult(merchants, options.expectedPackages));
  } catch (error) {
    results.push(result("fail", "staging merchant catalog", error.message));
  }

  context.merchantPackages = options.expectedPackages.length ? [...options.expectedPackages].sort() : merchantPackages(merchants);
  results.push(
    context.merchantPackages.length > 0
      ? result("pass", "merchant Android package list", `${context.merchantPackages.length} package(s)`)
      : result(
          "fail",
          "merchant Android package list",
          "no Android packages found in the merchant catalog; pass --merchant-packages for a controlled QA run"
      )
  );

  if (!options.authToken) {
    results.push(
      result(
        options.requireAuth ? "fail" : "warn",
        "authenticated GoGoSense API",
        "no token provided; set GOGOSENSE_AUTH_TOKEN or pass --auth-token"
      )
    );
  } else {
    try {
      await fetchProtectedJson(options.apiUrl, "/gogosense/settings", options.authToken);
      results.push(result("pass", "authenticated GoGoSense API", "GET /gogosense/settings accepted token"));
    } catch (error) {
      results.push(result("fail", "authenticated GoGoSense API", error.message));
    }

    if (options.detectPackage) {
      try {
        detectionResponse = await fetchProtectedJson(options.apiUrl, "/gogosense/detect", options.authToken, {
          body: JSON.stringify(buildDetectionRequest(options.detectPackage)),
          method: "POST",
        });
        results.push(
          result(
            detectionResponse?.matched ? "pass" : "fail",
            "protected detection probe",
            detectionResponse?.matched
              ? `matched ${detectionResponse.merchantName || detectionResponse.merchantId || options.detectPackage}`
              : `no match for ${options.detectPackage}`
          )
        );
      } catch (error) {
        results.push(result("fail", "protected detection probe", error.message));
      }
    }

    if (options.activate) {
      if (!detectionResponse?.matched) {
        results.push(
          result(
            "fail",
            "protected activation probe",
            options.detectPackage
              ? "requires a matched protected detection probe"
              : "requires --detect-package before activation"
          )
        );
      } else {
        const activationPayload = buildActivationRequest(detectionResponse);
        const payloadErrors = activationPayloadErrors(activationPayload);

        if (payloadErrors.length > 0) {
          results.push(
            result(
              "fail",
              "protected activation probe",
              `detection response missing ${payloadErrors.join(", ")}`
            )
          );
        } else {
          try {
            const activationResponse = await fetchProtectedJson(
              options.apiUrl,
              "/gogosense/activate",
              options.authToken,
              {
                body: JSON.stringify(activationPayload),
                method: "POST",
              }
            );
            activationDeeplink = activationResponse?.deeplink || "";
            results.push(
              result(
                activationDeeplink ? "pass" : "fail",
                "protected activation probe",
                activationDeeplink || "activation response did not include a deeplink"
              )
            );
          } catch (error) {
            results.push(result("fail", "protected activation probe", error.message));
          }
        }
      }
    }
  }

  const adbVersion = run(options.adb, ["version"]);
  if (!adbVersion.ok) {
    results.push(result("fail", "adb available", adbVersion.error?.message || adbVersion.stderr || "adb failed"));
    context.activationDeeplink = activationDeeplink;
    return { context, results };
  }
  results.push(result("pass", "adb available", adbVersion.stdout.split(/\r?\n/)[0] || options.adb));

  const devicesResult = run(options.adb, adbArgs(options, ["devices"]));
  const devices = parseDevices(devicesResult.stdout);
  const usableDevices = devices.filter((device) => device.state === "device");
  if (usableDevices.length === 0) {
    results.push(result("fail", "android device connected", deviceConnectionDetail(devices)));
    context.activationDeeplink = activationDeeplink;
    return { context, results };
  }
  context.device = options.device || usableDevices[0].serial;
  results.push(result("pass", "android device connected", context.device));

  const deviceOptions = { ...options, device: context.device };
  let appInstalled = run(options.adb, adbArgs(deviceOptions, ["shell", "pm", "path", options.appPackage]));
  let appInstalledOk = Boolean(appInstalled.ok && appInstalled.stdout);

  const sha256Outcome = devClientApkSha256Result(options.installApk, options.installApkSha256);
  if (sha256Outcome) {
    results.push(sha256Outcome);
    if (sha256Outcome.status === "fail") return { context, results };
  }

  if (!appInstalledOk && options.installApk) {
    if (!existsSync(options.installApk)) {
      results.push(result("fail", "GoGoCash dev-client install", `APK not found: ${options.installApk}`));
    } else {
      const installRun = run(options.adb, adbArgs(deviceOptions, ["install", "-r", options.installApk]));
      const installOutcome = devClientInstallResult(options.installApk, installRun);
      results.push(installOutcome);
      if (installOutcome.status === "pass") {
        appInstalled = run(options.adb, adbArgs(deviceOptions, ["shell", "pm", "path", options.appPackage]));
        appInstalledOk = Boolean(appInstalled.ok && appInstalled.stdout);
      }
    }
  }

  results.push(
    appInstalledOk
      ? result("pass", "GoGoCash app installed", options.appPackage)
      : result("fail", "GoGoCash app installed", `${options.appPackage} is not installed on ${context.device}`)
  );

  if (appInstalledOk) {
    if (options.grantUsageAccess) {
      const grantRun = run(
        options.adb,
        adbArgs(deviceOptions, ["shell", "appops", "set", options.appPackage, "GET_USAGE_STATS", "allow"])
      );
      results.push(grantUsageAccessResult(options.appPackage, grantRun));
    }
    const appops = run(options.adb, adbArgs(deviceOptions, ["shell", "appops", "get", options.appPackage, "GET_USAGE_STATS"]));
    results.push(usageAccessResult(true, appops, options.appPackage));
  } else {
    results.push(usageAccessResult(false, { ok: false, stdout: "", stderr: "" }, options.appPackage));
  }

  if (options.merchantApks.length > 0) {
    const missingApks = options.merchantApks.filter((apkPath) => !existsSync(apkPath));

    if (missingApks.length > 0) {
      results.push(
        result("fail", "supported merchant APK install", `APK not found: ${missingApks.join(", ")}`)
      );
    } else {
      const installRun = run(
        options.adb,
        adbArgs(deviceOptions, ["install-multiple", "-r", ...options.merchantApks])
      );
      results.push(merchantApkInstallResult(options.merchantApks, installRun));
    }
  }

  const packagesResult = run(options.adb, adbArgs(deviceOptions, ["shell", "pm", "list", "packages"]));
  const installedPackages = parseInstalledPackages(packagesResult.stdout);
  context.installedMerchantPackages = context.merchantPackages.filter((packageName) => installedPackages.has(packageName));
  results.push(supportedMerchantInstallResult(context.installedMerchantPackages, context.merchantPackages));

  if (options.openMerchant) {
    const merchantPackageToOpen = context.installedMerchantPackages[0] || context.merchantPackages[0] || "";
    if (!merchantPackageToOpen) {
      results.push(
        result(
          "fail",
          "supported merchant launch",
          "no merchant package available to launch; pass --merchant-packages or populate the staging catalog"
        )
      );
    } else {
      const launchRun = run(
        options.adb,
        [
          "-s",
          context.device,
          "shell",
          "monkey",
          "-p",
          merchantPackageToOpen,
          "-c",
          "android.intent.category.LAUNCHER",
          "1",
        ],
        { timeout: 15000 }
      );
      results.push(merchantLaunchResult(merchantPackageToOpen, launchRun));
    }
  }

  const foreground = run(options.adb, adbArgs(deviceOptions, ["shell", "dumpsys", "window"]));
  context.foregroundPackage = parseForegroundPackage(foreground.stdout);
  const foregroundSupported = context.installedMerchantPackages.includes(context.foregroundPackage);
  if (foregroundSupported) {
    results.push(result("pass", "foreground merchant app", context.foregroundPackage));
  } else if (options.requireForeground) {
    results.push(
      result(
        "fail",
        "foreground merchant app",
        context.foregroundPackage
          ? `${context.foregroundPackage} is foreground; open a supported merchant app`
          : "could not detect foreground package; open a supported merchant app"
      )
    );
  } else {
    results.push(
      result(
        "warn",
        "foreground merchant app",
        context.foregroundPackage
          ? `${context.foregroundPackage} is foreground; use --require-foreground during final acceptance`
          : "could not detect foreground package; use --require-foreground during final acceptance"
      )
    );
  }

  await waitForCheckpoint(options);
  writeDeviceCheckpointEvidence({ context, results }, options, "merchant-foreground");

  if (options.returnToGogosense) {
    const returnRun = run(
      options.adb,
      [
        "-s",
        context.device,
        "shell",
        "am",
        "start",
        "-a",
        "android.intent.action.VIEW",
        "-d",
        defaultGogosenseUrl,
        options.appPackage,
      ],
      { timeout: 15000 }
    );
    results.push(gogosenseHubReturnResult(defaultGogosenseUrl, options.appPackage, returnRun));
    await waitForCheckpoint(options);
    writeDeviceCheckpointEvidence({ context, results }, options, "gogosense-hub");
  }

  if (options.openDeeplink) {
    if (!activationDeeplink) {
      results.push(result("fail", "activation deeplink open", "activation did not return a deeplink"));
    } else {
      const openRun = run(
        options.adb,
        adbArgs(deviceOptions, [
          "shell",
          "am",
          "start",
          "-a",
          "android.intent.action.VIEW",
          "-d",
          activationDeeplink,
        ])
      );
      results.push(
        openRun.ok
          ? result("pass", "activation deeplink open", activationDeeplink)
          : result(
              "fail",
              "activation deeplink open",
              openRun.error?.message || openRun.stderr || openRun.stdout || "adb am start failed"
            )
      );
      await waitForCheckpoint(options);
      writeDeviceCheckpointEvidence({ context, results }, options, "activation-deeplink");
    }
  }

  context.activationDeeplink = activationDeeplink;
  return { context, results };
}

function printText(report) {
  console.log("GoGoSense Android acceptance preflight");
  console.log(`api=${report.context.apiUrl}`);
  console.log(`adb=${report.context.adb}`);
  console.log(`device=${report.context.device || "(not selected)"}`);
  console.log("");

  for (const item of report.results) {
    const marker = item.status === "pass" ? "PASS" : item.status === "warn" ? "WARN" : "FAIL";
    console.log(`${marker} ${item.name}${item.detail ? ` - ${item.detail}` : ""}`);
  }
}

function printHelp() {
  console.log(`Usage: npm run gogosense:preflight -w apps/app -- [options]

Checks the Android/runtime prerequisites for GoGoSense PRD acceptance.

Options:
  --api-url <url>              API base URL (default: ${defaultApiUrl})
  --adb <path>                 adb executable (default: Android SDK adb or adb on PATH)
  --auth-token <token>         Firebase/backend bearer token for protected GoGoSense API checks
  --capture-device-evidence    With --evidence-dir, capture dumpsys window, logcat, and screencap files
  --checkpoint-delay-ms <ms>    Wait before each checkpoint screenshot capture (default: 0)
  --device <serial>            adb device serial (default: ANDROID_SERIAL or first device)
  --detect-package <package>   Explicitly POST /gogosense/detect for this package
  --evidence-dir <path>        Write preflight-report.json, summary.txt, and activation-deeplink.txt
  --activate                  POST /gogosense/activate after a matched detection probe
  --open-deeplink             Open the activation deeplink on the selected Android device
  --install-apk <path>         Install a GoGoCash Android dev-client APK before device checks if missing
  --install-apk-sha256 <hash>  Verify the dev-client APK SHA-256 before installing it
  --grant-usage-access         Run adb appops set <package> GET_USAGE_STATS allow before permission check
  --app-package <package>      GoGoCash Android package (default: ${defaultAppPackage})
  --merchant-apks <paths>      Comma-separated merchant APK or split APK files to install
  --open-merchant              Launch the first installed/supported merchant package before foreground checks
  --return-to-gogosense        Reopen gogocash://gogosense after merchant foreground proof
  --merchant-packages <list>   Comma-separated merchant packages for controlled QA
  --require-auth               Fail when no auth token is provided
  --require-foreground         Fail unless a supported merchant package is foreground
  --json                       Print machine-readable JSON
`);
}

async function main() {
  const options = parseArgs();
  if (options.help) {
    printHelp();
    return;
  }

  const report = await runPreflight(options);
  writeEvidenceBundle(report, options.evidenceDir);
  writeDeviceEvidenceBundle(report, options);
  if (options.json) console.log(JSON.stringify(report, null, 2));
  else printText(report);

  if (report.results.some((item) => item.status === "fail")) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}

export {
  activationPayloadErrors,
  acceptanceChecklist,
  buildActivationRequest,
  buildDetectionRequest,
  catalogResult,
  deviceConnectionDetail,
  devClientApkSha256Result,
  devClientInstallResult,
  findDefaultAdb,
  merchantPackages,
  merchantCatalogFetchError,
  parseArgs,
  parseDevices,
  parseForegroundPackage,
  parseInstalledPackages,
  parseUsageAccess,
  runPreflight,
  supportedMerchantInstallResult,
  usageAccessResult,
  writeEvidenceBundle,
  writeDeviceEvidenceBundle,
};
