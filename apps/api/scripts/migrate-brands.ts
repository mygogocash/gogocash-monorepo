/**
 * One-shot migration that groups legacy Offer rows under Brand parents.
 *
 * Media safety contract
 * ---------------------
 * A Brand introduces additional references to the Offer's logo/banner URLs.
 * Command-owned R2 URLs therefore touch policy_media_asset_registry in the
 * SAME transaction as Brand creation and Offer linking. An inactive tracked
 * URL fails closed. A URL absent from the registry is explicitly classified
 * legacy-untracked/nondeletable; this script never makes such a URL eligible
 * for automatic physical deletion.
 *
 * Run:
 *   npm run migrate:brands:dry
 *   npm run migrate:brands
 */

import 'dotenv/config';
import { createHash } from 'node:crypto';
import mongoose from 'mongoose';
import type { ClientSession } from 'mongoose';

export type BrandMigrationStats = {
  offersScanned: number;
  offersAlreadyLinked: number;
  brandsCreated: number;
  brandsReused: number;
  offersLinked: number;
  offersLinkedConcurrently: number;
  trackedMediaClassified: number;
  trackedMediaAttachments: number;
  legacyMediaClassifiedNondeletable: number;
  ambiguousNames: string[];
  errors: { offerId: string; error: string }[];
};

type MigrationOffer = {
  _id: unknown;
  offer_id: number;
  merchant_id?: number;
  offer_name?: string;
  lookup_value?: string;
  logo?: string;
  logo_circle?: string;
  logo_desktop?: string;
  logo_asset?: MigrationMediaProof;
  banner?: string;
  banner_asset?: MigrationMediaProof;
  description?: string;
  categories?: string | string[];
  brand_id?: unknown;
};

type MigrationMediaProof = {
  url?: unknown;
  ownership?: unknown;
};

type MigrationBrand = {
  _id: unknown;
  brand_slug: string;
};

type MediaRegistryRow = {
  _id: unknown;
  url_hash: string;
  url: string;
  state: string;
  revision: number;
};

type BrandInsert = {
  brand_slug: string;
  brand_name: string;
  logo: string;
  logo_circle: string;
  banner: string;
  description: string;
  categories: string[];
  is_global: false;
  disabled: false;
};

export type BrandMigrationPort = {
  scanOffers(): AsyncIterable<MigrationOffer>;
  findBrandBySlug(
    slug: string,
    session?: ClientSession,
  ): Promise<MigrationBrand | null>;
  findRegistryByHash(
    urlHash: string,
    session?: ClientSession,
  ): Promise<MediaRegistryRow | null>;
  touchActiveRegistry(
    row: MediaRegistryRow,
    session: ClientSession,
  ): Promise<boolean>;
  insertBrand(
    value: BrandInsert,
    session: ClientSession,
  ): Promise<MigrationBrand>;
  linkOffer(
    offerId: unknown,
    brandId: unknown,
    session: ClientSession,
  ): Promise<'linked' | 'already-linked'>;
  withTransaction<T>(work: (session: ClientSession) => Promise<T>): Promise<T>;
};

type MigrationLogger = Pick<Console, 'log' | 'warn' | 'error' | 'table'>;

function inferBrandName(offerName: string): string {
  const trimmed = (offerName || '').trim();
  if (!trimmed) return '';
  return (
    trimmed
      .replace(/\s*[-–—]\s*(TH|SG|ID|MY|PH|VN|US|UK|GB)\b.*$/i, '')
      .replace(/\s*\((TH|SG|ID|MY|PH|VN|US|UK|GB)\)\s*$/i, '')
      .replace(/[\s_]+(TH|SG|ID|MY|PH|VN|US|UK|GB)\s*$/i, '')
      .trim() || trimmed
  );
}

function slugifyBrand(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

export function deriveBrandIdentity(offer: MigrationOffer): {
  slug: string;
  name: string;
} {
  const name = inferBrandName(offer.offer_name ?? '');
  if (offer.merchant_id && offer.merchant_id > 0) {
    return {
      slug: slugifyBrand(name) || `merchant_${offer.merchant_id}`,
      name: name || `Merchant ${offer.merchant_id}`,
    };
  }
  if (offer.lookup_value) {
    const stem = String(offer.lookup_value).replace(/_[a-z]{2}$/i, '');
    if (stem) return { slug: stem, name: name || stem };
  }
  return {
    slug: slugifyBrand(name) || `offer_${offer.offer_id}`,
    name,
  };
}

function firstNonEmpty(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function categoryList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map(String)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  if (typeof value !== 'string') return [];
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function brandInsert(offer: MigrationOffer, slug: string, name: string) {
  return {
    brand_slug: slug,
    brand_name: name,
    logo: firstNonEmpty(offer.logo, offer.logo_circle, offer.logo_desktop),
    logo_circle: firstNonEmpty(offer.logo_circle),
    banner: firstNonEmpty(offer.banner),
    description: firstNonEmpty(offer.description),
    categories: categoryList(offer.categories),
    is_global: false as const,
    disabled: false as const,
  };
}

export function policyMediaUrlHash(url: string): string {
  return createHash('sha256').update(url.trim()).digest('hex');
}

export function parseBrandMigrationArgs(argv: string[]): { dryRun: boolean } {
  if (argv.includes('--apply') && argv.includes('--dry-run')) {
    throw new Error('Choose either --apply or --dry-run, not both');
  }
  return { dryRun: !argv.includes('--apply') };
}

type MediaCandidate = {
  url: string;
  proofs: Array<{ field: string; value: MigrationMediaProof }>;
};

function mediaCandidates(
  offer: MigrationOffer,
  value: BrandInsert,
): MediaCandidate[] {
  const candidates = new Map<string, MediaCandidate>();
  const add = (
    url: string,
    field: 'logo_asset' | 'banner_asset',
    proof: MigrationMediaProof | undefined,
  ) => {
    if (!url) return;
    const candidate = candidates.get(url) ?? { url, proofs: [] };
    if (proof !== undefined) candidate.proofs.push({ field, value: proof });
    candidates.set(url, candidate);
  };
  add(value.logo, 'logo_asset', offer.logo_asset);
  add(value.logo_circle, 'logo_asset', offer.logo_asset);
  add(value.banner, 'banner_asset', offer.banner_asset);
  return [...candidates.values()];
}

function proofRequiresRegistry(candidate: MediaCandidate): boolean {
  let requiresRegistry = false;
  for (const proof of candidate.proofs) {
    if (!proof.value || typeof proof.value !== 'object') {
      throw new Error(`Structured media proof ${proof.field} is malformed`);
    }
    const proofUrl =
      typeof proof.value.url === 'string' ? proof.value.url.trim() : '';
    if (!proofUrl || proofUrl !== candidate.url) {
      throw new Error(
        `Structured media proof ${proof.field} does not match ${candidate.url}`,
      );
    }
    if (proof.value.ownership === 'command-owned') {
      requiresRegistry = true;
    } else if (proof.value.ownership !== 'legacy-unverified') {
      throw new Error(
        `Structured media proof ${proof.field} has unsupported ownership`,
      );
    }
  }
  return requiresRegistry;
}

async function classifyAndFenceMedia(
  port: BrandMigrationPort,
  candidates: MediaCandidate[],
  session: ClientSession | undefined,
  apply: boolean,
): Promise<{ tracked: number; legacyNondeletable: number }> {
  let tracked = 0;
  let legacyNondeletable = 0;
  for (const candidate of candidates) {
    const { url } = candidate;
    const requiresRegistry = proofRequiresRegistry(candidate);
    const hash = policyMediaUrlHash(url);
    const row = await port.findRegistryByHash(hash, session);
    if (!row) {
      if (requiresRegistry) {
        throw new Error(
          `Command-owned structured media ${url} is missing its registry fence`,
        );
      }
      // Registry absence is a deliberate quarantine: legacy URLs are readable
      // references, but are never candidates for automated object deletion.
      legacyNondeletable += 1;
      continue;
    }
    if (row.url_hash !== hash || row.url !== url) {
      throw new Error(`Media registry hash collision for ${url}`);
    }
    if (row.state !== 'active') {
      throw new Error(
        `Refusing to attach tracked media ${url} while registry state is ${row.state}`,
      );
    }
    if (apply) {
      if (!session)
        throw new Error('Tracked media attachment requires a transaction');
      const touched = await port.touchActiveRegistry(row, session);
      if (!touched) {
        throw new Error(`Media registry fence changed while attaching ${url}`);
      }
    }
    tracked += 1;
  }
  return { tracked, legacyNondeletable };
}

function retryableTransaction(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const value = error as {
    code?: unknown;
    hasErrorLabel?: (label: string) => boolean;
  };
  return (
    value.code === 11000 ||
    Boolean(value.hasErrorLabel?.('TransientTransactionError')) ||
    Boolean(value.hasErrorLabel?.('UnknownTransactionCommitResult'))
  );
}

async function applyOffer(
  port: BrandMigrationPort,
  offer: MigrationOffer,
  slug: string,
  name: string,
) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      return await port.withTransaction(async (session) => {
        let brand = await port.findBrandBySlug(slug, session);
        let created = false;
        let classification = { tracked: 0, legacyNondeletable: 0 };
        if (!brand) {
          const insert = brandInsert(offer, slug, name);
          classification = await classifyAndFenceMedia(
            port,
            mediaCandidates(offer, insert),
            session,
            true,
          );
          brand = await port.insertBrand(insert, session);
          created = true;
        }
        const link = await port.linkOffer(offer._id, brand._id, session);
        return { created, link, classification };
      });
    } catch (error) {
      lastError = error;
      if (!retryableTransaction(error) || attempt === 4) throw error;
    }
  }
  throw lastError;
}

export async function runBrandMigration(
  port: BrandMigrationPort,
  options: { dryRun: boolean; logger?: MigrationLogger },
): Promise<BrandMigrationStats> {
  const logger = options.logger ?? console;
  const stats: BrandMigrationStats = {
    offersScanned: 0,
    offersAlreadyLinked: 0,
    brandsCreated: 0,
    brandsReused: 0,
    offersLinked: 0,
    offersLinkedConcurrently: 0,
    trackedMediaClassified: 0,
    trackedMediaAttachments: 0,
    legacyMediaClassifiedNondeletable: 0,
    ambiguousNames: [],
    errors: [],
  };
  const slugToFirstName = new Map<string, string>();
  const dryRunPlannedSlugs = new Set<string>();

  for await (const offer of port.scanOffers()) {
    stats.offersScanned += 1;
    if (offer.brand_id) {
      stats.offersAlreadyLinked += 1;
      continue;
    }
    try {
      const { slug, name } = deriveBrandIdentity(offer);
      if (!slug) throw new Error('Could not derive brand slug');
      const seenName = slugToFirstName.get(slug);
      if (seenName && seenName !== name) {
        stats.ambiguousNames.push(`${slug}: "${seenName}" vs "${name}"`);
      } else if (!seenName) {
        slugToFirstName.set(slug, name);
      }

      if (options.dryRun) {
        const existing = await port.findBrandBySlug(slug);
        const wouldCreate = !existing && !dryRunPlannedSlugs.has(slug);
        if (wouldCreate) {
          const insert = brandInsert(offer, slug, name);
          const classification = await classifyAndFenceMedia(
            port,
            mediaCandidates(offer, insert),
            undefined,
            false,
          );
          stats.trackedMediaClassified += classification.tracked;
          stats.legacyMediaClassifiedNondeletable +=
            classification.legacyNondeletable;
          stats.brandsCreated += 1;
          dryRunPlannedSlugs.add(slug);
        } else {
          stats.brandsReused += 1;
        }
        stats.offersLinked += 1;
        continue;
      }

      const result = await applyOffer(port, offer, slug, name);
      if (result.created) stats.brandsCreated += 1;
      else stats.brandsReused += 1;
      if (result.link === 'linked') stats.offersLinked += 1;
      else stats.offersLinkedConcurrently += 1;
      stats.trackedMediaClassified += result.classification.tracked;
      stats.trackedMediaAttachments += result.classification.tracked;
      stats.legacyMediaClassifiedNondeletable +=
        result.classification.legacyNondeletable;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      stats.errors.push({ offerId: String(offer._id), error: message });
      logger.error(`[migrate-brands] offer ${String(offer._id)}: ${message}`);
    }
  }
  return stats;
}

function mongoosePort(): BrandMigrationPort {
  const db = mongoose.connection.db!;
  const offers = db.collection<MigrationOffer>('offers');
  const brands = db.collection<MigrationBrand & BrandInsert>('brands');
  const registry = db.collection<MediaRegistryRow>(
    'policy_media_asset_registry',
  );
  return {
    scanOffers: () => offers.find({}),
    async findBrandBySlug(slug, session) {
      return brands.findOne(
        { brand_slug: slug },
        session ? { session } : undefined,
      );
    },
    async findRegistryByHash(urlHash, session) {
      return (await registry.findOne(
        { url_hash: urlHash },
        session ? { session } : undefined,
      )) as MediaRegistryRow | null;
    },
    async touchActiveRegistry(row, session) {
      const result = await registry.updateOne(
        {
          _id: row._id,
          url_hash: row.url_hash,
          url: row.url,
          state: 'active',
          revision: row.revision,
        },
        { $inc: { revision: 1 } },
        { session },
      );
      return result.modifiedCount === 1;
    },
    async insertBrand(value, session) {
      const created = {
        _id: new mongoose.Types.ObjectId(),
        ...value,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await brands.insertOne(created, { session });
      return created;
    },
    async linkOffer(offerId, brandId, session) {
      const linked = await offers.updateOne(
        { _id: offerId, brand_id: { $in: [null] } },
        { $set: { brand_id: brandId } },
        { session },
      );
      if (linked.modifiedCount === 1) return 'linked';
      const current = await offers.findOne(
        { _id: offerId },
        { session, projection: { brand_id: 1 } },
      );
      if (current?.brand_id && String(current.brand_id) === String(brandId)) {
        return 'already-linked';
      }
      throw new Error('Offer was concurrently linked to a different Brand');
    },
    async withTransaction(work) {
      const session = await mongoose.startSession();
      try {
        let result: Awaited<ReturnType<typeof work>> | undefined;
        await session.withTransaction(
          async () => {
            result = await work(session);
          },
          {
            readConcern: { level: 'snapshot' },
            writeConcern: { w: 'majority' },
            readPreference: 'primary',
          },
        );
        if (result === undefined) {
          throw new Error('Brand migration transaction returned no result');
        }
        return result;
      } finally {
        await session.endSession();
      }
    },
  };
}

export async function main(argv = process.argv.slice(2)): Promise<number> {
  const { dryRun } = parseBrandMigrationArgs(argv);
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) throw new Error('MONGO_URI is not set. Aborting.');

  console.log(`[migrate-brands] connecting (${dryRun ? 'DRY RUN' : 'APPLY'})…`);
  await mongoose.connect(mongoUri);
  try {
    const stats = await runBrandMigration(mongoosePort(), { dryRun });

    console.log('[migrate-brands] done');
    console.table({
      'Offers scanned': stats.offersScanned,
      'Offers already linked (skipped)': stats.offersAlreadyLinked,
      'Brands created': stats.brandsCreated,
      'Brands reused': stats.brandsReused,
      'Offers linked this run': stats.offersLinked,
      'Offers linked concurrently': stats.offersLinkedConcurrently,
      'Tracked media classified': stats.trackedMediaClassified,
      'Tracked media fenced (apply only)': stats.trackedMediaAttachments,
      'Legacy media (nondeletable)': stats.legacyMediaClassifiedNondeletable,
      Errors: stats.errors.length,
      'Ambiguous slug/name conflicts': stats.ambiguousNames.length,
    });
    for (const ambiguity of stats.ambiguousNames) {
      console.warn(`[migrate-brands] ambiguous: ${ambiguity}`);
    }
    return stats.errors.length > 0 ? 2 : 0;
  } finally {
    await mongoose.disconnect();
  }
}

const directExecution =
  typeof require !== 'undefined' && typeof module !== 'undefined'
    ? require.main === module
    : process.argv[1]?.endsWith('migrate-brands.ts');
if (directExecution) {
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      console.error('[migrate-brands] fatal error:', error);
      process.exitCode = 1;
    });
}
