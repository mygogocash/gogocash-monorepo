#!/usr/bin/env node
/**
 * Fails if total size of .next/static/chunks (recursive) exceeds scripts/perf-budget.json.
 * Run after `next build`.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const budgetPath = path.join(__dirname, "perf-budget.json");
const chunksDir = path.join(root, ".next", "static", "chunks");

async function totalBytes(dir) {
  let sum = 0;
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (e) {
    if (/** @type {NodeJS.ErrnoException} */ (e).code === "ENOENT") {
      console.error(
        "check-bundle-budget: .next/static/chunks not found. Run `npm run build` first.",
      );
      process.exit(1);
    }
    throw e;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      sum += await totalBytes(p);
    } else {
      const st = await fs.stat(p);
      sum += st.size;
    }
  }
  return sum;
}

const budget = JSON.parse(await fs.readFile(budgetPath, "utf8"));
const max = budget.maxTotalStaticChunksBytes;
if (typeof max !== "number") {
  console.error("check-bundle-budget: maxTotalStaticChunksBytes missing in perf-budget.json");
  process.exit(1);
}

const bytes = await totalBytes(chunksDir);
const mb = (bytes / (1024 * 1024)).toFixed(2);
const maxMb = (max / (1024 * 1024)).toFixed(2);

if (bytes > max) {
  console.error(
    `Bundle budget exceeded: ${bytes} bytes (${mb} MiB) > ${max} bytes (${maxMb} MiB). See docs/performance/RUNBOOK.md`,
  );
  process.exit(1);
}

console.log(`Bundle budget OK: ${bytes} bytes (${mb} MiB) ≤ ${max} bytes (${maxMb} MiB)`);
process.exit(0);
