#!/usr/bin/env node
/**
 * Download PNGs from Figma MCP export URLs (nodeId → url map) into docs/assets/brand-logos/.
 * Usage: node download-from-export-urls.mjs entries.json export-urls.json
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const OUTPUT_ROOT = path.join(REPO_ROOT, "docs/assets/brand-logos");

const ADMIN_FIELDS = {
  "default-shop-card": "logo_desktop",
  "default-shop-card-cover": "logo_desktop (cover art)",
  "logo-circle": "logo_circle",
  "shop-page-banner": "banner",
};

const SIZES = {
  "default-shop-card": "264×148.5",
  "default-shop-card-cover": "264×148.5",
  "logo-circle": "144×144",
  "shop-page-banner": "1200×410",
};

async function downloadUrl(url, destPath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed (${response.status}): ${url}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.mkdir(path.dirname(destPath), { recursive: true });
  await fs.writeFile(destPath, buffer);
}

const [entriesPath, urlsPath] = process.argv.slice(2);
if (!entriesPath || !urlsPath) {
  console.error("Usage: node download-from-export-urls.mjs entries.json export-urls.json");
  process.exit(1);
}

const entries = JSON.parse(await fs.readFile(entriesPath, "utf8"));
const urlMap = JSON.parse(await fs.readFile(urlsPath, "utf8"));

const manifestRows = [];
let saved = 0;

for (const entry of entries) {
  const url = urlMap[entry.nodeId];
  if (!url) {
    console.warn(`skip ${entry.nodeId} — no export URL`);
    continue;
  }

  const relativePath = path.join(entry.slug, entry.category, "logo.png");
  await downloadUrl(url, path.join(OUTPUT_ROOT, relativePath));
  saved += 1;
  console.log(`saved ${relativePath}`);

  manifestRows.push({
    brand: entry.brand,
    slug: entry.slug,
    category: entry.category,
    figmaNodeId: entry.nodeId,
    figmaName: entry.name,
    relativePath: `docs/assets/brand-logos/${relativePath}`,
    adminField: ADMIN_FIELDS[entry.category] ?? null,
    size: SIZES[entry.category] ?? null,
  });
}

await fs.mkdir(OUTPUT_ROOT, { recursive: true });
await fs.writeFile(
  path.join(OUTPUT_ROOT, "manifest.json"),
  `${JSON.stringify(manifestRows, null, 2)}\n`,
  "utf8",
);

console.log(`\nDone. ${saved} files under docs/assets/brand-logos/`);
