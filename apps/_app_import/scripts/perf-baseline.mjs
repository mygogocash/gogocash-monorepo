#!/usr/bin/env node
/**
 * Summarize .next/static/chunks size after `next build`.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const chunksDir = path.join(__dirname, "..", ".next", "static", "chunks");

async function totalBytes(dir) {
  let sum = 0;
  const entries = await fs.readdir(dir, { withFileTypes: true });
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

try {
  const bytes = await totalBytes(chunksDir);
  const mb = (bytes / (1024 * 1024)).toFixed(2);
  console.log(`[perf-baseline] .next/static/chunks total: ${bytes} bytes (${mb} MiB)`);
  console.log("[perf-baseline] Next: npm run analyze — inspect routes; Lighthouse — see docs/performance/RUNBOOK.md");
} catch (e) {
  if (/** @type {NodeJS.ErrnoException} */ (e).code === "ENOENT") {
    console.error("[perf-baseline] Run `npm run build` first (no .next/static/chunks).");
    process.exit(1);
  }
  throw e;
}
