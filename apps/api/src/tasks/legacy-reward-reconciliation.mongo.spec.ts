import { ObjectId } from 'mongodb';
import { MongoLegacyRewardReconciliationStore } from './legacy-reward-reconciliation.mongo';

describe('MongoLegacyRewardReconciliationStore', () => {
  it('preserves ObjectId storage for rank recipient identity backfills', async () => {
    const updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });
    const db = {
      collection: jest.fn(() => ({ updateOne })),
    };
    const conversionId = new ObjectId();
    const userId = new ObjectId();
    const store = new MongoLegacyRewardReconciliationStore(db as never);

    await expect(
      store.compareAndSet({
        collection: 'conversions',
        id: conversionId.toHexString(),
        identity: 'rank recipient identity',
        expected: { user_id: undefined },
        set: {
          user_id: userId.toHexString(),
          aff_sub1: `user_id:${userId.toHexString()}`,
        },
      }),
    ).resolves.toBe(true);

    expect(updateOne).toHaveBeenCalledWith(
      {
        _id: expect.any(ObjectId),
        user_id: { $exists: false },
      },
      {
        $set: {
          user_id: expect.any(ObjectId),
          aff_sub1: `user_id:${userId.toHexString()}`,
        },
      },
    );
    expect(
      (updateOne.mock.calls[0][1].$set.user_id as ObjectId).toHexString(),
    ).toBe(userId.toHexString());
  });

  it('converts an existing normalized user_id into an ObjectId CAS filter', async () => {
    const updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });
    const db = { collection: jest.fn(() => ({ updateOne })) };
    const userId = new ObjectId();
    const store = new MongoLegacyRewardReconciliationStore(db as never);

    await store.compareAndSet({
      collection: 'conversions',
      id: new ObjectId().toHexString(),
      identity: 'rank canonical identity',
      expected: { user_id: userId.toHexString(), aff_sub1: undefined },
      set: { aff_sub1: `user_id:${userId.toHexString()}` },
    });

    expect(updateOne.mock.calls[0][0].user_id).toBeInstanceOf(ObjectId);
    expect(updateOne.mock.calls[0][0].user_id.toHexString()).toBe(
      userId.toHexString(),
    );
  });
});
