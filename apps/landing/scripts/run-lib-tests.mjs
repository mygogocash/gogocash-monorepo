#!/usr/bin/env node
/**
 * Collects all TypeScript unit tests under lib/ (files named *.test.ts) and runs
 * them with Node's test runner plus tsx. Avoids broken quoted glob arguments in npm scripts.
 */
import { spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function collectTestFiles(dir) {
  /** @type {string[]} */
  const out = [];
  for (const name of readdirSync(dir)) {
    const abs = path.join(dir, name);
    if (statSync(abs).isDirectory()) {
      out.push(...collectTestFiles(abs));
    } else if (name.endsWith(".test.ts")) {
      out.push(abs);
    }
  }
  return out;
}

const libDir = path.join(REPO_ROOT, "lib");
const files = collectTestFiles(libDir);
if (files.length === 0) {
  console.error("run-lib-tests: no *.test.ts files found under lib/");
  process.exit(1);
}

const r = spawnSync(process.execPath, ["--import", "tsx", "--test", ...files], {
  stdio: "inherit",
  cwd: REPO_ROOT,
  env: process.env,
});
process.exit(r.status ?? 1);
