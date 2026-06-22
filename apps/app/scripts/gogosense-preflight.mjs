#!/usr/bin/env node
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const defaultApiUrl = "https://api-staging.gogocash.co";
const defaultAppPackage = "co.gogocash.app";

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
    device: env.ANDROID_SERIAL || "",
    expectedPackages: splitList(env.GOGOSENSE_MERCHANT_PACKAGES || ""),
    help: false,
    json: false,
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
    else if (arg === "--device") options.device = next();
    else if (arg === "--merchant-packages") options.expectedPackages = splitList(next());
    else if (arg === "--json") options.json = true;
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
  const response = await fetch(`${apiUrl}/gogosense/merchants`, {
    headers: { accept: "application/json" },
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`GET /gogosense/merchants returned ${response.status}: ${text.slice(0, 200)}`);
  }

  try {
    const payload = JSON.parse(text);
    return Array.isArray(payload) ? payload : [];
  } catch (error) {
    throw new Error(`GET /gogosense/merchants returned invalid JSON: ${error.message}`);
  }
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

async function runPreflight(options) {
  const results = [];
  const context = {
    adb: options.adb,
    apiUrl: options.apiUrl,
    appPackage: options.appPackage,
    device: options.device || null,
    foregroundPackage: "",
    installedMerchantPackages: [],
    merchantPackages: [],
  };

  let merchants = [];
  try {
    merchants = await fetchMerchants(options.apiUrl);
    results.push(
      merchants.length > 0
        ? result("pass", "staging merchant catalog", `${merchants.length} merchant(s) returned`)
        : result(
            "fail",
            "staging merchant catalog",
            "GET /gogosense/merchants returned []; seed staging with apps/api gogosense:seed-merchants"
          )
    );
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
  const appInstalled = run(options.adb, adbArgs(deviceOptions, ["shell", "pm", "path", options.appPackage]));
  results.push(
    appInstalled.ok && appInstalled.stdout
      ? result("pass", "GoGoCash app installed", options.appPackage)
      : result("fail", "GoGoCash app installed", `${options.appPackage} is not installed on ${context.device}`)
  );

  const appops = run(options.adb, adbArgs(deviceOptions, ["shell", "appops", "get", options.appPackage, "GET_USAGE_STATS"]));
  results.push(
    appops.ok && parseUsageAccess(appops.stdout)
      ? result("pass", "Usage Access grant", appops.stdout)
      : result(
          "fail",
          "Usage Access grant",
          appops.stdout || appops.stderr || `grant with: adb shell appops set ${options.appPackage} GET_USAGE_STATS allow`
        )
  );

  const packagesResult = run(options.adb, adbArgs(deviceOptions, ["shell", "pm", "list", "packages"]));
  const installedPackages = parseInstalledPackages(packagesResult.stdout);
  context.installedMerchantPackages = context.merchantPackages.filter((packageName) => installedPackages.has(packageName));
  results.push(
    context.installedMerchantPackages.length > 0
      ? result("pass", "supported merchant app installed", context.installedMerchantPackages.join(", "))
      : result(
          "fail",
          "supported merchant app installed",
          `none installed from: ${context.merchantPackages.slice(0, 8).join(", ")}${context.merchantPackages.length > 8 ? ", ..." : ""}`
        )
  );

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
  --device <serial>            adb device serial (default: ANDROID_SERIAL or first device)
  --app-package <package>      GoGoCash Android package (default: ${defaultAppPackage})
  --merchant-packages <list>   Comma-separated merchant packages for controlled QA
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
  findDefaultAdb,
  merchantPackages,
  parseArgs,
  parseDevices,
  parseForegroundPackage,
  parseInstalledPackages,
  parseUsageAccess,
  runPreflight,
};
