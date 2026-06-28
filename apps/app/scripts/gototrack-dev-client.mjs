#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findDefaultAdb, parseDevices } from "./gototrack-preflight.mjs";

const defaultHost = "localhost";
const defaultMetroPort = "8081";

export function buildExpoArgs({ host = defaultHost, port = defaultMetroPort } = {}) {
  return ["start", "--dev-client", "--host", host, "--port", String(port), "--clear"];
}

export function buildExpoEnv(env = process.env, cwd = process.cwd()) {
  const nodeOptions = new Set(
    String(env.NODE_OPTIONS ?? "")
      .split(/\s+/)
      .filter(Boolean)
  );
  nodeOptions.add("--dns-result-order=ipv4first");

  return {
    ...env,
    NODE_PATH: env.NODE_PATH || resolve(cwd, "node_modules"),
    NODE_OPTIONS: [...nodeOptions].join(" "),
  };
}

export function adbReverseArgs(port = defaultMetroPort) {
  return ["reverse", `tcp:${port}`, `tcp:${port}`];
}

export function adbReverseDeviceArgs(serial, port = defaultMetroPort) {
  return ["-s", serial, ...adbReverseArgs(port)];
}

export function isConnectedAdbDevice(device) {
  return (device.state ?? device.status) === "device";
}

export function configureAdbReverse({
  adb = findDefaultAdb(),
  port = defaultMetroPort,
  logger = console,
} = {}) {
  const devicesResult = spawnSync(adb, ["devices"], { encoding: "utf8" });
  if (devicesResult.error || devicesResult.status !== 0) {
    logger.warn?.(
      `[gototrack:dev-client] adb unavailable; skipping reverse tcp:${port}. ${devicesResult.error?.message ?? devicesResult.stderr ?? ""}`.trim()
    );
    return { adb, port, reversed: [], skipped: true };
  }

  const devices = parseDevices(devicesResult.stdout).filter(isConnectedAdbDevice);
  if (devices.length === 0) {
    logger.warn?.(`[gototrack:dev-client] no Android device connected; skipping reverse tcp:${port}`);
    return { adb, port, reversed: [], skipped: true };
  }

  const reversed = [];
  for (const device of devices) {
    const reverseResult = spawnSync(adb, adbReverseDeviceArgs(device.serial, port), { encoding: "utf8" });
    if (reverseResult.error || reverseResult.status !== 0) {
      logger.warn?.(
        `[gototrack:dev-client] failed to reverse tcp:${port} on ${device.serial}: ${reverseResult.error?.message ?? reverseResult.stderr ?? ""}`.trim()
      );
      continue;
    }
    reversed.push(device.serial);
    logger.log?.(`[gototrack:dev-client] adb reverse tcp:${port} configured for ${device.serial}`);
  }

  return { adb, port, reversed, skipped: reversed.length === 0 };
}

export function startExpo({ host = defaultHost, port = defaultMetroPort, env = process.env, cwd = process.cwd() } = {}) {
  return spawn("expo", buildExpoArgs({ host, port }), {
    cwd,
    env: buildExpoEnv(env, cwd),
    stdio: "inherit",
    shell: process.platform === "win32",
  });
}

function main() {
  const port = process.env.GOGOSENSE_METRO_PORT || defaultMetroPort;
  const host = process.env.GOGOSENSE_METRO_HOST || defaultHost;

  configureAdbReverse({ port });

  const child = startExpo({ host, port });
  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exitCode = code ?? 0;
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
