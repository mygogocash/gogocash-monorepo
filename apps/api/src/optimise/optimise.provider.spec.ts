import { OptimiseAffiliateProvider } from './optimise.provider';

const makeService = () => ({
  syncOffers: jest.fn(),
  createTrackingLink: jest.fn(),
  findOfferByOfferId: jest.fn(),
});

describe('OptimiseAffiliateProvider', () => {
  const OLD = process.env.OPTIMISE_API_KEY;
  afterEach(() => {
    if (OLD == null) delete process.env.OPTIMISE_API_KEY;
    else process.env.OPTIMISE_API_KEY = OLD;
    jest.clearAllMocks();
  });

  it('reports source optimise', () => {
    const provider = new OptimiseAffiliateProvider(makeService() as never);
    expect(provider.source).toBe('optimise');
  });

  describe('isEnabled', () => {
    it('is enabled only when OPTIMISE_API_KEY is a non-blank string', () => {
      const provider = new OptimiseAffiliateProvider(makeService() as never);

      process.env.OPTIMISE_API_KEY = 'live-key';
      expect(provider.isEnabled()).toBe(true);

      process.env.OPTIMISE_API_KEY = '   ';
      expect(provider.isEnabled()).toBe(false);

      delete process.env.OPTIMISE_API_KEY;
      expect(provider.isEnabled()).toBe(false);
    });
  });

  it('syncOffers delegates to the service', async () => {
    const service = makeService();
    service.syncOffers.mockResolvedValue({ upserted: 7 });
    const provider = new OptimiseAffiliateProvider(service as never);

    await expect(provider.syncOffers()).resolves.toEqual({ upserted: 7 });
    expect(service.syncOffers).toHaveBeenCalledTimes(1);
  });

  describe('mintTrackingLink', () => {
    it('forwards the request and normalizes the doc to { deeplink }', async () => {
      const service = makeService();
      service.createTrackingLink.mockResolvedValue({
        deeplink: 'https://track/opt?uid=u1',
      });
      const provider = new OptimiseAffiliateProvider(service as never);

      await expect(
        provider.mintTrackingLink({
          userId: 'u1',
          offerId: 1001,
          merchantId: 778,
          targetUrl: 'https://acme.example',
        }),
      ).resolves.toEqual({ deeplink: 'https://track/opt?uid=u1' });
      expect(service.createTrackingLink).toHaveBeenCalledWith({
        userId: 'u1',
        offerId: 1001,
        merchantId: 778,
        targetUrl: 'https://acme.example',
      });
    });

    it('returns an empty deeplink when the service yields null', async () => {
      const service = makeService();
      service.createTrackingLink.mockResolvedValue(null);
      const provider = new OptimiseAffiliateProvider(service as never);

      await expect(
        provider.mintTrackingLink({ userId: 'u1', offerId: 1, merchantId: 2 }),
      ).resolves.toEqual({ deeplink: '' });
      // targetUrl defaults to '' when omitted.
      expect(service.createTrackingLink).toHaveBeenCalledWith({
        userId: 'u1',
        offerId: 1,
        merchantId: 2,
        targetUrl: '',
      });
    });
  });

  describe('refreshOffer', () => {
    it('returns null when the live lookup misses', async () => {
      const service = makeService();
      service.findOfferByOfferId.mockResolvedValue(null);
      const provider = new OptimiseAffiliateProvider(service as never);

      await expect(
        provider.refreshOffer({ offer_id: 1001 }),
      ).resolves.toBeNull();
    });

    it('builds a patch of only the changed commercial fields', async () => {
      const service = makeService();
      service.findOfferByOfferId.mockResolvedValue({
        commissions: [{ commission: '6' }],
        tracking_link: 'https://track/opt/1001',
        commission_tracking: 'percentage',
      });
      const provider = new OptimiseAffiliateProvider(service as never);

      await expect(provider.refreshOffer({ offer_id: 1001 })).resolves.toEqual({
        commissions: [{ commission: '6' }],
        tracking_link: 'https://track/opt/1001',
        commission_tracking: 'percentage',
      });
    });

    it('returns null when nothing is patchable', async () => {
      const service = makeService();
      service.findOfferByOfferId.mockResolvedValue({ tracking_link: '' });
      const provider = new OptimiseAffiliateProvider(service as never);

      await expect(provider.refreshOffer({ offer_id: 1001 })).resolves.toBeNull();
    });
  });
});
