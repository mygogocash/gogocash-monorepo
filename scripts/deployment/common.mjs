import { appendFileSync, readFileSync } from "node:fs";

export function requiredEnv(name, { trim = true } = {}) {
  const raw = process.env[name];
  if (typeof raw !== "string") {
    throw new Error(`${name} is required.`);
  }
  const value = trim ? raw.trim() : raw;
  if (!value) {
    throw new Error(`${name} is required and must not be blank.`);
  }
  return value;
}

export function appendLine(path, line) {
  if (!path) throw new Error("Required GitHub output path is missing.");
  appendFileSync(path, `${line}\n`);
}

export function appendLines(path, lines) {
  if (!path) throw new Error("Required GitHub output path is missing.");
  appendFileSync(path, `${lines.join("\n")}\n`);
}

export function readJsonFile(path, label) {
  let raw;
  try {
    raw = readFileSync(path, "utf8").trim();
  } catch {
    throw new Error(`${label} could not be read.`);
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`${label} is not valid JSON.`);
  }
}

export function safeScalar(
  value,
  label,
  pattern = /^[A-Za-z0-9._:+()-]{1,255}$/,
) {
  if (
    typeof value !== "string" ||
    /[\r\n]/.test(value) ||
    !pattern.test(value)
  ) {
    throw new Error(`${label} is missing or unsafe.`);
  }
  return value;
}

export function httpsUrl(value, label, expectedOrigin) {
  if (typeof value !== "string" || /[\r\n]/.test(value)) {
    throw new Error(`${label} is missing or unsafe.`);
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} is not a valid URL.`);
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (expectedOrigin && url.origin !== expectedOrigin)
  ) {
    throw new Error(`${label} is not a trusted HTTPS URL.`);
  }
  return url.href;
}

export function failClosedMain(main) {
  Promise.resolve()
    .then(main)
    .catch((error) => {
      const message =
        error instanceof Error ? error.message : "Unknown validator failure.";
      console.error(`::error::${message}`);
      process.exitCode = 1;
    });
}
