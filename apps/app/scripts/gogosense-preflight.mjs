#!/usr/bin/env node
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const defaultApiUrl = "https://api-staging.gogocash.co";
const defaultAppPackage = "co.gogocash.app";
const merchantCatalogPath = "/gogosense/merchants";

function splitList(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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
    authToken: env.GOGOSENSE_AUTH_TOKEN || "",
    device: env.ANDROID_SERIAL || "",
    detectPackage: env.GOGOSENSE_DETECT_PACKAGE || "",
    installApk: env.GOGOSENSE_DEV_CLIENT_APK || "",
    expectedPackages: splitList(env.GOGOSENSE_MERCHANT_PACKAGES || ""),
    help: false,
    json: false,
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
    else if (arg === "--auth-token") options.authToken = next();
    else if (arg === "--device") options.device = next();
    else if (arg === "--detect-package") options.detectPackage = next();
    else if (arg === "--install-apk") options.installApk = next();
    else if (arg === "--merchant-packages") options.expectedPackages = splitList(next());
    else if (arg === "--json") options.json = true;
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

async function runPreflight(options) {
  const results = [];
  const context = {
    adb: options.adb,
    apiUrl: options.apiUrl,
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
        const response = await fetchProtectedJson(options.apiUrl, "/gogosense/detect", options.authToken, {
          body: JSON.stringify(buildDetectionRequest(options.detectPackage)),
          method: "POST",
        });
        results.push(
          result(
            response?.matched ? "pass" : "fail",
            "protected detection probe",
            response?.matched
              ? `matched ${response.merchantName || response.merchantId || options.detectPackage}`
              : `no match for ${options.detectPackage}`
          )
        );
      } catch (error) {
        results.push(result("fail", "protected detection probe", error.message));
      }
    }
  }

  const adbVersion = run(options.adb, ["version"]);
  if (!adbVersion.ok) {
    results.push(result("fail", "adb available", adbVersion.error?.message || adbVersion.stderr || "adb failed"));
    return { context, results };
  }
  results.push(result("pass", "adb available", adbVersion.stdout.split(/\r?\n/)[0] || options.adb));

  const devicesResult = run(options.adb, adbArgs(options, ["devices"]));
  const devices = parseDevices(devicesResult.stdout);
  const usableDevices = devices.filter((device) => device.state === "device");
  if (usableDevices.length === 0) {
    results.push(result("fail", "android device connected", "no adb device in state=device"));
    return { context, results };
  }
  context.device = options.device || usableDevices[0].serial;
  results.push(result("pass", "android device connected", context.device));

  const deviceOptions = { ...options, device: context.device };
  let appInstalled = run(options.adb, adbArgs(deviceOptions, ["shell", "pm", "path", options.appPackage]));
  let appInstalledOk = Boolean(appInstalled.ok && appInstalled.stdout);

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
    const appops = run(options.adb, adbArgs(deviceOptions, ["shell", "appops", "get", options.appPackage, "GET_USAGE_STATS"]));
    results.push(usageAccessResult(true, appops, options.appPackage));
  } else {
    results.push(usageAccessResult(false, { ok: false, stdout: "", stderr: "" }, options.appPackage));
  }

  const packagesResult = run(options.adb, adbArgs(deviceOptions, ["shell", "pm", "list", "packages"]));
  const installedPackages = parseInstalledPackages(packagesResult.stdout);
  context.installedMerchantPackages = context.merchantPackages.filter((packageName) => installedPackages.has(packageName));
  results.push(supportedMerchantInstallResult(context.installedMerchantPackages, context.merchantPackages));

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
  --device <serial>            adb device serial (default: ANDROID_SERIAL or first device)
  --detect-package <package>   Explicitly POST /gogosense/detect for this package
  --install-apk <path>         Install a GoGoCash Android dev-client APK before device checks if missing
  --app-package <package>      GoGoCash Android package (default: ${defaultAppPackage})
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
  buildDetectionRequest,
  catalogResult,
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
};
