import { ServiceUnavailableException } from '@nestjs/common';

import {
  CATEGORY_INTEGRITY_MIGRATION_VERSION,
  CATEGORY_INTEGRITY_STATE_KEY,
  PolicyIntegrityFenceService,
} from './policy-integrity-fence.service';

function query<T>(value: T) {
  return {
    lean: jest.fn().mockResolvedValue(value),
  };
}

describe('PolicyIntegrityFenceService', () => {
  it('rejects a mutation when the durable marker changes after readiness', async () => {
    const session = {
      withTransaction: jest.fn(async (writer: () => Promise<void>) => writer()),
      endSession: jest.fn().mockResolvedValue(undefined),
    };
    const stateModel = {
      findOne: jest.fn(() =>
        query({
          key: CATEGORY_INTEGRITY_STATE_KEY,
          status: 'ready',
          migration_version: CATEGORY_INTEGRITY_MIGRATION_VERSION,
        }),
      ),
      findOneAndUpdate: jest.fn(() => query(null)),
      collection: { indexes: jest.fn() },
    };
    const service = new PolicyIntegrityFenceService(
      { startSession: jest.fn().mockResolvedValue(session) } as never,
      { collection: { indexes: jest.fn() } } as never,
      { collection: { indexes: jest.fn() } } as never,
      { collection: { indexes: jest.fn() } } as never,
      { collection: { indexes: jest.fn() } } as never,
      stateModel as never,
      { collection: { indexes: jest.fn() } } as never,
      { collection: { indexes: jest.fn() } } as never,
      { collection: { indexes: jest.fn() } } as never,
      { collection: { indexes: jest.fn() } } as never,
    );

    await expect(service.fenceReady(session as never)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(stateModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        key: CATEGORY_INTEGRITY_STATE_KEY,
        status: 'ready',
        migration_version: CATEGORY_INTEGRITY_MIGRATION_VERSION,
      }),
      { $inc: { write_epoch: 1 } },
      expect.objectContaining({ session }),
    );
  });
});
