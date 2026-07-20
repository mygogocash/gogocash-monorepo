import axios from 'axios';
import { OptimiseService } from './optimise.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const leanExec = <T>(value: T) => ({
  lean: () => ({ exec: () => Promise.resolve(value) }),
});

function makeService() {
  const offerModel = {
    updateOne: jest.fn().mockResolvedValue({}),
    updateMany: jest.fn().mockResolvedValue({}),
  };
  const deeplinkModel = {
    findOne: jest.fn().mockReturnValue(leanExec(null)),
    create: jest.fn(),
  };
  const service = new OptimiseService(
    offerModel as never,
    deeplinkModel as never,
  );
  return { service, offerModel, deeplinkModel };
}

describe('OptimiseService', () => {
  const OLD = { ...process.env };
  beforeEach(() => {
    process.env.OPTIMISE_API_KEY = 'test-key';
    process.env.OPTIMISE_CONTACT_ID = '2442123';
    process.env.OPTIMISE_AGENCY_ID = '118';
  });
  afterEach(() => {
    process.env = { ...OLD };
    jest.clearAllMocks();
  });

  describe('syncOffers', () => {
    it('upserts each campaign scoped to source optimise and sweeps stale offers', async () => {
      const { service, offerModel } = makeService();
      jest.spyOn(service, 'fetchAllCampaigns').mockResolvedValue([
        { productId: 1001, name: 'A', status: 'live', advertiserId: '778' },
        { productId: 1002, name: 'B', status: 'waiting' },
      ]);

      await expect(service.syncOffers()).resolves.toEqual({ upserted: 2 });

      expect(offerModel.updateOne).toHaveBeenCalledTimes(2);
      expect(offerModel.updateOne).toHaveBeenNthCalledWith(
        1,
        { source: 'optimise', offer_id: 1001 },
        {
          $set: expect.objectContaining({
            offer_id: 1001,
            source: 'optimise',
            type: 'new',
            disabled: false,
          }),
          $setOnInsert: { status: 'pending_review' },
        },
        { upsert: true },
      );
      // Stale sweep disables offers NOT in this pull, source-scoped.
      expect(offerModel.updateMany).toHaveBeenCalledWith(
        { source: 'optimise', offer_id: { $nin: [1001, 1002] } },
        { $set: { type: 'old', disabled: true } },
      );
    });

    // A source-less legacy doc is canonically an Involve offer (offer.schema.ts
    // defaults `source` to 'involve'). Involve's own sync claims `null` for that
    // reason; Optimise copying that arm would let this sweep disable the entire
    // legacy Involve catalogue on the first run after the key is provisioned,
    // and let an id collision overwrite an Involve offer's tracking link.
    it('never widens its filters to source-less legacy (Involve) documents', async () => {
      const { service, offerModel } = makeService();
      jest
        .spyOn(service, 'fetchAllCampaigns')
        .mockResolvedValue([{ productId: 1001, name: 'A', status: 'live' }]);

      await service.syncOffers();

      const upsertFilter = offerModel.updateOne.mock.calls[0][0];
      const sweepFilter = offerModel.updateMany.mock.calls[0][0];
      for (const filter of [upsertFilter, sweepFilter]) {
        expect(filter.source).toBe('optimise');
        expect(JSON.stringify(filter)).not.toContain('null');
      }
    });

    // `status` is admin curation, not upstream state. Involve's sync writes
    // `type`/`disabled` but never `status`; re-stamping it on every pass would
    // silently revert every approve/reject an admin made.
    it('seeds status only on insert, so a re-sync cannot revert admin curation', async () => {
      const { service, offerModel } = makeService();
      jest
        .spyOn(service, 'fetchAllCampaigns')
        .mockResolvedValue([{ productId: 1001, name: 'A', status: 'live' }]);

      await service.syncOffers();

      const update = offerModel.updateOne.mock.calls[0][1];
      expect(update.$set).not.toHaveProperty('status');
      expect(update.$setOnInsert).toEqual({ status: 'pending_review' });
    });

    it('skips campaigns without a usable product id', async () => {
      const { service, offerModel } = makeService();
      jest
        .spyOn(service, 'fetchAllCampaigns')
        .mockResolvedValue([{ name: 'no-id', status: 'live' }]);

      await expect(service.syncOffers()).resolves.toEqual({ upserted: 0 });
      expect(offerModel.updateOne).not.toHaveBeenCalled();
    });

    it('does NOT sweep when the pull is empty (guards against wiping the catalogue)', async () => {
      const { service, offerModel } = makeService();
      jest.spyOn(service, 'fetchAllCampaigns').mockResolvedValue([]);

      await expect(service.syncOffers()).resolves.toEqual({ upserted: 0 });
      expect(offerModel.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('findOfferByOfferId', () => {
    it('maps a live campaign lookup', async () => {
      const { service } = makeService();
      jest.spyOn(service as never as { httpGet: jest.Mock }, 'httpGet' as never).mockResolvedValue({
        data: { productId: 1001, name: 'A', status: 'live', baseTrackingUrl: 'https://t/1001' },
        headers: {},
      } as never);

      const refreshed = await service.findOfferByOfferId(1001);
      expect(refreshed).toMatchObject({
        offer_id: 1001,
        tracking_link: 'https://t/1001',
      });
    });

    it('returns null on a lookup error (non-fatal)', async () => {
      const { service } = makeService();
      jest
        .spyOn(service as never as { httpGet: jest.Mock }, 'httpGet' as never)
        .mockRejectedValue(new Error('404') as never);

      await expect(service.findOfferByOfferId(9999)).resolves.toBeNull();
    });
  });

  describe('createTrackingLink', () => {
    const req = {
      userId: '5f9d5510aaaaaaaaaaaaaaaa',
      offerId: 1001,
      merchantId: 778,
      targetUrl: 'https://acme.example',
    };

    it('reuses an existing deeplink for the same identity (no mint)', async () => {
      const { service, deeplinkModel } = makeService();
      deeplinkModel.findOne.mockReturnValue(
        leanExec({ deeplink: 'https://track/opt/existing?uid=x' }),
      );
      const gen = jest.spyOn(
        service as never as { generateDeeplink: jest.Mock },
        'generateDeeplink' as never,
      );

      await expect(service.createTrackingLink(req)).resolves.toEqual({
        deeplink: 'https://track/opt/existing?uid=x',
      });
      expect(gen).not.toHaveBeenCalled();
      expect(deeplinkModel.create).not.toHaveBeenCalled();
    });

    it('mints, appends uid, and persists when no deeplink exists', async () => {
      const { service, deeplinkModel } = makeService();
      deeplinkModel.findOne.mockReturnValue(leanExec(null));
      jest
        .spyOn(
          service as never as { generateDeeplink: jest.Mock },
          'generateDeeplink' as never,
        )
        .mockResolvedValue('https://track.optimise/c/1001' as never);
      deeplinkModel.create.mockResolvedValue({
        deeplink: 'https://track.optimise/c/1001?uid=5f9d5510aaaaaaaaaaaaaaaa',
      });

      const result = await service.createTrackingLink(req);

      expect(result).toEqual({
        deeplink: 'https://track.optimise/c/1001?uid=5f9d5510aaaaaaaaaaaaaaaa',
      });
      expect(deeplinkModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'optimise',
          offer_id: 1001,
          merchant_id: 778,
          deeplink: 'https://track.optimise/c/1001?uid=5f9d5510aaaaaaaaaaaaaaaa',
        }),
      );
    });
  });

  describe('httpGet auth + error safety', () => {
    it('sends the api key in the lowercase apikey header', async () => {
      const { service } = makeService();
      mockedAxios.get.mockResolvedValue({ data: [], headers: {} });

      await service.fetchAllCampaigns();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/campaigns/'),
        expect.objectContaining({
          headers: { apikey: 'test-key' },
          params: expect.objectContaining({ contactId: '2442123', agencyId: '118' }),
        }),
      );
    });

    it('maps an upstream failure to a leak-safe 502 (never rethrows the axios error)', async () => {
      const { service } = makeService();
      mockedAxios.get.mockRejectedValue({
        config: { headers: { apikey: 'test-key' } },
        response: { status: 401 },
      });

      await expect(service.fetchAllCampaigns()).rejects.toMatchObject({
        response: { code: 'OPTIMISE_UPSTREAM_ERROR', upstreamStatusCode: 401 },
      });
    });
  });
});
