import axios from 'axios';
import { AccesstradeService } from './accesstrade.service';
import { buildAccesstradeProvisioningAuth } from './accesstrade.auth';

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
  const service = new AccesstradeService(
    offerModel as never,
    deeplinkModel as never,
  );
  return { service, offerModel, deeplinkModel };
}

const spyPrivate = (service: AccesstradeService, name: string) =>
  jest.spyOn(service as never as Record<string, jest.Mock>, name as never);

describe('AccesstradeService', () => {
  const OLD = { ...process.env };
  beforeEach(() => {
    process.env.ACCESSTRADE_USERNAME = 'pub@gogocash.co';
    process.env.ACCESSTRADE_PASSWORD = 'secret123';
    process.env.ACCESSTRADE_SITE_ID = '555';
    process.env.ACCESSTRADE_API_BASE = 'https://gurkha.accesstrade.in.th';
  });
  afterEach(() => {
    process.env = { ...OLD };
    jest.clearAllMocks();
  });

  describe('syncOffers', () => {
    it('upserts each campaign scoped to source accesstrade', async () => {
      const { service, offerModel } = makeService();
      spyPrivate(service, 'fetchAllCampaigns').mockResolvedValue([
        { id: 42, name: 'Shopee', status: 'RUNNING' },
        { id: 43, name: 'Lazada', status: 'PAUSED' },
      ] as never);

      await expect(service.syncOffers()).resolves.toEqual({ upserted: 2 });

      expect(offerModel.updateOne).toHaveBeenNthCalledWith(
        1,
        { source: 'accesstrade', offer_id: 42 },
        {
          $set: expect.objectContaining({
            offer_id: 42,
            source: 'accesstrade',
            type: 'new',
            disabled: false,
          }),
          $setOnInsert: { status: 'pending_review' },
        },
        { upsert: true },
      );
    });

    // A source-less legacy doc is canonically an Involve offer (offer.schema.ts
    // defaults `source` to 'involve'). Involve's sync claims `null` for that
    // reason; Accesstrade must not, or an `offer_id` collision would overwrite
    // an Involve offer's tracking link with an Accesstrade one.
    it('never widens its filter to source-less legacy (Involve) documents', async () => {
      const { service, offerModel } = makeService();
      spyPrivate(service, 'fetchAllCampaigns').mockResolvedValue([
        { id: 42, name: 'Shopee', status: 'RUNNING' },
      ] as never);

      await service.syncOffers();

      const upsertFilter = offerModel.updateOne.mock.calls[0][0];
      expect(upsertFilter.source).toBe('accesstrade');
      expect(JSON.stringify(upsertFilter)).not.toContain('null');
    });

    // `status` is admin curation, not upstream state. Re-stamping it on every
    // pass would revert every approve an admin made.
    it('seeds status only on insert, so a re-sync cannot revert admin curation', async () => {
      const { service, offerModel } = makeService();
      spyPrivate(service, 'fetchAllCampaigns').mockResolvedValue([
        { id: 42, name: 'Shopee', status: 'RUNNING' },
      ] as never);

      await service.syncOffers();

      const update = offerModel.updateOne.mock.calls[0][1];
      expect(update.$set).not.toHaveProperty('status');
      expect(update.$setOnInsert).toEqual({ status: 'pending_review' });
    });

    // The sync reads /campaigns/UNAFFILIATED — a partial view, not the full
    // catalogue. A campaign leaves that list precisely when we affiliate it,
    // which is the goal state. Sweeping "everything absent from the pull" would
    // therefore disable an offer the moment it becomes earnable. A stale-sweep
    // needs an authoritative full-catalogue enumeration; until one is confirmed
    // against a live account, Accesstrade must not sweep at all.
    it('never sweeps: absence from the unaffiliated list means affiliated, not stale', async () => {
      const { service, offerModel } = makeService();
      spyPrivate(service, 'fetchAllCampaigns').mockResolvedValue([
        { id: 42, name: 'Shopee', status: 'RUNNING' },
        { id: 43, name: 'Lazada', status: 'PAUSED' },
      ] as never);

      await service.syncOffers();

      expect(offerModel.updateMany).not.toHaveBeenCalled();
    });

    it('does NOT sweep on an empty pull', async () => {
      const { service, offerModel } = makeService();
      spyPrivate(service, 'fetchAllCampaigns').mockResolvedValue([] as never);
      await expect(service.syncOffers()).resolves.toEqual({ upserted: 0 });
      expect(offerModel.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('findOfferByOfferId', () => {
    it('maps a live campaign lookup and returns null on error', async () => {
      const { service } = makeService();
      const httpGet = spyPrivate(service, 'httpGet');

      httpGet.mockResolvedValueOnce({
        id: 42,
        name: 'Shopee',
        url: 'https://at/42',
      } as never);
      await expect(service.findOfferByOfferId(42)).resolves.toMatchObject({
        offer_id: 42,
        tracking_link: 'https://at/42',
      });

      httpGet.mockRejectedValueOnce(new Error('boom') as never);
      await expect(service.findOfferByOfferId(99)).resolves.toBeNull();
    });
  });

  describe('createTrackingLink', () => {
    const req = {
      userId: '5f9d5510aaaaaaaaaaaaaaaa',
      offerId: 42,
      merchantId: 42,
      targetUrl: 'https://shopee.co.th/x',
    };

    it('reuses an existing deeplink (no creative created)', async () => {
      const { service, deeplinkModel } = makeService();
      deeplinkModel.findOne.mockReturnValue(
        leanExec({ deeplink: 'http://click.at/adv.php?rk=abc' }),
      );
      const creative = spyPrivate(service, 'createCustomCreative');

      await expect(service.createTrackingLink(req)).resolves.toEqual({
        deeplink: 'http://click.at/adv.php?rk=abc',
      });
      expect(creative).not.toHaveBeenCalled();
    });

    it('creates a custom creative and persists the affiliateLink when none exists', async () => {
      const { service, deeplinkModel } = makeService();
      spyPrivate(service, 'createCustomCreative').mockResolvedValue(
        'http://click.at/adv.php?rk=xyz' as never,
      );
      deeplinkModel.create.mockResolvedValue({
        deeplink: 'http://click.at/adv.php?rk=xyz',
      });

      await expect(service.createTrackingLink(req)).resolves.toEqual({
        deeplink: 'http://click.at/adv.php?rk=xyz',
      });
      expect(deeplinkModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'accesstrade',
          offer_id: 42,
          deeplink: 'http://click.at/adv.php?rk=xyz',
        }),
      );
    });
  });

  describe('provisioning + JWT auth', () => {
    it('provisions with the SHA256(user:md5(pw)) header, then sends a Bearer JWT + user-type header', async () => {
      const { service } = makeService();
      // Provisioning call (GET /publishers/auth/{email}) then the campaigns call.
      mockedAxios.get
        .mockResolvedValueOnce({
          data: { userUid: 'uid-1', secretKey: 'sk-1' },
        })
        .mockResolvedValueOnce({ data: { content: [] } });

      await service.fetchAllCampaigns();

      // First call = provisioning, authorized by the derived hash (NOT a JWT).
      expect(mockedAxios.get).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('/publishers/auth/pub%40gogocash.co'),
        expect.objectContaining({
          headers: {
            Authorization: buildAccesstradeProvisioningAuth(
              'pub@gogocash.co',
              'secret123',
            ),
          },
        }),
      );
      // Second call = campaigns, authorized by a Bearer JWT + publisher header.
      const secondArgs = mockedAxios.get.mock.calls[1][1] as {
        headers: Record<string, string>;
      };
      expect(secondArgs.headers.Authorization).toMatch(/^Bearer eyJ/);
      expect(secondArgs.headers['X-Accesstrade-User-Type']).toBe('publisher');
    });

    it('maps a provisioning failure to a leak-safe error (never echoes the password header)', async () => {
      const { service } = makeService();
      mockedAxios.get.mockRejectedValueOnce({ response: { status: 401 } });

      await expect(service.fetchAllCampaigns()).rejects.toMatchObject({
        response: {
          code: 'ACCESSTRADE_PROVISION_FAILED',
          upstreamStatusCode: 401,
        },
      });
    });
  });
});
