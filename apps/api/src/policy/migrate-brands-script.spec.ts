import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { ClientSession, Types } from 'mongoose';

import {
  BrandMigrationPort,
  parseBrandMigrationArgs,
  policyMediaUrlHash,
  runBrandMigration,
} from '../../scripts/migrate-brands';

type OfferRow = {
  _id: string;
  offer_id: number;
  merchant_id: number;
  offer_name: string;
  lookup_value: string;
  logo: string;
  logo_circle: string;
  logo_desktop: string;
  logo_asset?: { url?: unknown; ownership?: unknown };
  banner: string;
  banner_asset?: { url?: unknown; ownership?: unknown };
  description: string;
  categories: string;
  brand_id?: Types.ObjectId;
};

type SharedState = {
  brands: Map<string, { _id: string; brand_slug: string }>;
  registry: Map<
    string,
    {
      _id: string;
      url_hash: string;
      url: string;
      state: string;
      revision: number;
    }
  >;
  links: Map<string, string>;
  events: string[];
  nextBrand: number;
  lock: Promise<void>;
  release?: () => void;
};

function offer(id: string, patch: Partial<OfferRow> = {}): OfferRow {
  return {
    _id: id,
    offer_id: Number(id.replace(/\D/g, '')) || 1,
    merchant_id: 42,
    offer_name: 'Acme - TH',
    lookup_value: 'acme_th',
    logo: 'https://media.example/acme-logo.png',
    logo_circle: '',
    logo_desktop: '',
    banner: '',
    description: '',
    categories: 'Shopping',
    ...patch,
  };
}

function state(): SharedState {
  return {
    brands: new Map(),
    registry: new Map(),
    links: new Map(),
    events: [],
    nextBrand: 1,
    lock: Promise.resolve(),
  };
}

function silentLogger() {
  return {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    table: jest.fn(),
  };
}

function port(rows: OfferRow[], shared: SharedState): BrandMigrationPort {
  return {
    async *scanOffers() {
      for (const row of rows) yield row;
    },
    async findBrandBySlug(slug) {
      return shared.brands.get(slug) ?? null;
    },
    async findRegistryByHash(hash) {
      shared.events.push('registry:read');
      return shared.registry.get(hash) ?? null;
    },
    async touchActiveRegistry(row) {
      shared.events.push('registry:touch');
      const current = shared.registry.get(row.url_hash);
      if (
        !current ||
        current.state !== 'active' ||
        current.revision !== row.revision
      ) {
        return false;
      }
      current.revision += 1;
      return true;
    },
    async insertBrand(value) {
      shared.events.push('brand:create');
      if (shared.brands.has(value.brand_slug)) {
        throw Object.assign(new Error('duplicate brand slug'), { code: 11000 });
      }
      const created = {
        _id: `brand-${shared.nextBrand++}`,
        brand_slug: value.brand_slug,
      };
      shared.brands.set(value.brand_slug, created);
      return created;
    },
    async linkOffer(offerId, brandId) {
      shared.events.push('offer:link');
      const key = String(offerId);
      const current = shared.links.get(key);
      if (current) {
        if (current !== String(brandId)) {
          throw new Error('Offer concurrently linked to another Brand');
        }
        return 'already-linked';
      }
      shared.links.set(key, String(brandId));
      return 'linked';
    },
    async withTransaction<T>(work: (session: ClientSession) => Promise<T>) {
      // The mutex models MongoDB's serialization of conflicting Brand/registry
      // writes and makes the concurrent migration test deterministic.
      const previous = shared.lock;
      let release!: () => void;
      shared.lock = new Promise<void>((resolve) => {
        release = resolve;
      });
      await previous;
      shared.events.push('tx:start');
      try {
        const result = await work({} as ClientSession);
        shared.events.push('tx:commit');
        return result;
      } finally {
        release();
      }
    },
  };
}

describe('migrate-brands policy media contract', () => {
  it('defaults direct invocation to dry-run and requires explicit apply', () => {
    expect(parseBrandMigrationArgs([])).toEqual({ dryRun: true });
    expect(parseBrandMigrationArgs(['--dry-run'])).toEqual({ dryRun: true });
    expect(parseBrandMigrationArgs(['--apply'])).toEqual({ dryRun: false });
    expect(() => parseBrandMigrationArgs(['--apply', '--dry-run'])).toThrow(
      'Choose either --apply or --dry-run',
    );
  });

  it('uses the Node 24 native TypeScript runner instead of the incompatible SWC register hook', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8'),
    );
    expect(packageJson.engines.node).toBe('>=24');
    expect(packageJson.scripts['migrate:brands']).toContain(
      '--experimental-strip-types scripts/migrate-brands.ts',
    );
    expect(packageJson.scripts['migrate:brands']).toContain('--apply');
    expect(packageJson.scripts['migrate:brands:dry']).toContain('--dry-run');
    expect(packageJson.scripts['migrate:brands']).not.toContain(
      '@swc-node/register',
    );
  });

  it('boots under the current Node 24 binary and refuses a dry-run without Mongo', () => {
    const env = { ...process.env };
    delete env.MONGO_URI;
    const result = spawnSync(
      process.execPath,
      [
        '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
        '--experimental-strip-types',
        'scripts/migrate-brands.ts',
        '--dry-run',
      ],
      {
        cwd: path.resolve(__dirname, '../..'),
        env,
        encoding: 'utf8',
      },
    );
    expect(process.versions.node).toMatch(/^24\./);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('MONGO_URI is not set. Aborting.');
    expect(result.stderr).not.toContain('ts.Extension');
  });

  it('dry-run classifies media but performs no transaction or mutation', async () => {
    const shared = state();
    const stats = await runBrandMigration(port([offer('offer-1')], shared), {
      dryRun: true,
      logger: silentLogger(),
    });

    expect(stats).toMatchObject({
      offersScanned: 1,
      brandsCreated: 1,
      offersLinked: 1,
      legacyMediaClassifiedNondeletable: 1,
      errors: [],
    });
    expect(shared.brands.size).toBe(0);
    expect(shared.links.size).toBe(0);
    expect(shared.events).toEqual(['registry:read']);
  });

  it('touches an active tracked URL before Brand creation and Offer linking in one transaction', async () => {
    const shared = state();
    const url = 'https://media.example/acme-logo.png';
    const hash = policyMediaUrlHash(url);
    shared.registry.set(hash, {
      _id: 'registry-1',
      url_hash: hash,
      url,
      state: 'active',
      revision: 1,
    });

    const stats = await runBrandMigration(port([offer('offer-1')], shared), {
      dryRun: false,
      logger: silentLogger(),
    });

    expect(stats).toMatchObject({
      brandsCreated: 1,
      offersLinked: 1,
      trackedMediaAttachments: 1,
      legacyMediaClassifiedNondeletable: 0,
      errors: [],
    });
    expect(shared.events).toEqual([
      'tx:start',
      'registry:read',
      'registry:touch',
      'brand:create',
      'offer:link',
      'tx:commit',
    ]);
  });

  it('fails closed without creating or linking when tracked media is deleting', async () => {
    const shared = state();
    const url = 'https://media.example/acme-logo.png';
    const hash = policyMediaUrlHash(url);
    shared.registry.set(hash, {
      _id: 'registry-1',
      url_hash: hash,
      url,
      state: 'deleting',
      revision: 2,
    });

    const stats = await runBrandMigration(port([offer('offer-1')], shared), {
      dryRun: false,
      logger: silentLogger(),
    });

    expect(stats.errors).toHaveLength(1);
    expect(stats.errors[0].error).toContain('state is deleting');
    expect(shared.brands.size).toBe(0);
    expect(shared.links.size).toBe(0);
    expect(shared.events).not.toContain('registry:touch');
  });

  it('quarantines command-owned structured proof when its registry row is absent', async () => {
    const shared = state();
    const url = 'https://media.example/acme-logo.png';
    const stats = await runBrandMigration(
      port(
        [
          offer('offer-1', {
            logo_asset: { url, ownership: 'command-owned' },
          }),
        ],
        shared,
      ),
      { dryRun: false, logger: silentLogger() },
    );

    expect(stats.errors[0]?.error).toContain('missing its registry fence');
    expect(shared.brands.size).toBe(0);
    expect(shared.links.size).toBe(0);
    expect(shared.events).not.toContain('brand:create');
  });

  it('fences command-owned structured proof when its active registry row exists', async () => {
    const shared = state();
    const url = 'https://media.example/acme-logo.png';
    const hash = policyMediaUrlHash(url);
    shared.registry.set(hash, {
      _id: 'registry-1',
      url_hash: hash,
      url,
      state: 'active',
      revision: 4,
    });
    const stats = await runBrandMigration(
      port(
        [
          offer('offer-1', {
            logo_asset: { url, ownership: 'command-owned' },
          }),
        ],
        shared,
      ),
      { dryRun: false, logger: silentLogger() },
    );

    expect(stats).toMatchObject({
      trackedMediaAttachments: 1,
      legacyMediaClassifiedNondeletable: 0,
      errors: [],
    });
    expect(shared.events.indexOf('registry:touch')).toBeLessThan(
      shared.events.indexOf('brand:create'),
    );
  });

  it('classifies explicit legacy proof as nondeletable without creating registry ownership', async () => {
    const shared = state();
    const url = 'https://media.example/acme-logo.png';
    const stats = await runBrandMigration(
      port(
        [
          offer('offer-1', {
            logo_asset: { url, ownership: 'legacy-unverified' },
          }),
        ],
        shared,
      ),
      { dryRun: false, logger: silentLogger() },
    );

    expect(stats).toMatchObject({
      brandsCreated: 1,
      offersLinked: 1,
      legacyMediaClassifiedNondeletable: 1,
      trackedMediaAttachments: 0,
      errors: [],
    });
    expect(shared.events).not.toContain('registry:touch');
  });

  it('fails closed when structured proof and its raw URL disagree', async () => {
    const shared = state();
    const stats = await runBrandMigration(
      port(
        [
          offer('offer-1', {
            logo_asset: {
              url: 'https://media.example/different.png',
              ownership: 'command-owned',
            },
          }),
        ],
        shared,
      ),
      { dryRun: true, logger: silentLogger() },
    );

    expect(stats.errors[0]?.error).toContain('does not match');
    expect(shared.events).toEqual([]);
  });

  it('concurrent runs create one Brand, fence once, and link both variants', async () => {
    const shared = state();
    const url = 'https://media.example/acme-logo.png';
    const hash = policyMediaUrlHash(url);
    shared.registry.set(hash, {
      _id: 'registry-1',
      url_hash: hash,
      url,
      state: 'active',
      revision: 1,
    });

    const [th, sg] = await Promise.all([
      runBrandMigration(port([offer('offer-1')], shared), {
        dryRun: false,
        logger: silentLogger(),
      }),
      runBrandMigration(
        port(
          [
            offer('offer-2', {
              offer_name: 'Acme - SG',
              lookup_value: 'acme_sg',
            }),
          ],
          shared,
        ),
        { dryRun: false, logger: silentLogger() },
      ),
    ]);

    expect(th.errors).toEqual([]);
    expect(sg.errors).toEqual([]);
    expect(shared.brands.size).toBe(1);
    expect(shared.links.size).toBe(2);
    expect(
      shared.events.filter((event) => event === 'registry:touch'),
    ).toHaveLength(1);
    expect(th.brandsCreated + sg.brandsCreated).toBe(1);
    expect(th.brandsReused + sg.brandsReused).toBe(1);
  });
});
