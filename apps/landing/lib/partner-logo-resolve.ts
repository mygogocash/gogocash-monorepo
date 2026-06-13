import fs from "node:fs";
import path from "node:path";

import { FEATURED_FALLBACK_LOGOS } from "@/lib/featured-fallback-logos";

/** Trailing `-uuid` after stripping `.png` (Involve / Cursor export filenames). */
const UUID_STEM_TAIL =
  /-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function slugAlnum(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Filename without extension; UUID suffix removed when present. */
function stemFromFilename(filename: string): string {
  const base = filename.replace(/\.png$/i, "");
  return base.replace(UUID_STEM_TAIL, "");
}

/**
 * Human-readable Mini assets: `Brand (Region) - CPS` → `Brand`.
 * Legacy exports: `Shopee_TH_-_CPS` → `Shopee`.
 */
function primaryStem(stem: string): string {
  let s = stem.trim();
  const paren = s.indexOf("(");
  if (paren !== -1) s = s.slice(0, paren).trim();
  const dashSep = s.indexOf(" - ");
  if (dashSep !== -1) s = s.slice(0, dashSep).trim();
  const firstUs = s.split("_")[0]?.trim();
  if (firstUs && firstUs.length > 0) s = firstUs;
  return s.length > 0 ? s : stem;
}

/** Skip our own / platform marks when matching merchant offers. */
function skipFileForMatching(filename: string): boolean {
  const lower = filename.toLowerCase();
  const stem = stemFromFilename(filename).toLowerCase();
  return (
    stem.startsWith("involve") ||
    stem.startsWith("gogocash") ||
    stem.includes("involve asia") ||
    lower.includes("involve_asia") ||
    lower.includes("browser-screenshot")
  );
}

/** Prefer `Brand.png` (Mini) over `Brand-uuid.png` when match strength ties. */
function uuidSuffixWeight(filename: string): number {
  return UUID_STEM_TAIL.test(filename.replace(/\.png$/i, "")) ? 1 : 0;
}

let cachedDirMtime = 0;
let cachedList: string[] = [];

function listPngFilenames(): string[] {
  const dir = path.join(process.cwd(), "public/images/partner-logos");
  try {
    const stat = fs.statSync(dir);
    if (stat.mtimeMs === cachedDirMtime && cachedList.length > 0) {
      return cachedList;
    }
    cachedDirMtime = stat.mtimeMs;
    cachedList = fs
      .readdirSync(dir)
      .filter((f) => f.toLowerCase().endsWith(".png"));
    return cachedList;
  } catch {
    return [];
  }
}

/**
 * Picks a bundled logo under `/images/partner-logos/` from the offer name.
 * Uses longest slug match among primary stems (before first `_`) to reduce false positives.
 */
export function resolveBundledPartnerLogo(offerName: string): string | null {
  const name = offerName.trim();
  if (!name) return null;
  const offerSlug = slugAlnum(name);
  if (offerSlug.length < 2) return null;

  let best: { file: string; score: number; weight: number } | null = null;
  for (const file of listPngFilenames()) {
    if (skipFileForMatching(file)) continue;
    const stem = stemFromFilename(file);
    const primary = primaryStem(stem);
    const pSlug = slugAlnum(primary);
    const fullStemSlug = slugAlnum(stem.replace(/_/g, ""));
    if (pSlug.length < 2 && fullStemSlug.length < 2) continue;

    const candidates = [pSlug, fullStemSlug].filter((s) => s.length >= 2);
    for (const c of candidates) {
      if (offerSlug.includes(c) || c.includes(offerSlug)) {
        const score = Math.min(c.length, offerSlug.length);
        const w = uuidSuffixWeight(file);
        if (
          !best ||
          score > best.score ||
          (score === best.score && w < best.weight)
        ) {
          best = { file, score, weight: w };
        }
      }
    }
  }

  return best ? `/images/partner-logos/${best.file}` : null;
}

/**
 * Prefer bundled asset (stable on static export); fall back to Involve CDN URL.
 */
export function resolvePartnerDisplayLogo(
  offerName: string,
  remoteLogoUrl: string | null,
): string | null {
  const local = resolveBundledPartnerLogo(offerName);
  if (local) return local;
  return remoteLogoUrl?.trim() || null;
}

/** Lowercase single-spaced form for prefix checks. */
function collapseInnerSpaces(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * True when `longer` is the same merchant as `shorter` with extra suffix
 * (e.g. "Airpaz Global" vs "Airpaz"). Requires a word boundary after the shorter name.
 * Short roots (&lt; minRootSlugLen alnum chars) are ignored to avoid false positives.
 */
function isExtendedBrandName(
  shorter: string,
  longer: string,
  minRootSlugLen = 4,
): boolean {
  const s0 = shorter.trim();
  const l0 = longer.trim();
  if (slugAlnum(s0).length < minRootSlugLen) return false;
  const s = collapseInnerSpaces(s0);
  const l = collapseInnerSpaces(l0);
  if (l.length <= s.length) return false;
  if (!l.startsWith(s)) return false;
  const rest = l.slice(s.length);
  return (
    rest.startsWith(" ") ||
    rest.startsWith("-") ||
    rest.startsWith("–") ||
    rest.startsWith("—")
  );
}

/**
 * Collapse rows like "Airpaz" + "Airpaz Global" to a single "Airpaz" card.
 * Prefers the shortest display name that still represents the merchant.
 */
function dedupeExtendedBrandNames(
  brands: BundledPartnerBrand[],
): BundledPartnerBrand[] {
  const sorted = [...brands].sort(
    (a, b) =>
      a.name.length - b.name.length ||
      a.name.localeCompare(b.name, "en"),
  );
  const out: BundledPartnerBrand[] = [];
  for (const c of sorted) {
    if (out.some((r) => isExtendedBrandName(r.name, c.name))) continue;
    const pruned = out.filter((r) => !isExtendedBrandName(c.name, r.name));
    pruned.push(c);
    out.length = 0;
    out.push(...pruned);
  }
  return out;
}

function guessCategory(stem: string, displayName: string): string {
  const hay = `${stem} ${displayName}`.toLowerCase();
  if (
    /\b(agoda|trip\.com|booking|expedia|klook|kkday|airasia|hotels?|travel|flight|airline|pelago|omio|hostel|vacation)\b/.test(
      hay,
    )
  ) {
    return "Travel";
  }
  if (
    /\b(shopee|lazada|aliexpress|amazon|taobao|marketplace|retail|e-?commerce|shopify|zalora|grabmart)\b/.test(
      hay,
    )
  ) {
    return "E-commerce";
  }
  return "Partners";
}

/** Dropped from the brands grid (ambiguous stems, not real cashback merchants). */
const BLOCKED_BUNDLED_PARTNER_NAMES = new Set(
  [
    "Air",
    "browser-screenshot",
    "Domino",
    "go",
    "GQ Thailand",
    "WPS SOFTWARE",
    "Zen",
  ].map((n) => n.trim().toLowerCase()),
);

function isBlockedBundledPartnerDisplayName(name: string): boolean {
  return BLOCKED_BUNDLED_PARTNER_NAMES.has(name.trim().toLowerCase());
}

export type BundledPartnerBrand = {
  id: string;
  name: string;
  category: string;
  logoUrl: string;
};

type FilePick = { file: string; stem: string; primary: string; weight: number };

/**
 * Server-only: one row per unique display name from `public/images/partner-logos`
 * (deduped, Mini/non-UUID preferred). Same data shape as API-driven partner cards.
 */
export function loadBundledPartnerBrands(): BundledPartnerBrand[] {
  const entries: FilePick[] = [];
  for (const file of listPngFilenames()) {
    if (skipFileForMatching(file)) continue;
    const stem = stemFromFilename(file);
    const primary = primaryStem(stem);
    const name = primary.trim() || stem;
    if (slugAlnum(name).length < 2) continue;
    entries.push({
      file,
      stem,
      primary: name,
      weight: uuidSuffixWeight(file),
    });
  }

  const byKey = new Map<string, FilePick>();
  for (const e of entries) {
    const key = slugAlnum(e.primary);
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, e);
      continue;
    }
    if (e.weight < prev.weight) {
      byKey.set(key, e);
      continue;
    }
    if (e.weight === prev.weight && e.file.localeCompare(prev.file) < 0) {
      byKey.set(key, e);
    }
  }

  const brands: BundledPartnerBrand[] = [];
  for (const e of byKey.values()) {
    if (isBlockedBundledPartnerDisplayName(e.primary)) continue;
    const slug = slugAlnum(e.primary);
    const pinned = FEATURED_FALLBACK_LOGOS[slug];
    const logoUrl = pinned ?? `/images/partner-logos/${e.file}`;
    brands.push({
      id: `bundled-${slug}`,
      name: e.primary,
      category: guessCategory(e.stem, e.primary),
      logoUrl,
    });
  }

  const deduped = dedupeExtendedBrandNames(brands);
  deduped.sort((a, b) => a.name.localeCompare(b.name, "en"));
  return deduped;
}
