import fs from 'node:fs';
import path from 'node:path';

type InventoryEntry = {
  id: string;
  path: string;
  domains: string[];
  classification: string;
  operational?: boolean;
  evidence: string[];
};

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const inventory = JSON.parse(
  fs.readFileSync(
    path.join(REPO_ROOT, 'scripts/policy-media-writer-inventory.json'),
    'utf8',
  ),
) as { version: number; writers: InventoryEntry[] };

const CLASSIFICATIONS = new Set([
  'durable-command-registry-fenced',
  'registry-transaction-fenced',
  'registry-deletion-fenced',
  'readiness-registry-backfill',
  'legacy-untracked-nondeletable',
]);

function source(relativePath: string) {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
}

function walk(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

function relative(absolute: string) {
  return path.relative(REPO_ROOT, absolute).split(path.sep).join('/');
}

function operationalMediaCandidates(): string[] {
  const files = [
    ...walk(path.join(REPO_ROOT, 'apps/api/scripts')),
    ...walk(path.join(REPO_ROOT, 'scripts')),
  ].filter((file) => /\.(?:ts|cjs|mjs)$/.test(file) && !/\.test\./.test(file));
  return files
    .filter((file) => {
      const value = fs.readFileSync(file, 'utf8');
      return (
        (/GCS_R2_TARGET_SPECS/.test(value) &&
          /compareAndSet\s*\(/.test(value)) ||
        (/registryUpserts/.test(value) && /bulkWrite\s*\(/.test(value)) ||
        (/migrate-brands/.test(value) && /insertBrand\s*\(/.test(value)) ||
        (/offersCollection/.test(value) &&
          /fieldUpdates/.test(value) &&
          /updateOne\s*\(/.test(value))
      );
    })
    .map(relative)
    .sort();
}

function productionAggregateCandidates(): string[] {
  const roots = ['admin', 'offer', 'brand', 'involve', 'policy'].map((folder) =>
    path.join(REPO_ROOT, 'apps/api/src', folder),
  );
  return roots
    .flatMap(walk)
    .filter(
      (file) =>
        file.endsWith('.ts') &&
        !/\.(?:spec|test)\.ts$/.test(file) &&
        !file.endsWith('.controller.ts'),
    )
    .filter((file) => {
      const value = fs.readFileSync(file, 'utf8');
      return (
        /\b(?:logo_asset|banner_asset|logo_desktop|logo_mobile|logo_circle|banner_mobile|image_asset|touchAttachInSession|registerCommandOwnedInSession|beginDeleteInSession|deleteCommandOwnedStrict)\b/.test(
          value,
        ) &&
        /\b(?:create|updateOne|updateMany|findOneAndUpdate|findByIdAndUpdate|bulkWrite)\s*\(/.test(
          value,
        )
      );
    })
    .map(relative)
    .sort();
}

describe('policy media writer inventory contract', () => {
  it('has unique, complete entries with live evidence and an allowed classification', () => {
    expect(inventory.version).toBe(1);
    expect(inventory.writers.length).toBeGreaterThanOrEqual(13);
    expect(new Set(inventory.writers.map((entry) => entry.id)).size).toBe(
      inventory.writers.length,
    );
    expect(new Set(inventory.writers.map((entry) => entry.path)).size).toBe(
      inventory.writers.length,
    );
    for (const entry of inventory.writers) {
      expect(CLASSIFICATIONS.has(entry.classification)).toBe(true);
      expect(entry.domains.length).toBeGreaterThan(0);
      const value = source(entry.path);
      for (const evidence of entry.evidence) expect(value).toContain(evidence);
    }
  });

  it('covers every Category, Offer, Brand, and Involve surface', () => {
    const domains = new Set(
      inventory.writers.flatMap((entry) => entry.domains),
    );
    expect(domains).toEqual(new Set(['Category', 'Offer', 'Brand', 'Involve']));
  });

  it('classifies every discovered production aggregate media mutator', () => {
    const classified = inventory.writers
      .filter((entry) => !entry.operational)
      .map((entry) => entry.path)
      .sort();
    expect(productionAggregateCandidates()).toEqual(classified);
  });

  it('classifies every discovered operational media mutator', () => {
    const operational = new Set(
      inventory.writers
        .filter((entry) => entry.operational)
        .map((entry) => entry.path),
    );
    expect(operationalMediaCandidates()).toEqual([...operational].sort());
  });

  it('requires legacy writers to carry explicit nondeletable evidence', () => {
    const legacy = inventory.writers.filter(
      (entry) => entry.classification === 'legacy-untracked-nondeletable',
    );
    expect(legacy.map((entry) => entry.id).sort()).toEqual([
      'figma-offer-media-sync',
      'gcs-r2-url-migration',
    ]);
    for (const entry of legacy) {
      expect(entry.evidence.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('keeps manifest synchronization dry-run by default at both CLI layers', () => {
    const rootPackage = JSON.parse(
      fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'),
    );
    expect(rootPackage.scripts['figma:brand-logos:sync-offers']).toContain(
      '--dry-run',
    );
    expect(
      source('scripts/figma-brand-logos/sync-offer-media-from-manifest.mjs'),
    ).toContain('const dryRun = !argv.includes("--apply")');
  });

  it('keeps the GCS migration native-Node, dry-run by default, and fail-closed', () => {
    const apiPackage = JSON.parse(
      fs.readFileSync(path.join(REPO_ROOT, 'apps/api/package.json'), 'utf8'),
    );
    const command = apiPackage.scripts['media:migrate-gcs-to-r2'];
    const dryCommand = apiPackage.scripts['media:migrate-gcs-to-r2:dry'];
    expect(command).toContain('--experimental-strip-types');
    expect(command).not.toContain('@swc-node/register');
    expect(command).not.toContain('--apply');
    expect(dryCommand).toContain('--experimental-strip-types');
    expect(dryCommand).toContain('--dry-run');
    expect(dryCommand).not.toContain('@swc-node/register');
    const value = source('apps/api/scripts/migrate-stored-media-gcs-to-r2.ts');
    expect(value).toContain("dryRun: !argv.includes('--apply')");
    expect(value).toContain('assertNoStructuredProof');
    expect(value).toContain('assertRegistryAbsent');
    expect(value).toContain('changed after safety checks; refusing overwrite');
  });
});
