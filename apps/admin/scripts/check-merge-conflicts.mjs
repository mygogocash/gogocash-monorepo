#!/usr/bin/env node
/**
 * Fails the build if Git merge conflict markers remain in source files.
 * Prevents "Expression expected" / parse errors from <<<<<<< HEAD in TS/TSX.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "src");

const exts = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const name = ent.name;
    if (name === "node_modules" || name === ".next") continue;
    const full = path.join(dir, name);
    if (ent.isDirectory()) walk(full, files);
    else if (exts.has(path.extname(name))) files.push(full);
  }
  return files;
}

const offenders = [];
for (const file of walk(root)) {
  const text = fs.readFileSync(file, "utf8");
  if (text.includes("<<<<<<<")) offenders.push(path.relative(path.join(__dirname, ".."), file));
}

if (offenders.length > 0) {
  console.error("\nMerge conflict markers (<<<<<<<) found in:\n");
  offenders.forEach((f) => console.error(`  - ${f}`));
  console.error("\nResolve conflicts, remove <<<<<<< / ======= / >>>>>>> lines, then rebuild.\n");
  process.exit(1);
}
