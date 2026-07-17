import {
  CONVERSION_PROVIDER_IDENTITY_INDEX,
  migrateConversionProviderIdentity,
} from './conversion-provider-index.migration';

describe('conversion provider identity index migration', () => {
  it('backfills before creating provider uniqueness and only then removes raw-id uniqueness', async () => {
    const calls: string[] = [];
    let indexes: Array<{
      name: string;
      key: Record<string, number>;
      unique?: boolean;
    }> = [
      { name: '_id_', key: { _id: 1 } },
      { name: 'conversion_id_1', key: { conversion_id: 1 }, unique: true },
    ];
    const collection = {
      countDocuments: jest
        .fn()
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(3),
      aggregate: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([]),
      }),
      indexes: jest.fn(async () => indexes),
      updateMany: jest.fn(async () => {
        calls.push('backfill');
        return { modifiedCount: 3 };
      }),
      createIndex: jest.fn(async (key, options) => {
        calls.push(`create:${String(options.name)}`);
        indexes.push({
          name: String(options.name),
          key,
          ...(options.unique ? { unique: true } : {}),
        });
        return String(options.name);
      }),
      dropIndex: jest.fn(async (name) => {
        calls.push(`drop:${name}`);
        indexes = indexes.filter((index) => index.name !== name);
      }),
    };

    await expect(
      migrateConversionProviderIdentity(collection as never, { apply: true }),
    ).resolves.toMatchObject({
      modified: 3,
      provider_index_ready: true,
      legacy_unique_index_present: false,
      applied: true,
    });
    expect(calls).toEqual([
      'backfill',
      `create:${CONVERSION_PROVIDER_IDENTITY_INDEX}`,
      'drop:conversion_id_1',
      'create:conversion_id_1',
    ]);
  });

  it('aborts before writes when canonical identities collide', async () => {
    const collection = {
      countDocuments: jest.fn().mockResolvedValue(2),
      aggregate: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([
          {
            _id: {
              source: 'involve',
              provider_account: 'default',
              provider_conversion_id: '1',
            },
            count: 2,
          },
        ]),
      }),
      indexes: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn(),
    };

    await expect(
      migrateConversionProviderIdentity(collection as never, { apply: true }),
    ).rejects.toThrow('duplicate canonical identities');
    expect(collection.updateMany).not.toHaveBeenCalled();
  });
});
