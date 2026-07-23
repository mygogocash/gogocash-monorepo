import { inspectPolicyTransactionCapability } from './policy-transaction-capability';

describe('inspectPolicyTransactionCapability', () => {
  it('reports unavailable when the mongoose connection has no db yet', async () => {
    await expect(
      inspectPolicyTransactionCapability({ db: undefined } as never),
    ).resolves.toEqual({
      supported: false,
      topology: 'unavailable',
      reason: 'MongoDB connection is not ready',
    });
  });

  it('supports replica-set topology that advertises logical sessions', async () => {
    const connection = {
      db: {
        admin: () => ({
          command: async () => ({
            setName: 'atlas-shard-0',
            logicalSessionTimeoutMinutes: 30,
          }),
        }),
      },
    };

    await expect(
      inspectPolicyTransactionCapability(connection as never),
    ).resolves.toEqual({
      supported: true,
      topology: 'replica-set',
    });
  });

  it('rejects standalone topology even when sessions are advertised', async () => {
    const connection = {
      db: {
        admin: () => ({
          command: async () => ({
            logicalSessionTimeoutMinutes: 30,
          }),
        }),
      },
    };

    await expect(
      inspectPolicyTransactionCapability(connection as never),
    ).resolves.toEqual({
      supported: false,
      topology: 'standalone',
      reason: 'MongoDB is not a replica set or mongos',
    });
  });

  it('rejects replica-set topology that does not advertise sessions', async () => {
    const connection = {
      db: {
        admin: () => ({
          command: async () => ({
            setName: 'rs0',
          }),
        }),
      },
    };

    await expect(
      inspectPolicyTransactionCapability(connection as never),
    ).resolves.toEqual({
      supported: false,
      topology: 'replica-set',
      reason: 'MongoDB topology does not advertise sessions',
    });
  });

  it('sanitizes probe failures to an unavailable result with error name', async () => {
    const connection = {
      db: {
        admin: () => ({
          command: async () => {
            throw new TypeError('boom');
          },
        }),
      },
    };

    await expect(
      inspectPolicyTransactionCapability(connection as never),
    ).resolves.toEqual({
      supported: false,
      topology: 'unavailable',
      reason: 'MongoDB transaction capability check failed (TypeError)',
    });
  });
});
