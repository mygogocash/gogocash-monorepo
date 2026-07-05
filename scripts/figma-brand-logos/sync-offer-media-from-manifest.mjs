#!/usr/bin/env node
/**
 * Sync admin offer "Logos & media" from docs/assets/brand-logos manifest:
 *   logo-circle       → logo_desktop + logo_mobile (Logo)
 *   shop-page-banner  → logo_circle (Brand cover)
 *
 * Requires Mongo + R2 (same env as gogocash-api):
 *   MONGO_URI, R2_BUCKET, R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_BASE_URL
 *
 * Usage:
 *   node scripts/figma-brand-logos/sync-offer-media-from-manifest.mjs --dry-run
 *   node scripts/figma-brand-logos/sync-offer-media-from-manifest.mjs --slug=agoda
 *   node scripts/figma-brand-logos/sync-offer-media-from-manifest.mjs --apply
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import mongoose from "mongoose";

import {
  buildAssetsBySlug,
  lookupMatchesSlug,
  planOfferMediaUpdates,
} from "./offer-media-field-map.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const MANIFEST_PATH = path.join(REPO_ROOT, "docs/assets/brand-logos/manifest.json");
const BRANDS_FOLDER = "brands";

function parseArgs(argv) {
  const dryRun = !argv.includes("--apply");
  const slugFilter = argv
    .find((arg) => arg.startsWith("--slug="))
    ?.slice("--slug=".length)
    ?.trim()
    ?.toLowerCase();
  return { dryRun, slugFilter };
}

function assertEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function buildMediaObjectKey(folder, originalName) {
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
  return `${safeFolder}/${Date.now()}-${safeName}`;
}

function buildR2PublicUrl(publicBaseUrl, objectKey) {
  const base = publicBaseUrl.replace(/\/+$/, "");
  return `${base}/${objectKey.replace(/^\/+/, "")}`;
}

function createR2Client() {
  const endpoint = assertEnv("R2_ENDPOINT");
  const accessKeyId = assertEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = assertEnv("R2_SECRET_ACCESS_KEY");
  return new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
}

async function uploadPngToR2(client, absolutePath, bucket, publicBaseUrl) {
  const buffer = await fs.readFile(absolutePath);
  if (!buffer.length) {
    throw new Error(`Empty file: ${absolutePath}`);
  }
  const objectKey = buildMediaObjectKey(BRANDS_FOLDER, path.basename(absolutePath));
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: buffer,
      ContentType: "image/png",
      CacheControl: "public, max-age=31536000",
    }),
  );
  return buildR2PublicUrl(publicBaseUrl, objectKey);
}

async function main() {
  const { dryRun, slugFilter } = parseArgs(process.argv.slice(2));
  const mongoUri = assertEnv("MONGO_URI");

  const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, "utf8"));
  const assetsBySlug = buildAssetsBySlug(manifest);

  const slugs = [...assetsBySlug.entries()]
    .filter(([slug, assets]) => {
      if (slugFilter && slug !== slugFilter) return false;
      return assets["logo-circle"] && assets["shop-page-banner"];
    })
    .map(([slug]) => slug)
    .sort();

  if (slugs.length === 0) {
    console.error(
      slugFilter
        ? `No manifest slug "${slugFilter}" with logo-circle + shop-page-banner`
        : "No slugs with both logo-circle and shop-page-banner in manifest",
    );
    process.exit(1);
  }

  console.log(
    `[sync-offer-media] ${dryRun ? "DRY RUN" : "APPLY"} — ${slugs.length} brand slug(s)`,
  );

  await mongoose.connect(mongoUri);
  const offersCollection = mongoose.connection.db.collection("offers");

  const r2Bucket = dryRun ? null : assertEnv("R2_BUCKET");
  const r2PublicBaseUrl = dryRun ? null : assertEnv("R2_PUBLIC_BASE_URL");
  const r2Client = dryRun ? null : createR2Client();

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
    })
    .toArray();

  const stats = {
    slugsProcessed: 0,
    offersMatched: 0,
    offersUpdated: 0,
    uploadsPlanned: 0,
    uploadsApplied: 0,
    skippedNoOffer: 0,
    errors: [],
  };

  for (const slug of slugs) {
    stats.slugsProcessed += 1;
    const assets = assetsBySlug.get(slug);
    const plans = planOfferMediaUpdates(assets);

    const matched = allOffers.filter((offer) =>
      lookupMatchesSlug(offer.lookup_value, slug),
    );

    if (matched.length === 0) {
      stats.skippedNoOffer += 1;
      console.warn(`[skip] ${slug} — no offer matched lookup_value`);
      continue;
    }

    for (const offer of matched) {
      stats.offersMatched += 1;
      /** @type {Record<string, string>} */
      const fieldUpdates = {};

      for (const plan of plans) {
        const absolutePath = path.join(REPO_ROOT, plan.relativePath);
        try {
          await fs.access(absolutePath);
        } catch {
          stats.errors.push({
            slug,
            offerId: String(offer._id),
            error: `Missing file ${plan.relativePath}`,
          });
          continue;
        }

        for (const field of plan.offerFields) {
          stats.uploadsPlanned += 1;
          if (dryRun) {
            console.log(
              `[plan] ${slug} → offer ${offer._id} (${offer.lookup_value}) set ${field} ← ${plan.category}`,
            );
            continue;
          }

          try {
            const publicUrl = await uploadPngToR2(
              r2Client,
              absolutePath,
              r2Bucket,
              r2PublicBaseUrl,
            );
            fieldUpdates[field] = publicUrl;
            stats.uploadsApplied += 1;
          } catch (error) {
            stats.errors.push({
              slug,
              offerId: String(offer._id),
              error:
                error instanceof Error
                  ? `${field}: ${error.message}`
                  : String(error),
            });
          }
        }
      }

      if (!dryRun && Object.keys(fieldUpdates).length > 0) {
        await offersCollection.updateOne(
          { _id: offer._id },
          { $set: fieldUpdates },
        );
        stats.offersUpdated += 1;
        console.log(
          `[ok] ${slug} → offer ${offer._id} (${offer.lookup_value}) updated ${Object.keys(fieldUpdates).join(", ")}`,
        );
      }
    }
  }

  console.log("[sync-offer-media] done");
  console.table(stats);

  if (stats.errors.length > 0) {
    console.log("\nErrors:");
    for (const err of stats.errors.slice(0, 20)) {
      console.log(`  - ${err.slug} / ${err.offerId}: ${err.error}`);
    }
    if (stats.errors.length > 20) {
      console.log(`  … ${stats.errors.length - 20} more`);
    }
  }

  await mongoose.disconnect();
  process.exit(stats.errors.length > 0 ? 2 : 0);
}

main().catch((error) => {
  console.error("[sync-offer-media] fatal:", error);
  process.exit(1);
});
