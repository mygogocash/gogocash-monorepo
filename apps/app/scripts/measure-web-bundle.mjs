#!/usr/bin/env node
/**
 * Wave 0 — measure the Expo web export JS payload and refresh the committed baseline.
 *
 * Usage:
 *   npm --prefix apps/app run measure:bundle
 *
 * Requires a prior `expo export --platform web` (this script runs one if OUTPUT_DIR is missing).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, "..");
const baselinePath = path.join(appRoot, "scripts/baselines/web-bundle-baseline.json");
const outputDir = process.env.BUNDLE_MEASURE_OUTPUT_DIR ?? path.join(appRoot, ".bundle-measure");

function ensureWebExport() {
  const jsRoot = path.join(outputDir, "_expo/static/js");
  if (fs.existsSync(jsRoot)) {
    return;
  }

  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`Exporting web bundle to ${outputDir}…`);
  const result = spawnSync(
    "npx",
    ["expo", "export", "--platform", "web", "--output-dir", outputDir],
    { cwd: appRoot, stdio: "inherit", env: { ...process.env, NODE_PATH: "./node_modules" } }
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function walkJsFiles(dir, files = []) {
  if (!fs.existsSync(dir)) {
    return files;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkJsFiles(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(fullPath);
    }
  }

  return files;
}

function measureBundle() {
  const jsRoot = path.join(outputDir, "_expo/static/js");
  const jsFiles = walkJsFiles(jsRoot);
  const chunks = jsFiles
    .map((filePath) => {
      const stats = fs.statSync(filePath);
      return {
        bytes: stats.size,
        path: path.relative(outputDir, filePath),
      };
    })
    .sort((left, right) => right.bytes - left.bytes);

  const totalJsBytes = chunks.reduce((sum, chunk) => sum + chunk.bytes, 0);

  return {
    measuredAt: new Date().toISOString(),
    outputDir: path.relative(appRoot, outputDir),
    platform: "web",
    topChunks: chunks.slice(0, 12),
    totalJsBytes,
    totalJsFiles: chunks.length,
  };
}

function main() {
  ensureWebExport();
  const report = measureBundle();

  fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
  fs.writeFileSync(baselinePath, `${JSON.stringify(report, null, 2)}\n`);

  const mb = (report.totalJsBytes / (1024 * 1024)).toFixed(2);
  console.log(`Web JS total: ${mb} MB (${report.totalJsFiles} files)`);
  console.log(`Baseline written to ${path.relative(appRoot, baselinePath)}`);
}

main();
