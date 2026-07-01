import { GototrackAgentService } from './gototrack-agent.service';
import type { GototrackService } from './gototrack.service';

const TEST_USER_ID = '507f1f77bcf86cd799439011';

function makeAgentService(gototrackService: Partial<GototrackService>) {
  const analytics = { capture: jest.fn() };
  const service = new GototrackAgentService(
    gototrackService as GototrackService,
    analytics as never,
  );
  return { service, analytics };
}

describe('GototrackAgentService searchMerchants', () => {
  it('searchMerchants > given query > then returns structured merchant options', async () => {
    const gototrackService = {
      searchMerchants: jest.fn().mockResolvedValue([
        {
          merchant_id: 'merchant-shopee',
          merchant_name: 'Shopee',
          brand_slug: 'shopee',
          cashback_rate: '5%',
          supported_platforms: ['android', 'web'],
        },
      ]),
    };
    const { service } = makeAgentService(gototrackService);

    await expect(service.searchMerchants('shopee')).resolves.toEqual({
      type: 'gototrack_merchant_options',
      options: [
        {
          merchantId: 'merchant-shopee',
          merchantName: 'Shopee',
          brandSlug: 'shopee',
          cashbackRate: '5%',
          platforms: ['android', 'web'],
          recommendedAction: 'match',
        },
      ],
      nextAction: 'ask_user_to_select_or_continue',
    });
  });
});

describe('GototrackAgentService matchMerchant', () => {
  it('matchMerchant > given matched hint > then returns continue card with detectionEventId', async () => {
    const gototrackService = {
      detect: jest.fn().mockResolvedValue({
        detectionEventId: '507f1f77bcf86cd799439012',
        matched: true,
        merchantId: 'merchant-shopee',
        merchantName: 'Shopee',
        brandSlug: 'shopee',
        offerId: 101,
        networkMerchantId: 201,
        cashbackRate: '5%',
        recommendedAction: 'activate',
      }),
    };
    const { service } = makeAgentService(gototrackService);

    await expect(
      service.matchMerchant(TEST_USER_ID, {
        merchantHint: 'Shopee',
        platform: 'web',
      }),
    ).resolves.toEqual({
      type: 'gototrack_merchant_match',
      matched: true,
      detectionEventId: '507f1f77bcf86cd799439012',
      option: {
        merchantId: 'merchant-shopee',
        merchantName: 'Shopee',
        brandSlug: 'shopee',
        offerId: 101,
        networkMerchantId: 201,
        cashbackRate: '5%',
        recommendedAction: 'activate',
      },
      nextAction: 'ask_user_to_continue',
    });

    expect(gototrackService.detect).toHaveBeenCalledWith(
      TEST_USER_ID,
      expect.objectContaining({
        method: 'manual',
        merchantHint: 'Shopee',
        platform: 'web',
      }),
    );
  });

  it('matchMerchant > given no match > then returns search again action', async () => {
    const gototrackService = {
      detect: jest.fn().mockResolvedValue({
        detectionEventId: '507f1f77bcf86cd799439012',
        matched: false,
        recommendedAction: 'ignore',
      }),
    };
    const { service } = makeAgentService(gototrackService);

    await expect(
      service.matchMerchant(TEST_USER_ID, { merchantHint: 'UnknownShop' }),
    ).resolves.toEqual({
      type: 'gototrack_merchant_match',
      matched: false,
      detectionEventId: '507f1f77bcf86cd799439012',
      nextAction: 'search_again',
    });
  });
});

describe('GototrackAgentService activateCashback', () => {
  it('activateCashback > given detection event > then returns affiliate and app deeplinks', async () => {
    const gototrackService = {
      activate: jest.fn().mockResolvedValue({
        activationEventId: 'activation-1',
        deeplink: 'https://track.gogocash.co/shopee',
      }),
    };
    const { service } = makeAgentService(gototrackService);

    await expect(
      service.activateCashback(TEST_USER_ID, {
        detectionEventId: '507f1f77bcf86cd799439012',
        merchantId: 'merchant-shopee',
        offerId: 101,
        networkMerchantId: 201,
        merchantName: 'Shopee',
      }),
    ).resolves.toEqual({
      type: 'gototrack_activation',
      activationEventId: 'activation-1',
      deeplink: 'https://track.gogocash.co/shopee',
      appDeepLink:
        'gogocash://gototrack/activate?merchantId=merchant-shopee&offerId=101&networkMerchantId=201&detectionEventId=507f1f77bcf86cd799439012&merchantName=Shopee',
      instructions:
        'Open the tracked link before checkout. Cashback appears in your GoGoCash wallet after the merchant confirms your order.',
      nextAction: 'open_tracked_link_before_checkout',
    });

    expect(gototrackService.activate).toHaveBeenCalledWith(TEST_USER_ID, {
      detectionEventId: '507f1f77bcf86cd799439012',
      merchantId: 'merchant-shopee',
      offerId: 101,
      networkMerchantId: 201,
      source: 'gototrack_agent',
    });
  });
});

describe('GototrackAgentService getTimeline', () => {
  it('getTimeline > given user history > then returns structured timeline', async () => {
    const gototrackService = {
      getTimeline: jest.fn().mockResolvedValue({
        detections: [{ merchant_name: 'Shopee', matched: true }],
        activations: [{ deeplink: 'https://track.gogocash.co/shopee' }],
      }),
    };
    const { service } = makeAgentService(gototrackService);

    await expect(service.getTimeline(TEST_USER_ID)).resolves.toEqual({
      type: 'gototrack_timeline',
      detections: [{ merchant_name: 'Shopee', matched: true }],
      activations: [{ deeplink: 'https://track.gogocash.co/shopee' }],
    });
  });
});
