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
  // Registry mock for the new seam-dispatch tests. The existing suite (above)
  // constructs the service with the `involveService` mock in the 2nd slot and
  // must keep passing unchanged — that is the involve-behavior regression proof.
  const registry = {
    providerFor: jest.fn(),
    enabledProviders: jest.fn(),
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
    offerModel.find.mockReturnValue({
      sort: jest
        .fn()
        .mockReturnValue({ limit: jest.fn().mockReturnValue({ lean }) }),
    });

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

  // New: mergePartnerFeed now dispatches through the affiliate provider seam
  // instead of calling InvolveService directly.
  describe('mergePartnerFeed dispatch (affiliate seam)', () => {
    let seamService: CommissionManagementService;

    beforeEach(() => {
      seamService = new CommissionManagementService(
        offerModel as any,
        registry as any,
      );
    });

    it('fetchBest > given an enabled provider for the network > then it refreshes via the registry and persists the returned patch', async () => {
      const provider = {
        source: 'involve',
        isEnabled: jest.fn().mockReturnValue(true),
        refreshOffer: jest.fn().mockResolvedValue({
          commissions: [{ Commission: '9%' }],
          tracking_link: 'https://track.example/fresh',
          commission_tracking: 'CPS',
        }),
      };
      registry.providerFor.mockReturnValue(provider);
      offerModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439011',
          offer_id: 1001,
          offer_name: 'Shop A',
          offer_name_display: 'Shop A',
          lookup_value: 'shop-a',
          source: 'involve',
          commissions: [{ Commission: '5%' }],
          currency: 'THB',
        }),
      });

      const result = await seamService.fetchBest({
        offerId: '507f1f77bcf86cd799439011',
        affiliateNetworkId: 'involve_asia',
      });

      expect(registry.providerFor).toHaveBeenCalledWith('involve');
      expect(provider.refreshOffer).toHaveBeenCalledTimes(1);
      expect(offerModel.updateOne).toHaveBeenCalledWith(
        { _id: '507f1f77bcf86cd799439011' },
        {
          $set: {
            commissions: [{ Commission: '9%' }],
            tracking_link: 'https://track.example/fresh',
            commission_tracking: 'CPS',
          },
        },
      );
      // Patch's 9% partner rate wins over the offer's stale 5%.
      expect(result.bestRatePercent).toBe(9);
    });

    it('fetchBest > given optimise (no provider registered yet) > then it falls through to the unsupported path and never persists', async () => {
      registry.providerFor.mockReturnValue(null);
      offerModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439012',
          offer_id: 2002,
          offer_name: 'Shop B',
          source: 'optimise',
          commissions: [{ Commission: '4%' }],
          currency: 'THB',
        }),
      });

      const result = await seamService.fetchBest({
        offerId: '507f1f77bcf86cd799439012',
        affiliateNetworkId: 'optimise',
      });

      expect(registry.providerFor).toHaveBeenCalledWith('optimise');
      expect(offerModel.updateOne).not.toHaveBeenCalled();
      // Falls back to the stored offer's own 4% — nothing refreshed.
      expect(result.bestRatePercent).toBe(4);
      expect(result.affiliateNetworkId).toBe('optimise');
    });

    it('fetchBest > given a disabled provider > then it falls through to not-connected and never refreshes or persists', async () => {
      const provider = {
        source: 'involve',
        isEnabled: jest.fn().mockReturnValue(false),
        refreshOffer: jest.fn(),
      };
      registry.providerFor.mockReturnValue(provider);
      offerModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439011',
          offer_id: 1001,
          offer_name: 'Shop A',
          source: 'involve',
          commissions: [{ Commission: '6.5%' }],
          currency: 'THB',
        }),
      });

      const result = await seamService.fetchBest({
        offerId: '507f1f77bcf86cd799439011',
        affiliateNetworkId: 'involve_asia',
      });

      expect(provider.refreshOffer).not.toHaveBeenCalled();
      expect(offerModel.updateOne).not.toHaveBeenCalled();
      expect(result.bestRatePercent).toBe(6.5);
    });
  });
});
