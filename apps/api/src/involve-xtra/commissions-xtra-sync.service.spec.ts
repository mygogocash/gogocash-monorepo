import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import axios from 'axios';

import { CommissionsXtraSyncService } from './commissions-xtra-sync.service';

jest.mock('axios');
const mockedPost = axios.post as jest.Mock;

const SHOPEEXTRA_FIXTURE = JSON.parse(
  readFileSync(
    join(__dirname, '__fixtures__', 'shopeextra-th.sample.json'),
    'utf8',
  ),
);

function makeService(
  overrides: {
    offerFindResult?: { _id: string } | null;
  } = {},
) {
  const shopModel = {
    updateOne: jest.fn().mockResolvedValue({}),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 2 }),
  };
  const campaignModel = {
    updateOne: jest.fn().mockResolvedValue({}),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
  };
  const offerModel = {
    findOne: jest.fn().mockReturnValue({
      select: () => ({
        lean: () => ({
          exec: async () => overrides.offerFindResult ?? null,
        }),
      }),
    }),
  };
  const involve = {
    getAccessToken: jest.fn().mockResolvedValue('token-1'),
    signIn: jest.fn().mockResolvedValue({ data: { token: 'token-2' } }),
  };
  const analytics = { capture: jest.fn().mockResolvedValue(undefined) };
  const service = new CommissionsXtraSyncService(
    shopModel as never,
    campaignModel as never,
    offerModel as never,
    involve as never,
    analytics as never,
  );
  return { service, shopModel, campaignModel, offerModel, involve, analytics };
}

describe('CommissionsXtraSyncService.syncShopeeXtra', () => {
  beforeEach(() => mockedPost.mockReset());

  it('upserts valid rows, skips malformed, and soft-deletes the rest', async () => {
    mockedPost.mockResolvedValue({ data: SHOPEEXTRA_FIXTURE });
    const { service, shopModel } = makeService();

    const summary = await service.syncShopeeXtra();

    // Fixture has 3 rows; one has an empty commission_rate (skipped).
    expect(summary.fetched).toBe(3);
    expect(summary.upserted).toBe(2);
    expect(summary.skipped).toBe(1);
    expect(shopModel.updateOne).toHaveBeenCalledTimes(2);
    // Every upsert marks the row active with a fresh syncedAt.
    const firstSet = shopModel.updateOne.mock.calls[0][1].$set;
    expect(firstSet.active).toBe(true);
    expect(firstSet.shopId).toBe(1001);
    expect(firstSet.cashbackRate).toBe(0.015);
    // Empty-guard NOT triggered (rows present) → soft-delete sweep runs.
    expect(shopModel.updateMany).toHaveBeenCalledTimes(1);
    const sweepFilter = shopModel.updateMany.mock.calls[0][0];
    expect(sweepFilter.shopId.$nin).toEqual([1001, 1002]);
    expect(summary.softDeleted).toBe(2);
  });

  it('resolves offerId when a parent Offer matches', async () => {
    mockedPost.mockResolvedValue({ data: SHOPEEXTRA_FIXTURE });
    const { service, shopModel, offerModel } = makeService({
      offerFindResult: { _id: 'offer-abc' },
    });

    await service.syncShopeeXtra();

    expect(offerModel.findOne).toHaveBeenCalled();
    expect(shopModel.updateOne.mock.calls[0][1].$set.offerId).toBe('offer-abc');
  });

  it('does NOT run the soft-delete sweep on an empty feed (empty-guard REQ-SYNC-4)', async () => {
    mockedPost.mockResolvedValue({
      data: { status: 'success', data: { count: 0, nextPage: null, data: [] } },
    });
    const { service, shopModel } = makeService();

    const summary = await service.syncShopeeXtra();

    expect(summary.fetched).toBe(0);
    expect(summary.upserted).toBe(0);
    expect(shopModel.updateOne).not.toHaveBeenCalled();
    expect(shopModel.updateMany).not.toHaveBeenCalled();
    expect(summary.softDeleted).toBe(0);
  });

  it('re-authenticates once on a 401 then retries', async () => {
    mockedPost
      .mockRejectedValueOnce({ response: { status: 401 } })
      .mockResolvedValueOnce({ data: SHOPEEXTRA_FIXTURE });
    const { service, involve } = makeService();

    const summary = await service.syncShopeeXtra();

    expect(involve.signIn).toHaveBeenCalledTimes(1);
    expect(summary.upserted).toBe(2);
  });
});
