#!/usr/bin/env node
/** Re-derive export-pending.json from .entries.json minus export-urls.json keys. */
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

const pending = entries.filter((e) => !urlMap[e.nodeId]);
await fs.writeFile(
  path.join(__dirname, "export-pending.json"),
  `${JSON.stringify(pending, null, 2)}\n`,
  "utf8",
);
console.log(
  JSON.stringify({
    total: entries.length,
    done: Object.keys(urlMap).length,
    pending: pending.length,
  }),
);
