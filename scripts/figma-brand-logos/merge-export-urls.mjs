#!/usr/bin/env node
/** Merge nodeId→url pairs into export-urls.json (incremental progress). */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const urlsPath = path.join(__dirname, "export-urls.json");

const patch = JSON.parse(process.argv[2] ?? "{}");
let existing = {};
try {
  existing = JSON.parse(await fs.readFile(urlsPath, "utf8"));
} catch {
  /* first write */
}
const merged = { ...existing, ...patch };
await fs.writeFile(urlsPath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
console.log(`merged ${Object.keys(patch).length} → total ${Object.keys(merged).length}`);
