#!/usr/bin/env node
/**
 * Sync Offer legacy media aliases from the checked-in Figma manifest.
 *
 * Safety classification: this is a legacy-untracked/nondeletable writer. It
 * may replace only raw legacy URL fields. Any structured owner proof or any
 * policy_media_asset_registry row (active, deleting, or deleted) makes the
 * entire run fail closed before the first R2 Put. New URLs are deliberately
 * left without structured proof and therefore can never be automatically
 * physically deleted by the policy cleanup worker. Object keys include the
 * manifest content hash, so a crash/retry reuses the same planned object
 * instead of accumulating random orphan uploads.
 *
 * Default mode is dry-run. Mutation requires an explicit --apply.
 */
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import mongoose from "mongoose";

import {
  buildAssetsBySlug,
  normalizeLookupSlug,
  planOfferMediaUpdates,
} from "./offer-media-field-map.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const MANIFEST_PATH = path.join(
  REPO_ROOT,
  "docs/assets/brand-logos/manifest.json",
);
const BRANDS_FOLDER = "brands";
const STRUCTURED_PROOF_FIELDS = ["logo_asset", "banner_asset"];

export function parseArgs(argv) {
  if (argv.includes("--apply") && argv.includes("--dry-run")) {
    throw new Error("Choose either --apply or --dry-run, not both");
  }
  const dryRun = !argv.includes("--apply");
  const slugFilter = argv
    .find((arg) => arg.startsWith("--slug="))
    ?.slice("--slug=".length)
    ?.trim()
    ?.toLowerCase();
  return { dryRun, slugFilter };
}

function requiredEnv(env, name) {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function buildMediaObjectKey(folder, originalName, nonce) {
  const trimmed = (originalName || "logo.png").trim();
  const dotIndex = trimmed.lastIndexOf(".");
  const baseName = dotIndex > 0 ? trimmed.slice(0, dotIndex) : trimmed;
  const extension =
    dotIndex > 0 ? trimmed.slice(dotIndex + 1).toLowerCase() : "png";
  const safeBase =
    baseName
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || "logo";
  const safeExtension = extension.replace(/[^a-z0-9]+/gi, "").slice(0, 10);
  const safeName = safeExtension ? `${safeBase}.${safeExtension}` : safeBase;
  const safeFolder =
    folder
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "uploads";
  const unique = String(nonce || `${Date.now()}-${randomUUID()}`)
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .slice(0, 100);
  return `${safeFolder}/${unique}-${safeName}`;
}

export function buildR2PublicUrl(publicBaseUrl, objectKey) {
  const base = publicBaseUrl.replace(/\/+$/, "");
  return `${base}/${objectKey.replace(/^\/+/, "")}`;
}

export function policyMediaUrlHash(value) {
  return createHash("sha256").update(String(value).trim()).digest("hex");
}

function createR2Client(env) {
  return new S3Client({
    region: "auto",
    endpoint: requiredEnv(env, "R2_ENDPOINT"),
    credentials: {
      accessKeyId: requiredEnv(env, "R2_ACCESS_KEY_ID"),
      secretAccessKey: requiredEnv(env, "R2_SECRET_ACCESS_KEY"),
    },
  });
}

function hasOwn(value, field) {
  return Object.prototype.hasOwnProperty.call(value, field);
}

function normalizeUrl(value) {
  return typeof value === "string" ? value.trim() : "";
}

async function registryRowsForUrls(registryCollection, urls) {
  const normalized = [...new Set(urls.map(normalizeUrl).filter(Boolean))];
  if (normalized.length === 0) return [];
  const hashes = normalized.map(policyMediaUrlHash);
  const rows = await registryCollection
    .find({ url_hash: { $in: hashes } })
    .toArray();
  const urlByHash = new Map(
    normalized.map((url) => [policyMediaUrlHash(url), url]),
  );
  for (const row of rows) {
    const expected = urlByHash.get(row.url_hash);
    if (!expected || expected !== row.url) {
      throw new Error(
        `Policy media registry hash collision for ${expected || row.url_hash}`,
      );
    }
  }
  return rows;
}

function assertNoStructuredProof(work) {
  for (const { offer } of work) {
    for (const field of STRUCTURED_PROOF_FIELDS) {
      if (hasOwn(offer, field)) {
        throw new Error(
          `Offer ${String(offer._id)} has ${field}; refusing legacy raw replacement`,
        );
      }
    }
  }
}

function currentTargetUrls(work) {
  const urls = [];
  for (const { offer, plans } of work) {
    for (const plan of plans) {
      for (const field of plan.offerFields) {
        const url = normalizeUrl(offer[field]);
        if (url) urls.push(url);
      }
    }
  }
  return urls;
}

async function assertNoTrackedUrls(registryCollection, urls, stage) {
  const rows = await registryRowsForUrls(registryCollection, urls);
  if (rows.length > 0) {
    const row = rows[0];
    throw new Error(
      `Refusing ${stage}: URL ${row.url} is tracked in policy_media_asset_registry (${row.state})`,
    );
  }
}

function buildOfferCasFilter(offer, plans) {
  const filter = {
    _id: offer._id,
    logo_asset: { $exists: false },
    banner_asset: { $exists: false },
  };
  for (const plan of plans) {
    for (const field of plan.offerFields) {
      filter[field] = hasOwn(offer, field) ? offer[field] : { $exists: false };
    }
  }
  return filter;
}

function normalizedManifestSlug(slug) {
  return String(slug || "")
    .trim()
    .toLowerCase();
}

export function resolveManifestSlug(lookupValue, slugs) {
  const rawLookup = normalizedManifestSlug(lookupValue);
  if (!rawLookup) return null;

  const candidates = slugs.map((slug) => ({
    slug,
    normalized: normalizedManifestSlug(slug),
  }));
  const rawExact = candidates.filter(
    (candidate) => candidate.normalized === rawLookup,
  );
  if (rawExact.length === 1) return rawExact[0].slug;
  if (rawExact.length > 1) {
    throw new Error(
      `Ambiguous manifest slugs for lookup "${String(lookupValue)}": ${rawExact.map((candidate) => candidate.slug).join(", ")}`,
    );
  }

  const normalizedLookup = normalizeLookupSlug(rawLookup);
  const normalizedExact = candidates.filter(
    (candidate) => candidate.normalized === normalizedLookup,
  );
  if (normalizedExact.length === 1) return normalizedExact[0].slug;
  if (normalizedExact.length > 1) {
    throw new Error(
      `Ambiguous manifest slugs for lookup "${String(lookupValue)}": ${normalizedExact.map((candidate) => candidate.slug).join(", ")}`,
    );
  }

  const boundary = candidates.filter(
    (candidate) =>
      rawLookup.startsWith(`${candidate.normalized}_`) ||
      rawLookup.startsWith(`${candidate.normalized}-`),
  );
  if (boundary.length === 0) return null;
  const longestLength = Math.max(
    ...boundary.map((candidate) => candidate.normalized.length),
  );
  const longest = boundary.filter(
    (candidate) => candidate.normalized.length === longestLength,
  );
  if (longest.length !== 1) {
    throw new Error(
      `Ambiguous manifest slugs for lookup "${String(lookupValue)}": ${longest.map((candidate) => candidate.slug).join(", ")}`,
    );
  }
  return longest[0].slug;
}

/**
 * Testable sync core. All file/proof/registry checks finish before putObject is
 * called. Database updates use an exact compare-and-set filter so a concurrent
 * structured writer cannot be overwritten.
 */
export async function runOfferMediaSync({
  manifest,
  dryRun,
  slugFilter,
  repoRoot,
  offersCollection,
  registryCollection,
  readFile,
  publicBaseUrl,
  putObject,
  logger = console,
}) {
  const assetsBySlug = buildAssetsBySlug(manifest);
  const manifestSlugs = [
    ...new Set(
      manifest.map((row) => String(row.slug || "").trim()).filter(Boolean),
    ),
  ].sort();
  const syncableSlugs = [...assetsBySlug.entries()]
    .filter(([, assets]) => assets["logo-circle"] && assets["shop-page-banner"])
    .map(([slug]) => slug)
    .sort();
  const selectedSlugs = slugFilter
    ? syncableSlugs.filter(
        (slug) => normalizedManifestSlug(slug) === slugFilter,
      )
    : syncableSlugs;
  if (selectedSlugs.length === 0) {
    throw new Error(
      slugFilter
        ? `No manifest slug "${slugFilter}" with logo-circle + shop-page-banner`
        : "No slugs with both logo-circle and shop-page-banner in manifest",
    );
  }

  const allOffers = await offersCollection
    .find({
      disabled: { $ne: true },
      lookup_value: { $exists: true, $ne: "" },
    })
    .project({
      _id: 1,
      offer_name: 1,
      lookup_value: 1,
      logo_desktop: 1,
      logo_mobile: 1,
      logo_circle: 1,
      logo_asset: 1,
      banner_asset: 1,
    })
    .toArray();

  const work = [];
  const matchedSlugs = new Set();
  const selectedSlugSet = new Set(selectedSlugs);
  for (const offer of allOffers) {
    const slug = resolveManifestSlug(offer.lookup_value, manifestSlugs);
    if (!slug || !selectedSlugSet.has(slug)) continue;
    const plans = planOfferMediaUpdates(assetsBySlug.get(slug));
    matchedSlugs.add(slug);
    work.push({ slug, plans, offer });
  }
  const unmatchedSlugs = selectedSlugs.filter(
    (slug) => !matchedSlugs.has(slug),
  );
  for (const slug of unmatchedSlugs) {
    logger.warn(`[skip] ${slug} - no offer matched lookup_value`);
  }
  const skippedNoOffer = unmatchedSlugs.length;

  assertNoStructuredProof(work);
  const fileByPath = new Map();
  for (const item of work) {
    for (const plan of item.plans) {
      const absolutePath = path.join(repoRoot, plan.relativePath);
      if (!fileByPath.has(absolutePath)) {
        const buffer = await readFile(absolutePath);
        if (!buffer?.length) throw new Error(`Empty file: ${absolutePath}`);
        fileByPath.set(absolutePath, buffer);
      }
    }
  }
  await assertNoTrackedUrls(
    registryCollection,
    currentTargetUrls(work),
    "legacy media replacement",
  );

  const stats = {
    dryRun,
    slugsProcessed: selectedSlugs.length,
    offersMatched: work.length,
    offersUpdated: 0,
    uploadsPlanned: 0,
    uploadsApplied: 0,
    fieldUpdatesPlanned: 0,
    skippedNoOffer,
    legacyUrlsClassifiedNondeletable: new Set(currentTargetUrls(work)).size,
  };

  const uniquePlans = new Map();
  for (const item of work) {
    for (const plan of item.plans) {
      const key = `${item.slug}:${plan.category}`;
      if (!uniquePlans.has(key))
        uniquePlans.set(key, { slug: item.slug, ...plan });
      stats.fieldUpdatesPlanned += plan.offerFields.length;
    }
  }
  stats.uploadsPlanned = uniquePlans.size;

  if (!publicBaseUrl) {
    throw new Error(
      "R2 public URL is required to plan deterministic media URLs",
    );
  }
  if (!dryRun && typeof putObject !== "function") {
    throw new Error("Apply mode requires putObject");
  }
  const prepared = new Map();
  for (const [key, plan] of uniquePlans) {
    const absolutePath = path.join(repoRoot, plan.relativePath);
    const buffer = fileByPath.get(absolutePath);
    const contentSha256 = createHash("sha256").update(buffer).digest("hex");
    const originalName = `${plan.slug}-${plan.category}-${path.basename(absolutePath)}`;
    const objectKey = buildMediaObjectKey(
      BRANDS_FOLDER,
      originalName,
      `manifest-${contentSha256}`,
    );
    prepared.set(key, {
      ...plan,
      absolutePath,
      buffer,
      contentSha256,
      objectKey,
      publicUrl: buildR2PublicUrl(publicBaseUrl, objectKey),
    });
  }

  // Prospective URLs are checked too. This is still before the first Put.
  await assertNoTrackedUrls(
    registryCollection,
    [...prepared.values()].map((entry) => entry.publicUrl),
    "new legacy media upload",
  );

  if (dryRun) {
    for (const item of work) {
      for (const plan of item.plans) {
        for (const field of plan.offerFields) {
          logger.log(
            `[plan] ${item.slug} -> offer ${String(item.offer._id)} set ${field} <- ${plan.category}`,
          );
        }
      }
    }
    return stats;
  }

  for (const item of prepared.values()) {
    await putObject(item);
    stats.uploadsApplied += 1;
  }

  for (const item of work) {
    const fieldUpdates = {};
    for (const plan of item.plans) {
      const uploaded = prepared.get(`${item.slug}:${plan.category}`);
      for (const field of plan.offerFields)
        fieldUpdates[field] = uploaded.publicUrl;
    }
    // Re-read for this exact owner immediately before compare-and-set. A
    // tracked row created while uploads or earlier offer updates were running
    // must block this owner too, not merely the first owner in the batch.
    await assertNoTrackedUrls(
      registryCollection,
      [...currentTargetUrls([item]), ...Object.values(fieldUpdates)],
      "final legacy media replacement",
    );
    const result = await offersCollection.updateOne(
      buildOfferCasFilter(item.offer, item.plans),
      {
        $set: fieldUpdates,
      },
    );
    if (result.matchedCount !== 1) {
      throw new Error(
        `Offer ${String(item.offer._id)} changed after safety checks; refusing overwrite`,
      );
    }
    stats.offersUpdated += 1;
    logger.log(
      `[ok] ${item.slug} -> offer ${String(item.offer._id)} updated ${Object.keys(fieldUpdates).join(", ")}`,
    );
  }
  return stats;
}

async function main(argv = process.argv.slice(2), env = process.env) {
  const { dryRun, slugFilter } = parseArgs(argv);
  const mongoUri = requiredEnv(env, "MONGO_URI");
  const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, "utf8"));
  loggerMode(dryRun, slugFilter);

  await mongoose.connect(mongoUri);
  try {
    const db = mongoose.connection.db;
    if (!db) throw new Error("Mongo connection failed");
    let r2Client;
    let r2Bucket;
    const publicBaseUrl = requiredEnv(env, "R2_PUBLIC_BASE_URL");
    if (!dryRun) {
      r2Bucket = requiredEnv(env, "R2_BUCKET");
      r2Client = createR2Client(env);
    }
    const stats = await runOfferMediaSync({
      manifest,
      dryRun,
      slugFilter,
      repoRoot: REPO_ROOT,
      offersCollection: db.collection("offers"),
      registryCollection: db.collection("policy_media_asset_registry"),
      readFile: (absolutePath) => fs.readFile(absolutePath),
      publicBaseUrl,
      putObject: dryRun
        ? undefined
        : async ({ buffer, objectKey }) => {
            await r2Client.send(
              new PutObjectCommand({
                Bucket: r2Bucket,
                Key: objectKey,
                Body: buffer,
                ContentType: "image/png",
                CacheControl: "public, max-age=31536000",
              }),
            );
          },
    });
    console.log("[sync-offer-media] done");
    console.table(stats);
    return 0;
  } finally {
    await mongoose.disconnect();
  }
}

function loggerMode(dryRun, slugFilter) {
  console.log(
    `[sync-offer-media] ${dryRun ? "DRY RUN" : "APPLY"}${slugFilter ? ` - ${slugFilter}` : ""}`,
  );
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      console.error("[sync-offer-media] fatal:", error);
      process.exitCode = 1;
    });
}
