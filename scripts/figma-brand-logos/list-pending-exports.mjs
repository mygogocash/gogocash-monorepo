#!/usr/bin/env node
/**
 * List pending nodeIds for Figma MCP export (not yet in export-urls.json).
 * Usage: node list-pending-exports.mjs [batchSize] [offset]
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const entries = JSON.parse(await fs.readFile(path.join(__dirname, ".entries.json"), "utf8"));
let urlMap = {};
try {
  urlMap = JSON.parse(await fs.readFile(path.join(__dirname, "export-urls.json"), "utf8"));
} catch {
  /* empty */
}

const pending = entries.filter((e) => !urlMap[e.nodeId]).map((e) => e.nodeId);
const batchSize = Number(process.argv[2] ?? 20);
const offset = Number(process.argv[3] ?? 0);
const batch = pending.slice(offset, offset + batchSize);

console.log(JSON.stringify({ total: entries.length, done: Object.keys(urlMap).length, pending: pending.length, batch }));
