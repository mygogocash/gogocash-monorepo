import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommissionManagementService } from './commission-management.service';

describe('CommissionManagementService', () => {
  const involveService = {
    findOfferByOfferId: jest.fn(),
  };
  const offerModel = {
    find: jest.fn(),
    findById: jest.fn(),
    updateOne: jest.fn(),
  };

  let service: CommissionManagementService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CommissionManagementService(
      offerModel as any,
      involveService as any,
    );
  });

  it('listBrands > given involve_asia network > filters offers by involve source', async () => {
    const lean = jest.fn().mockResolvedValue([
      {
        _id: '507f1f77bcf86cd799439011',
        merchant_id: 100,
        offer_id: 1001,
        offer_name: 'Shop A',
        offer_name_display: 'Shop A',
        currency: 'THB',
        commissions: [{ Commission: '5%' }],
        commission_store: 3.5,
        tracking_link: 'https://track.example/a',
        lookup_value: 'shop-a',
        source: 'involve',
      },
    ]);
    offerModel.find.mockReturnValue({ sort: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ lean }) }) });

    const result = await service.listBrands('involve_asia');

    expect(offerModel.find).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'involve' }),
    );
    expect(result.data).toHaveLength(1);
    expect(result.data[0].affiliateNetworkId).toBe('involve_asia');
    expect(result.data[0].partnerRates).toEqual(['5%']);
  });

  it('fetchBest > given wrong network > rejects with BadRequest', async () => {
    offerModel.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        offer_id: 1001,
        offer_name: 'Shop A',
        source: 'involve',
        commissions: [{ Commission: '5%' }],
        currency: 'THB',
      }),
    });

    await expect(
      service.fetchBest({
        offerId: '507f1f77bcf86cd799439011',
        affiliateNetworkId: 'optimise',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('fetchBest > given involve offer > returns best partner rate and suggested deeplink', async () => {
    offerModel.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        offer_id: 1001,
        offer_name: 'Shop A',
        offer_name_display: 'Shop A',
        lookup_value: 'shop-a',
        source: 'involve',
        commissions: [{ Commission: '6.5%' }],
        commission_store: 4,
        currency: 'THB',
        commission_tracking: 'CPS',
      }),
    });
    involveService.findOfferByOfferId.mockResolvedValue(null);

    const result = await service.fetchBest({
      offerId: '507f1f77bcf86cd799439011',
      affiliateNetworkId: 'involve_asia',
    });

    expect(result.bestRatePercent).toBe(6.5);
    expect(result.suggestedDeeplink).toContain('shop-a');
    expect(result.affiliateNetworkId).toBe('involve_asia');
  });

  it('updateDeeplink > given invalid offer id > throws NotFound', async () => {
    await expect(
      service.updateDeeplink({
        offerId: 'not-valid',
        deeplink: 'https://gogocash.app/open/x',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updateDeeplink > given valid offer > persists app_deeplink', async () => {
    offerModel.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        offer_id: 1001,
      }),
    });
    offerModel.updateOne.mockResolvedValue({ acknowledged: true });

    const result = await service.updateDeeplink({
      offerId: '507f1f77bcf86cd799439011',
      deeplink: 'https://gogocash.app/open/shop-a?bestRate=5',
    });

    expect(offerModel.updateOne).toHaveBeenCalledWith(
      { _id: '507f1f77bcf86cd799439011' },
      { $set: { app_deeplink: 'https://gogocash.app/open/shop-a?bestRate=5' } },
    );
    expect(result.success).toBe(true);
  });
});
