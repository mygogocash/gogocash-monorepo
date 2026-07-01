import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildSeedOperations,
  parseSeedOptions,
} from '../../scripts/seed-gototrack-merchants';

describe('GoGoTrack merchant seed script helpers', () => {
  it('selects only the first merchant when --enable-first is set', () => {
    const options = parseSeedOptions(['--dry-run', '--enable-first']);
    const operations = buildSeedOperations(options);

    expect(options.dryRun).toBe(true);
    expect(operations).toHaveLength(30);
    expect(operations[0]).toMatchObject({
      enableSelected: true,
      willSetEnabled: true,
    });
    expect(
      operations
        .slice(1)
        .every((operation) => operation.willSetEnabled === undefined),
    ).toBe(true);
  });

  it('matches explicit selectors against Android package names', () => {
    const options = parseSeedOptions(['--enable=com.shopee.th']);
    const operations = buildSeedOperations(options);
    const shopee = operations.find((operation) =>
      operation.androidPackages.includes('com.shopee.th'),
    );

    expect(shopee).toBeDefined();
    expect(shopee?.enableSelected).toBe(true);
    expect(shopee?.willSetEnabled).toBe(true);
  });

  it('can reset all non-selected merchants to disabled', () => {
    const options = parseSeedOptions(['--enable=shopee', '--reset-enabled']);
    const operations = buildSeedOperations(options);

    expect(
      operations.some((operation) => operation.willSetEnabled === true),
    ).toBe(true);
    expect(
      operations.some((operation) => operation.willSetEnabled === false),
    ).toBe(true);
  });

  it('writes to gogosense_merchants so the API Mongoose schema can read seeded rows', () => {
    const seedSource = readFileSync(
      join(__dirname, '../../scripts/seed-gototrack-merchants.ts'),
      'utf8',
    );
    expect(seedSource).toContain("collection: 'gogosense_merchants'");
    expect(seedSource).toContain('brand_id: merchant.brand_id');
  });

  it('rejects unknown arguments instead of silently ignoring them', () => {
    expect(() => parseSeedOptions(['--unknown'])).toThrow('Unknown argument');
  });
});
