#!/usr/bin/env node
/**
 * Parse Figma get_metadata XML into brand logo export entries (same rules as download-brand-logos.mjs).
 * Usage: node scripts/figma-brand-logos/parse-metadata-xml.mjs <metadata.xml> > entries.json
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CATEGORY_FRAMES = {
  "default-shop-card": {
    frameNodeIds: new Set(["31:469"]),
    matchName: (name) => /^Brand=/.test(name) && name.includes("Cover=False"),
  },
  "default-shop-card-cover": {
    frameNodeIds: new Set(["31:469"]),
    matchName: (name) => /^Brand=/.test(name) && name.includes("Cover=True"),
  },
  "logo-circle": {
    frameNodeIds: new Set(["15:170"]),
    matchName: (name) => /^Brand=/.test(name),
  },
};

const SHOP_BANNER_COMPONENT_NAME = "Logo Banner for Shop Page";

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

/** Unescape XML attribute entities; meta-character (&amp;) is decoded last. */
export function decodeXmlAttributeValue(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

export function parseXmlNodes(xml) {
  const tagRe =
    /<(symbol|instance|frame|component|component-set)\s+id="([^"]+)"\s+name="([^"]*)"/g;
  const nodes = [];
  let match;
  while ((match = tagRe.exec(xml)) !== null) {
    nodes.push({
      type: match[1],
      id: match[2],
      name: decodeXmlAttributeValue(match[3]),
    });
  }
  return nodes;
}

function buildEntries(nodes) {
  const frameStack = [];
  const entries = [];

  for (const node of nodes) {
    if (node.type === "frame" || node.type === "component" || node.type === "component-set") {
      frameStack.push(node.id);
    }

    if (node.type === "symbol" || node.type === "component") {
      for (const [category, config] of Object.entries(CATEGORY_FRAMES)) {
        const inFrame = [...config.frameNodeIds].some((frameId) => frameStack.includes(frameId));
        if (inFrame && config.matchName(node.name)) {
          const brand = parseBrandFromSymbolName(node.name);
          if (brand) {
            entries.push({
              nodeId: node.id,
              category,
              brand,
              slug: slugifyBrand(brand),
              name: node.name,
            });
          }
        }
      }
    }

    if (node.type === "instance" && node.name === SHOP_BANNER_COMPONENT_NAME) {
      entries.push({
        nodeId: node.id,
        category: "shop-page-banner",
        brand: "unknown",
        slug: `unknown_${node.id.replace(":", "_")}`,
        name: node.name,
      });
    }
  }

  return entries;
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const xmlPath = process.argv[2];
  if (!xmlPath) {
    console.error("Usage: node parse-metadata-xml.mjs <metadata.xml>");
    process.exit(1);
  }

  const xml = await fs.readFile(xmlPath, "utf8");
  const entries = buildEntries(parseXmlNodes(xml));
  process.stdout.write(`${JSON.stringify(entries, null, 2)}\n`);
}
