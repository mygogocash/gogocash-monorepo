#!/usr/bin/env node
/**
 * Export pending brand logo nodeIds via Figma REST API (batch 40) and merge into export-urls.json.
 * Loads FIGMA_ACCESS_TOKEN from env or repo-root .env.local.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const FILE_KEY = "3ICE2VHGMZqzTRweq3vCMI";
const BATCH_SIZE = 40;
const SLEEP_MS = 2000;

async function loadToken() {
  if (process.env.FIGMA_ACCESS_TOKEN?.trim()) return process.env.FIGMA_ACCESS_TOKEN.trim();
  try {
    const raw = await fs.readFile(path.join(REPO_ROOT, ".env.local"), "utf8");
    const match = raw.match(/^FIGMA_ACCESS_TOKEN=(.+)$/m);
    if (match) return match[1].trim().replace(/^['"]|['"]$/g, "");
  } catch {
    /* optional */
  }
  throw new Error("Missing FIGMA_ACCESS_TOKEN");
}

async function figmaExportImages(token, nodeIds, scale = 2) {
  const ids = nodeIds.join(",");
  const response = await fetch(
    `https://api.figma.com/v1/images/${FILE_KEY}?ids=${encodeURIComponent(ids)}&format=png&scale=${scale}`,
    { headers: { "X-Figma-Token": token } },
  );
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`Figma API ${response.status}: ${payload.err ?? JSON.stringify(payload)}`);
  }
  if (payload.err) throw new Error(`Figma export error: ${payload.err}`);
  return payload.images ?? {};
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const token = await loadToken();
const entries = JSON.parse(await fs.readFile(path.join(__dirname, ".entries.json"), "utf8"));
let urlMap = {};
try {
  urlMap = JSON.parse(await fs.readFile(path.join(__dirname, "export-urls.json"), "utf8"));
} catch {
  /* empty */
}

const pending = entries.filter((e) => !urlMap[e.nodeId]).map((e) => e.nodeId);
if (pending.length === 0) {
  console.log(JSON.stringify({ merged: 0, total: Object.keys(urlMap).length, pending: 0 }));
  process.exit(0);
}

let merged = 0;
for (let i = 0; i < pending.length; i += BATCH_SIZE) {
  const batch = pending.slice(i, i + BATCH_SIZE);
  const images = await figmaExportImages(token, batch);
  for (const [nodeId, url] of Object.entries(images)) {
    if (url) {
      urlMap[nodeId] = url;
      merged += 1;
    } else {
      console.warn(`no URL for ${nodeId}`);
    }
  }
  console.log(`batch ${Math.floor(i / BATCH_SIZE) + 1}: exported ${Object.keys(images).length}`);
  if (i + BATCH_SIZE < pending.length) await sleep(SLEEP_MS);
}

await fs.writeFile(path.join(__dirname, "export-urls.json"), `${JSON.stringify(urlMap, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ merged, total: Object.keys(urlMap).length, pending: pending.length - merged }));
