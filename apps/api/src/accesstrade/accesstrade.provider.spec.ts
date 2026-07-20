import { AccesstradeAffiliateProvider } from './accesstrade.provider';

const makeService = () => ({
  syncOffers: jest.fn(),
  createTrackingLink: jest.fn(),
  findOfferByOfferId: jest.fn(),
});

describe('AccesstradeAffiliateProvider', () => {
  const OLD = { ...process.env };
  afterEach(() => {
    process.env = { ...OLD };
    jest.clearAllMocks();
  });

  it('reports source accesstrade', () => {
    expect(
      new AccesstradeAffiliateProvider(makeService() as never).source,
    ).toBe('accesstrade');
  });

  describe('isEnabled', () => {
    it('requires BOTH username and password (the provisioning flow needs both)', () => {
      const provider = new AccesstradeAffiliateProvider(makeService() as never);

      process.env.ACCESSTRADE_USERNAME = 'pub@gogocash.co';
      process.env.ACCESSTRADE_PASSWORD = 'secret';
      expect(provider.isEnabled()).toBe(true);

      delete process.env.ACCESSTRADE_PASSWORD;
      expect(provider.isEnabled()).toBe(false);

      process.env.ACCESSTRADE_PASSWORD = 'secret';
      process.env.ACCESSTRADE_USERNAME = '   ';
      expect(provider.isEnabled()).toBe(false);
    });
  });

  it('syncOffers delegates to the service', async () => {
    const service = makeService();
    service.syncOffers.mockResolvedValue({ upserted: 3 });
    const provider = new AccesstradeAffiliateProvider(service as never);
    await expect(provider.syncOffers()).resolves.toEqual({ upserted: 3 });
  });

  it('mintTrackingLink normalizes the doc to { deeplink } and defaults targetUrl', async () => {
    const service = makeService();
    service.createTrackingLink.mockResolvedValue(null);
    const provider = new AccesstradeAffiliateProvider(service as never);

    await expect(
      provider.mintTrackingLink({ userId: 'u1', offerId: 42, merchantId: 42 }),
    ).resolves.toEqual({ deeplink: '' });
    expect(service.createTrackingLink).toHaveBeenCalledWith({
      userId: 'u1',
      offerId: 42,
      merchantId: 42,
      targetUrl: '',
    });
  });

  it('refreshOffer builds a patch of changed fields, null when nothing patchable', async () => {
    const service = makeService();
    const provider = new AccesstradeAffiliateProvider(service as never);

    service.findOfferByOfferId.mockResolvedValueOnce({
      commissions: [{ CPA_SALES: '6%' }],
      tracking_link: 'https://at/42',
    });
    await expect(provider.refreshOffer({ offer_id: 42 })).resolves.toEqual({
      commissions: [{ CPA_SALES: '6%' }],
      tracking_link: 'https://at/42',
    });

    service.findOfferByOfferId.mockResolvedValueOnce(null);
    await expect(provider.refreshOffer({ offer_id: 99 })).resolves.toBeNull();
  });
});
