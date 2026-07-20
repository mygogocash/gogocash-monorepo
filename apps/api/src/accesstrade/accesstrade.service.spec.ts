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
    it('upserts each campaign scoped to source accesstrade and sweeps stale offers', async () => {
      const { service, offerModel } = makeService();
      spyPrivate(service, 'fetchAllCampaigns').mockResolvedValue([
        { id: 42, name: 'Shopee', status: 'RUNNING' },
        { id: 43, name: 'Lazada', status: 'PAUSED' },
      ] as never);

      await expect(service.syncOffers()).resolves.toEqual({ upserted: 2 });

      expect(offerModel.updateOne).toHaveBeenNthCalledWith(
        1,
        { source: { $in: ['accesstrade', null] }, offer_id: 42 },
        {
          $set: expect.objectContaining({
            offer_id: 42,
            source: 'accesstrade',
            type: 'new',
            disabled: false,
          }),
        },
        { upsert: true },
      );
      expect(offerModel.updateMany).toHaveBeenCalledWith(
        {
          source: { $in: ['accesstrade', null] },
          offer_id: { $nin: [42, 43] },
        },
        { $set: { type: 'old', disabled: true } },
      );
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
        response: { code: 'ACCESSTRADE_PROVISION_FAILED', upstreamStatusCode: 401 },
      });
    });
  });
});
