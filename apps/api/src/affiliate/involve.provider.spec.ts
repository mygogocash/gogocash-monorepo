import { InvolveAffiliateProvider } from './involve.provider';

describe('InvolveAffiliateProvider', () => {
  let involveService: {
    findAll: jest.Mock;
    createAffiliate: jest.Mock;
    findOfferByOfferId: jest.Mock;
  };
  let provider: InvolveAffiliateProvider;
  const originalSecret = process.env.INVOLVE_SECRET;

  beforeEach(() => {
    involveService = {
      findAll: jest.fn(),
      createAffiliate: jest.fn(),
      findOfferByOfferId: jest.fn(),
    };
    provider = new InvolveAffiliateProvider(involveService as never);
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.INVOLVE_SECRET;
    } else {
      process.env.INVOLVE_SECRET = originalSecret;
    }
    jest.clearAllMocks();
  });

  it("source > is 'involve'", () => {
    expect(provider.source).toBe('involve');
  });

  describe('isEnabled', () => {
    it('isEnabled > given INVOLVE_SECRET set > then true', () => {
      process.env.INVOLVE_SECRET = 'a-secret-value';
      expect(provider.isEnabled()).toBe(true);
    });

    it('isEnabled > given INVOLVE_SECRET unset > then false', () => {
      delete process.env.INVOLVE_SECRET;
      expect(provider.isEnabled()).toBe(false);
    });
  });

  describe('syncOffers', () => {
    it('syncOffers > given offers > then delegates to findAll and reports the upserted count', async () => {
      involveService.findAll.mockResolvedValue([
        { offer_id: 1 },
        { offer_id: 2 },
        { offer_id: 3 },
      ]);

      const result = await provider.syncOffers();

      expect(involveService.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ upserted: 3 });
    });

    it('syncOffers > given findAll returns a non-array > then upserted is 0', async () => {
      involveService.findAll.mockResolvedValue(undefined);

      const result = await provider.syncOffers();

      expect(result).toEqual({ upserted: 0 });
    });
  });

  describe('mintTrackingLink', () => {
    it('mintTrackingLink > given a targetUrl > then passes exact args to createAffiliate and normalizes the return', async () => {
      involveService.createAffiliate.mockResolvedValue({
        deeplink: 'https://track.example/xyz',
      });

      const result = await provider.mintTrackingLink({
        userId: 'user-1',
        offerId: 1001,
        merchantId: 500,
        targetUrl: 'https://shop.example/product',
      });

      expect(involveService.createAffiliate).toHaveBeenCalledWith(
        {
          offer_id: 1001,
          merchant_id: 500,
          deeplink: 'https://shop.example/product',
        },
        'user-1',
      );
      expect(result).toEqual({ deeplink: 'https://track.example/xyz' });
    });

    it('mintTrackingLink > given no targetUrl > then passes an empty deeplink string', async () => {
      involveService.createAffiliate.mockResolvedValue({
        deeplink: 'https://track.example/abc',
      });

      await provider.mintTrackingLink({
        userId: 'user-2',
        offerId: 7,
        merchantId: 8,
      });

      expect(involveService.createAffiliate).toHaveBeenCalledWith(
        { offer_id: 7, merchant_id: 8, deeplink: '' },
        'user-2',
      );
    });

    it('mintTrackingLink > given a doc without a deeplink field > then normalizes to an empty string', async () => {
      involveService.createAffiliate.mockResolvedValue({});

      const result = await provider.mintTrackingLink({
        userId: 'u',
        offerId: 1,
        merchantId: 2,
      });

      expect(result).toEqual({ deeplink: '' });
    });
  });

  describe('refreshOffer', () => {
    it('refreshOffer > given a live offer > then builds the {commissions, tracking_link, commission_tracking} patch', async () => {
      involveService.findOfferByOfferId.mockResolvedValue({
        commissions: [{ Commission: '7%' }],
        tracking_link: 'https://track.example/live',
        commission_tracking: 'CPS',
      });

      const patch = await provider.refreshOffer({ offer_id: 1001 });

      expect(involveService.findOfferByOfferId).toHaveBeenCalledWith(1001);
      expect(patch).toEqual({
        commissions: [{ Commission: '7%' }],
        tracking_link: 'https://track.example/live',
        commission_tracking: 'CPS',
      });
    });

    it('refreshOffer > given the live lookup returns null > then returns null', async () => {
      involveService.findOfferByOfferId.mockResolvedValue(null);

      expect(await provider.refreshOffer({ offer_id: 1001 })).toBeNull();
    });

    it('refreshOffer > given no patchable fields > then returns null (never an empty patch)', async () => {
      involveService.findOfferByOfferId.mockResolvedValue({
        some_other_field: 'x',
      });

      expect(await provider.refreshOffer({ offer_id: 1001 })).toBeNull();
    });

    it('refreshOffer > given an empty tracking_link > then omits it from the patch', async () => {
      involveService.findOfferByOfferId.mockResolvedValue({
        commissions: [{ Commission: '5%' }],
        tracking_link: '',
        commission_tracking: 'CPS',
      });

      const patch = await provider.refreshOffer({ offer_id: 1001 });

      expect(patch).toEqual({
        commissions: [{ Commission: '5%' }],
        commission_tracking: 'CPS',
      });
      expect(patch).not.toHaveProperty('tracking_link');
    });
  });
});
