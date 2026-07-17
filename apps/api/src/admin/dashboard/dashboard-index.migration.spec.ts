import {
  DASHBOARD_INDEX_DEFINITIONS,
  migrateDashboardIndexes,
} from './dashboard-index.migration';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('dashboard index migration', () => {
  function fixture() {
    const indexes = new Map<
      string,
      Array<{
        name: string;
        key: object;
        hidden?: boolean;
        sparse?: boolean;
        unique?: boolean;
        partialFilterExpression?: Record<string, unknown>;
        collation?: Record<string, unknown>;
        expireAfterSeconds?: number;
      }>
    >();
    const createIndex = jest.fn(
      async (
        collection: string,
        key: Record<string, number>,
        options: { name: string },
      ) => {
        const rows = indexes.get(collection) ?? [
          { name: '_id_', key: { _id: 1 } },
        ];
        rows.push({ name: options.name, key });
        indexes.set(collection, rows);
        return options.name;
      },
    );
    const dropIndex = jest.fn(async (collection: string, name: string) => {
      indexes.set(
        collection,
        (indexes.get(collection) ?? []).filter((index) => index.name !== name),
      );
    });
    const database = {
      collection: jest.fn((collection: string) => ({
        indexes: jest.fn(
          async () =>
            indexes.get(collection) ?? [{ name: '_id_', key: { _id: 1 } }],
        ),
        createIndex: jest.fn(
          (key: Record<string, number>, options: { name: string }) =>
            createIndex(collection, key, options),
        ),
        dropIndex: jest.fn((name: string) => dropIndex(collection, name)),
      })),
    };
    return { database, createIndex, dropIndex, indexes };
  }

  it('creates each named read index without modifying provider identity indexes', async () => {
    const { database, createIndex } = fixture();

    const report = await migrateDashboardIndexes(database as never, {
      apply: true,
    });

    expect(createIndex).toHaveBeenCalledTimes(
      DASHBOARD_INDEX_DEFINITIONS.length,
    );
    expect(createIndex).toHaveBeenCalledWith(
      'conversions',
      { datetime_conversion: 1 },
      { name: 'dashboard_conversion_scope_v1' },
    );
    expect(createIndex.mock.calls.flat().join(' ')).not.toContain(
      'uniq_conversion_provider_identity',
    );
    expect(report).toEqual({
      applied: true,
      ready: true,
      indexes: DASHBOARD_INDEX_DEFINITIONS.map(({ collection, name }) => ({
        collection,
        name,
        ready: true,
        action: 'created',
      })),
    });
  });

  it('is a read-only readiness check in dry-run mode', async () => {
    const { database, createIndex } = fixture();

    const report = await migrateDashboardIndexes(database as never, {
      apply: false,
    });

    expect(createIndex).not.toHaveBeenCalled();
    expect(report.applied).toBe(false);
    expect(report.ready).toBe(false);
    expect(report.indexes.every((index) => index.action === 'missing')).toBe(
      true,
    );
  });

  it('is idempotent on a second apply when every named key is ready', async () => {
    const { database, createIndex, dropIndex } = fixture();
    await migrateDashboardIndexes(database as never, { apply: true });
    createIndex.mockClear();
    dropIndex.mockClear();

    const report = await migrateDashboardIndexes(database as never, {
      apply: true,
    });

    expect(createIndex).not.toHaveBeenCalled();
    expect(dropIndex).not.toHaveBeenCalled();
    expect(report.ready).toBe(true);
    expect(report.indexes.every((index) => index.action === 'ready')).toBe(
      true,
    );
  });

  it('accepts an equivalent key under an existing different name without recreating it', async () => {
    const { database, createIndex, dropIndex, indexes } = fixture();
    indexes.set('users', [
      { name: '_id_', key: { _id: 1 } },
      { name: 'createdAt_1', key: { createdAt: 1 } },
    ]);

    const report = await migrateDashboardIndexes(database as never, {
      apply: true,
    });

    expect(createIndex).not.toHaveBeenCalledWith(
      'users',
      expect.anything(),
      expect.anything(),
    );
    expect(dropIndex).not.toHaveBeenCalled();
    expect(
      report.indexes.find((index) => index.collection === 'users'),
    ).toMatchObject({ ready: true, action: 'ready' });
  });

  it('does not accept hidden or partial matching keys as ready read indexes', async () => {
    const { database, indexes } = fixture();
    indexes.set('users', [
      { name: '_id_', key: { _id: 1 } },
      {
        name: 'hidden_created_at',
        key: { createdAt: 1 },
        hidden: true,
      },
    ]);
    indexes.set('usermycashbacks', [
      { name: '_id_', key: { _id: 1 } },
      {
        name: 'partial_created_at',
        key: { createdAt: 1 },
        partialFilterExpression: { createdAt: { $exists: true } },
      },
    ]);

    const report = await migrateDashboardIndexes(database as never, {
      apply: false,
    });

    expect(
      report.indexes.find((index) => index.collection === 'users'),
    ).toMatchObject({ ready: false, action: 'missing' });
    expect(
      report.indexes.find((index) => index.collection === 'usermycashbacks'),
    ).toMatchObject({ ready: false, action: 'missing' });
  });

  it('fails closed on a same-name conflicting key and never drops it', async () => {
    const { database, createIndex, dropIndex, indexes } = fixture();
    indexes.set('users', [
      { name: '_id_', key: { _id: 1 } },
      {
        name: 'dashboard_user_created_at_v1',
        key: { createdAt: -1 },
      },
    ]);

    await expect(
      migrateDashboardIndexes(database as never, { apply: true }),
    ).rejects.toThrow(/conflicting index.*dashboard_user_created_at_v1/i);
    expect(createIndex).not.toHaveBeenCalledWith(
      'users',
      expect.anything(),
      expect.anything(),
    );
    expect(dropIndex).not.toHaveBeenCalled();
  });

  it('re-reads and verifies the key after creation', async () => {
    const { database } = fixture();
    const collection = database.collection('users');
    collection.indexes
      .mockResolvedValueOnce([{ name: '_id_', key: { _id: 1 } }])
      .mockResolvedValueOnce([{ name: '_id_', key: { _id: 1 } }]);
    database.collection.mockImplementation((name: string) =>
      name === 'users'
        ? collection
        : ({
            indexes: jest.fn(async () => [
              { name: '_id_', key: { _id: 1 } },
              {
                name: `existing_${name}`,
                key:
                  name === 'conversions'
                    ? { datetime_conversion: 1 }
                    : { currency: 1, status: 1, createdAt: 1 },
              },
            ]),
            createIndex: jest.fn(),
          } as never),
    );

    await expect(
      migrateDashboardIndexes(database as never, { apply: true }),
    ).rejects.toThrow(/could not be verified/i);
  });

  it('does not accept an unusable same-key index after a failed create', async () => {
    const { database } = fixture();
    const hiddenUserIndex = {
      name: 'hidden_created_at',
      key: { createdAt: 1 },
      hidden: true,
    };
    const userCollection = {
      indexes: jest.fn(async () => [
        { name: '_id_', key: { _id: 1 } },
        hiddenUserIndex,
      ]),
      createIndex: jest.fn(
        async (
          _key: Record<string, number>,
          _options: { name: string },
        ): Promise<string> => {
          throw new Error('index options conflict');
        },
      ),
      dropIndex: jest.fn(),
    };
    database.collection.mockImplementation((name: string) => {
      if (name === 'users') return userCollection;
      const definition = DASHBOARD_INDEX_DEFINITIONS.find(
        (candidate) => candidate.collection === name,
      );
      return {
        indexes: jest.fn(async () => [
          { name: '_id_', key: { _id: 1 } },
          { name: `existing_${name}`, key: definition?.key ?? {} },
        ]),
        createIndex: jest.fn(
          async (
            _key: Record<string, number>,
            options: { name: string },
          ): Promise<string> => options.name,
        ),
        dropIndex: jest.fn(),
      };
    });

    await expect(
      migrateDashboardIndexes(database as never, { apply: true }),
    ).rejects.toThrow('index options conflict');
    expect(userCollection.indexes).toHaveBeenCalledTimes(2);
  });

  it('has a dry-run-default CLI with an explicit apply flag', () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(__dirname, '../../../package.json'), 'utf8'),
    ) as { scripts: Record<string, string> };
    const command = packageJson.scripts['migrate:dashboard-indexes'];

    expect(command).toContain('scripts/migrate-dashboard-indexes.ts');
    expect(command).not.toContain('--apply');
    expect(
      existsSync(
        resolve(__dirname, '../../../scripts/migrate-dashboard-indexes.ts'),
      ),
    ).toBe(true);
    const source = readFileSync(
      resolve(__dirname, '../../../scripts/migrate-dashboard-indexes.ts'),
      'utf8',
    );
    expect(source).toContain("process.argv.includes('--apply')");
    expect(source).toContain("argument('confirm-target')");
    expect(source).toContain('explicit database name');
  });
});
