#!/usr/bin/env node
/**
 * Ensures locale JSON catalogs stay aligned where we maintain full parity (en ↔ th).
 * `jp.json` is a partial catalog — we only warn when keys exist in en but not jp.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const messagesDir = join(root, "src", "messages");

function load(name) {
  const raw = readFileSync(join(messagesDir, name), "utf8");
  return JSON.parse(raw);
}

function keySet(obj) {
  return new Set(Object.keys(obj));
}

function reportMissing(label, missing) {
  if (missing.length === 0) return;
  console.error(`\n${label} (${missing.length}):`);
  const max = 40;
  for (const k of missing.slice(0, max)) {
    console.error(`  - ${k}`);
  }
  if (missing.length > max) {
    console.error(`  … and ${missing.length - max} more`);
  }
}

const en = load("en.json");
const th = load("th.json");
const jp = load("jp.json");

const enKeys = keySet(en);
const thKeys = keySet(th);
const jpKeys = keySet(jp);

const missingInTh = [...enKeys].filter((k) => !thKeys.has(k));
const extraInTh = [...thKeys].filter((k) => !enKeys.has(k));
const missingInEnFromTh = extraInTh;

let exitCode = 0;

if (missingInTh.length > 0 || missingInEnFromTh.length > 0) {
  console.error("i18n parity check failed: en.json and th.json must have identical key sets.");
  reportMissing("Missing in th.json (present in en)", missingInTh);
  reportMissing("Missing in en.json (present in th)", missingInEnFromTh);
  exitCode = 1;
} else {
  console.log("i18n: en.json ↔ th.json key parity OK (%d keys).", enKeys.size);
}

const missingInJp = [...enKeys].filter((k) => !jpKeys.has(k));
if (missingInJp.length > 0) {
  console.warn(
    "\ni18n note: jp.json is missing %d keys present in en.json (partial locale is allowed).",
    missingInJp.length
  );
}

process.exit(exitCode);
