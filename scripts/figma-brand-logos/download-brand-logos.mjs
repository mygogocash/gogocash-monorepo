#!/usr/bin/env node
/**
 * Download merchant brand logos from the Figma "Merchant Brands logo redesigned" file.
 * Assets are grouped by brand slug and size category (matches admin offer media fields).
 *
 * Requires: FIGMA_ACCESS_TOKEN (Personal access token from Figma → Settings → Security)
 *
 * Usage:
 *   FIGMA_ACCESS_TOKEN=figd_... node scripts/figma-brand-logos/download-brand-logos.mjs
 *   FIGMA_ACCESS_TOKEN=figd_... node scripts/figma-brand-logos/download-brand-logos.mjs --dry-run
 *
 * Output layout:
 *   docs/assets/brand-logos/{slug}/default-shop-card/logo.png       (264×148.5, Cover=False)
 *   docs/assets/brand-logos/{slug}/default-shop-card-cover/logo.png (264×148.5, Cover=True)
 *   docs/assets/brand-logos/{slug}/logo-circle/logo.png             (144×144)
 *   docs/assets/brand-logos/{slug}/shop-page-banner/logo.png        (1200×410)
 *
 * Figma file: https://www.figma.com/design/3ICE2VHGMZqzTRweq3vCMI/Merchant-Brands-logo-redesigned?node-id=1-2
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const OUTPUT_ROOT = path.join(REPO_ROOT, "docs/assets/brand-logos");

const FILE_KEY = "3ICE2VHGMZqzTRweq3vCMI";
const PAGE_NODE_ID = "1:2";

/** Frame / component roots inside the Brand Logo page (from Figma metadata). */
const CATEGORY_FRAMES = {
  "default-shop-card": {
    frameNodeIds: new Set(["31:469"]),
    matchName: (name) => /^Brand=/.test(name) && name.includes("Cover=False"),
    adminField: "logo_desktop",
    size: "264×148.5",
  },
  "default-shop-card-cover": {
    frameNodeIds: new Set(["31:469"]),
    matchName: (name) => /^Brand=/.test(name) && name.includes("Cover=True"),
    adminField: "logo_desktop (cover art)",
    size: "264×148.5",
  },
  "logo-circle": {
    frameNodeIds: new Set(["15:170"]),
    matchName: (name) => /^Brand=/.test(name),
    adminField: "logo_circle",
    size: "144×144",
  },
};

const SHOP_BANNER_COMPONENT_NAME = "Logo Banner for Shop Page";
const SHOP_BANNER_SIZE = "1200×410";

const dryRun = process.argv.includes("--dry-run");
const metadataXmlArg = process.argv.find((arg) => arg.startsWith("--metadata-xml="));
const metadataXmlPath = metadataXmlArg?.slice("--metadata-xml=".length);

async function loadEnvLocalToken() {
  const envLocalPath = path.join(REPO_ROOT, ".env.local");
  try {
    const raw = await fs.readFile(envLocalPath, "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^FIGMA_ACCESS_TOKEN=(.+)$/);
      if (match) {
        return match[1].trim().replace(/^['"]|['"]$/g, "");
      }
    }
  } catch {
    // optional file
  }
  return undefined;
}

const token = (process.env.FIGMA_ACCESS_TOKEN ?? (await loadEnvLocalToken()))?.trim();

if (!token) {
  console.error(
    "Missing FIGMA_ACCESS_TOKEN. Set env var or add FIGMA_ACCESS_TOKEN=... to repo-root .env.local (use Figma Copy — screenshots truncate the token).",
  );
  process.exit(1);
}

async function figmaGet(apiPath) {
  const response = await fetch(`https://api.figma.com/v1${apiPath}`, {
    headers: { "X-Figma-Token": token },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Figma API ${apiPath} failed (${response.status}): ${body}`);
  }

  return response.json();
}

function parseBrandFromSymbolName(name) {
  const match = name.match(/^Brand=([^,]+)/);
  return match?.[1]?.trim() ?? null;
}

function slugifyBrand(brandLabel) {
  return brandLabel
    .replace(/\s*-\s*CPS$/i, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_");
}

/** Walk document tree; record SYMBOL/INSTANCE nodes with ancestor frame ids. */
function walkNodes(node, ancestorFrameIds, entries, shopBannerInstances) {
  const nextAncestors = new Set(ancestorFrameIds);
  if (node.type === "FRAME" || node.type === "COMPONENT" || node.type === "COMPONENT_SET") {
    nextAncestors.add(node.id);
  }

  if (node.type === "SYMBOL" || node.type === "COMPONENT") {
    for (const [category, config] of Object.entries(CATEGORY_FRAMES)) {
      const inFrame = [...config.frameNodeIds].some((frameId) => nextAncestors.has(frameId));
      if (inFrame && config.matchName(node.name)) {
        const brand = parseBrandFromSymbolName(node.name);
        if (brand) {
          entries.push({ nodeId: node.id, category, brand, slug: slugifyBrand(brand), name: node.name });
        }
      }
    }
  }

  if (node.type === "INSTANCE" && node.name === SHOP_BANNER_COMPONENT_NAME) {
    const brand =
      readBrandFromInstanceProperties(node) ??
      readBrandFromParentContext(node, ancestorFrameIds);
    shopBannerInstances.push({
      nodeId: node.id,
      category: "shop-page-banner",
      brand: brand ?? "unknown",
      slug: brand ? slugifyBrand(brand) : `unknown_${node.id.replace(":", "_")}`,
      name: node.name,
    });
  }

  for (const child of node.children ?? []) {
    walkNodes(child, nextAncestors, entries, shopBannerInstances);
  }
}

function readBrandFromInstanceProperties(node) {
  const props = node.componentProperties ?? {};
  for (const [key, value] of Object.entries(props)) {
    if (/brand/i.test(key) && typeof value === "object" && value !== null && "value" in value) {
      const raw = String(value.value ?? "").trim();
      if (raw) return raw;
    }
  }
  return null;
}

/** Some banner instances sit near a labeled row — fall back to sibling text if present later. */
function readBrandFromParentContext(_node, _ancestorFrameIds) {
  return null;
}

async function exportImages(nodeIds, scale = 2) {
  const images = {};
  const batchSize = 40;

  for (let i = 0; i < nodeIds.length; i += batchSize) {
    const batch = nodeIds.slice(i, i + batchSize);
    const ids = batch.join(",");
    const payload = await figmaGet(
      `/images/${FILE_KEY}?ids=${encodeURIComponent(ids)}&format=png&scale=${scale}`,
    );

    if (payload.err) {
      throw new Error(`Figma image export error: ${payload.err}`);
    }

    Object.assign(images, payload.images ?? {});
  }

  return images;
}

async function downloadUrl(url, destPath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed (${response.status}): ${url}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.mkdir(path.dirname(destPath), { recursive: true });
  await fs.writeFile(destPath, buffer);
}

async function writeManifest(rows) {
  const manifestPath = path.join(OUTPUT_ROOT, "manifest.json");
  await fs.mkdir(OUTPUT_ROOT, { recursive: true });
  await fs.writeFile(manifestPath, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
  return manifestPath;
}

async function loadEntriesFromMetadataXml(xmlPath) {
  const { spawnSync } = await import("node:child_process");
  const parserPath = path.join(__dirname, "parse-metadata-xml.mjs");
  const result = spawnSync(process.execPath, [parserPath, xmlPath], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr || "parse-metadata-xml.mjs failed");
  }
  return JSON.parse(result.stdout);
}

async function main() {
  let allEntries;

  if (metadataXmlPath) {
    console.log(`Loading entries from metadata XML (${metadataXmlPath})…`);
    allEntries = await loadEntriesFromMetadataXml(metadataXmlPath);
  } else {
    console.log(`Fetching Figma file nodes (${FILE_KEY}, page ${PAGE_NODE_ID})…`);
    const payload = await figmaGet(`/files/${FILE_KEY}/nodes?ids=${encodeURIComponent(PAGE_NODE_ID)}`);
    const pageNode = payload.nodes?.[PAGE_NODE_ID]?.document;

    if (!pageNode) {
      throw new Error(`Page node ${PAGE_NODE_ID} not found in Figma response`);
    }

    const symbolEntries = [];
    const shopBannerInstances = [];
    walkNodes(pageNode, new Set(), symbolEntries, shopBannerInstances);
    allEntries = [...symbolEntries, ...shopBannerInstances];
  }

  const shopBannerInstances = allEntries.filter((entry) => entry.category === "shop-page-banner");

  const byCategory = allEntries.reduce((acc, entry) => {
    acc[entry.category] = (acc[entry.category] ?? 0) + 1;
    return acc;
  }, {});

  console.log("Discovered assets:");
  for (const [category, count] of Object.entries(byCategory).sort()) {
    const size =
      category === "shop-page-banner"
        ? SHOP_BANNER_SIZE
        : (CATEGORY_FRAMES[category]?.size ?? "?");
    console.log(`  ${category} (${size}): ${count}`);
  }

  if (allEntries.length === 0) {
    console.warn("No logo nodes matched — Figma structure may have changed. Check frame ids in script.");
    process.exit(1);
  }

  const unknownBanners = shopBannerInstances.filter((e) => e.brand === "unknown");
  if (unknownBanners.length > 0) {
    console.warn(
      `${unknownBanners.length} shop-page banner(s) could not be mapped to a brand name — saved under unknown_* slugs. Re-run after setting Brand component property in Figma or edit manifest.json.`,
    );
  }

  if (dryRun) {
    console.log("\nDry run — would download:");
    for (const entry of allEntries.slice(0, 10)) {
      console.log(`  ${entry.slug}/${entry.category} ← ${entry.name} (${entry.nodeId})`);
    }
    if (allEntries.length > 10) {
      console.log(`  … and ${allEntries.length - 10} more`);
    }
    return;
  }

  console.log(`\nExporting ${allEntries.length} PNG(s) from Figma (scale 2)…`);
  const imageMap = await exportImages(allEntries.map((e) => e.nodeId));

  const manifestRows = [];

  for (const entry of allEntries) {
    const url = imageMap[entry.nodeId];
    if (!url) {
      console.warn(`  skip ${entry.nodeId} — no image URL returned`);
      continue;
    }

    const relativePath = path.join(entry.slug, entry.category, "logo.png");
    const destPath = path.join(OUTPUT_ROOT, relativePath);
    await downloadUrl(url, destPath);
    console.log(`  saved ${relativePath}`);

    manifestRows.push({
      brand: entry.brand,
      slug: entry.slug,
      category: entry.category,
      figmaNodeId: entry.nodeId,
      figmaName: entry.name,
      relativePath: `docs/assets/brand-logos/${relativePath}`,
      adminField:
        entry.category === "shop-page-banner"
          ? "banner"
          : (CATEGORY_FRAMES[entry.category]?.adminField ?? null),
      size:
        entry.category === "shop-page-banner"
          ? SHOP_BANNER_SIZE
          : (CATEGORY_FRAMES[entry.category]?.size ?? null),
    });
  }

  const manifestPath = await writeManifest(manifestRows);
  console.log(`\nDone. ${manifestRows.length} files under docs/assets/brand-logos/`);
  console.log(`Manifest: ${path.relative(REPO_ROOT, manifestPath)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
