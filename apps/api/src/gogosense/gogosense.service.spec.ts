import { GogosenseService } from './gogosense.service';
import type { ActivationRequestDto } from './dto/activation-request.dto';
import type { DetectionRequestDto } from './dto/detection-request.dto';
import { defaultGogosenseMerchants } from './seeds/default-gogosense-merchants';

const shopeeMerchant = {
  merchant_id: 'merchant-shopee',
  brand_id: 'brand-shopee',
  brand_slug: 'shopee',
  merchant_name: 'Shopee',
  android_packages: ['com.shopee.th'],
  domains: ['shopee.co.th'],
  offer_id: 101,
  network_merchant_id: 201,
  cashback_rate: '7.5%',
  affiliate_network: 'involve',
  supported_platforms: ['android', 'web', 'ios', 'line'],
  enabled: true,
  confidence_threshold: 0.75,
};

const lazadaMerchant = {
  merchant_id: 'merchant-lazada',
  brand_id: 'brand-lazada',
  brand_slug: 'lazada',
  merchant_name: 'Lazada',
  android_packages: ['com.lazada.android'],
  domains: ['lazada.co.th'],
  offer_id: 102,
  network_merchant_id: 202,
  cashback_rate: '6%',
  affiliate_network: 'involve',
  supported_platforms: ['android', 'web', 'ios', 'line'],
  enabled: true,
  confidence_threshold: 0.75,
};

function makeQueryResult<T>(value: T) {
  return {
    lean: jest.fn().mockResolvedValue(value),
    limit: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
  };
}

function makeService() {
  const merchantModel = {
    find: jest
      .fn()
      .mockReturnValue(makeQueryResult([shopeeMerchant, lazadaMerchant])),
  };
  const detectionEventModel = {
    create: jest.fn(async (doc) => ({ _id: 'detection-1', ...doc })),
    find: jest.fn().mockReturnValue(makeQueryResult([])),
    findOne: jest.fn().mockReturnValue(
      makeQueryResult({
        _id: 'detection-1',
        user_id: 'user-1',
        merchant_id: 'merchant-shopee',
        network_merchant_id: 201,
        matched: true,
      }),
    ),
  };
  const activationEventModel = {
    create: jest.fn(async (doc) => ({ _id: 'activation-1', ...doc })),
    find: jest.fn().mockReturnValue(makeQueryResult([])),
  };
  const screenshotJobModel = {
    create: jest.fn(async (doc) => ({ _id: 'screenshot-1', ...doc })),
    findOne: jest.fn().mockReturnValue(makeQueryResult(null)),
  };
  const userSettingsModel = {
    findOne: jest.fn().mockReturnValue(makeQueryResult(null)),
    findOneAndUpdate: jest.fn().mockReturnValue(makeQueryResult(null)),
  };
  const involveService = {
    createAffiliate: jest.fn(async () => ({
      _id: 'deeplink-1',
      deeplink: 'https://track.gogocash.co/shopee',
    })),
  };
  const analytics = {
    capture: jest.fn(),
  };

  return {
    service: new GogosenseService(
      merchantModel as any,
      detectionEventModel as any,
      activationEventModel as any,
      screenshotJobModel as any,
      userSettingsModel as any,
      involveService as any,
      analytics as any,
    ),
    activationEventModel,
    detectionEventModel,
    involveService,
  };
}

const baseDetectionRequest = {
  method: 'android_package',
  observedAt: '2026-05-23T09:00:00.000Z',
  platform: 'android',
} satisfies Partial<DetectionRequestDto>;

describe('GogosenseService merchant mapping', () => {
  it('merchant mapping > given com.shopee.th > then returns Shopee', async () => {
    const { service } = makeService();

    await expect(
      service.matchMerchant({
        ...baseDetectionRequest,
        packageName: 'com.shopee.th',
      } as DetectionRequestDto),
    ).resolves.toMatchObject({
      matched: true,
      merchantId: 'merchant-shopee',
      merchantName: 'Shopee',
      brandSlug: 'shopee',
      offerId: 101,
      networkMerchantId: 201,
      recommendedAction: 'activate',
    });
  });

  it('merchant mapping > given Lazada URL > then returns Lazada', async () => {
    const { service } = makeService();

    await expect(
      service.matchMerchant({
        ...baseDetectionRequest,
        method: 'browser_url',
        url: 'https://pages.lazada.co.th/wow/i/th/campaign',
      } as DetectionRequestDto),
    ).resolves.toMatchObject({
      matched: true,
      merchantId: 'merchant-lazada',
      merchantName: 'Lazada',
      brandSlug: 'lazada',
      offerId: 102,
      networkMerchantId: 202,
    });
  });

  it('merchant mapping > given unknown package > then returns no match', async () => {
    const { service } = makeService();

    await expect(
      service.matchMerchant({
        ...baseDetectionRequest,
        packageName: 'com.unknown.shop',
      } as DetectionRequestDto),
    ).resolves.toEqual({
      matched: false,
      recommendedAction: 'ignore',
    });
  });
});

describe('GogosenseService detection and activation', () => {
  it('detection > given matched merchant > then creates detection event', async () => {
    const { detectionEventModel, service } = makeService();

    await expect(
      service.detect('user-1', {
        ...baseDetectionRequest,
        packageName: 'com.shopee.th',
      } as DetectionRequestDto),
    ).resolves.toMatchObject({
      detectionEventId: 'detection-1',
      matched: true,
      merchantId: 'merchant-shopee',
    });

    expect(detectionEventModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        detection_method: 'android_package',
        merchant_id: 'merchant-shopee',
        package_name: 'com.shopee.th',
      }),
    );
  });

  it('activation > given matched merchant > then creates or reuses deeplink', async () => {
    const { activationEventModel, detectionEventModel, involveService, service } =
      makeService();
    const request = {
      detectionEventId: 'detection-1',
      merchantId: 'merchant-shopee',
      offerId: 101,
      networkMerchantId: 201,
      source: 'gogosense',
    } satisfies ActivationRequestDto;

    await expect(service.activate('user-1', request)).resolves.toEqual({
      activationEventId: 'activation-1',
      deeplink: 'https://track.gogocash.co/shopee',
    });

    expect(detectionEventModel.findOne).toHaveBeenCalledWith({
      _id: 'detection-1',
      user_id: 'user-1',
      merchant_id: 'merchant-shopee',
      network_merchant_id: 201,
      matched: true,
    });

    expect(involveService.createAffiliate).toHaveBeenCalledWith(
      {
        offer_id: 101,
        merchant_id: 201,
        deeplink: '',
      },
      'user-1',
    );
    expect(activationEventModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        detection_event_id: 'detection-1',
        merchant_id: 'merchant-shopee',
        deeplink: 'https://track.gogocash.co/shopee',
      }),
    );
  });
});

  it('activation > given an invalid detection event id > rejects before deeplink creation', async () => {
    const { activationEventModel, detectionEventModel, involveService, service } =
      makeService();
    detectionEventModel.findOne.mockReturnValueOnce(makeQueryResult(null));

    await expect(
      service.activate('user-1', {
        detectionEventId: 'detection-1',
        merchantId: 'merchant-shopee',
        offerId: 101,
        networkMerchantId: 201,
        source: 'gogosense',
      }),
    ).rejects.toThrow('Invalid GoGoSense detection event for activation');

    expect(involveService.createAffiliate).not.toHaveBeenCalled();
    expect(activationEventModel.create).not.toHaveBeenCalled();
  });

  it('activation > given gogosense source without detection event > rejects before deeplink creation', async () => {
    const { activationEventModel, detectionEventModel, involveService, service } =
      makeService();

    await expect(
      service.activate('user-1', {
        merchantId: 'merchant-shopee',
        offerId: 101,
        networkMerchantId: 201,
        source: 'gogosense',
      }),
    ).rejects.toThrow('GoGoSense activation requires a detection event');

    expect(detectionEventModel.findOne).not.toHaveBeenCalled();
    expect(involveService.createAffiliate).not.toHaveBeenCalled();
    expect(activationEventModel.create).not.toHaveBeenCalled();
  });

describe('GogosenseService settings and timeline', () => {
  it('settings > given partial update > then only writes provided flags', async () => {
    const { service } = makeService();
    const userSettingsModel = (service as any).userSettingsModel;

    await service.updateSettings('user-1', { enabled: true });

    expect(userSettingsModel.findOneAndUpdate).toHaveBeenCalledWith(
      { user_id: 'user-1' },
      {
        $set: {
          enabled: true,
        },
      },
      { new: true, upsert: true },
    );
  });

  it('timeline > given user > then queries only current user events', async () => {
    const { activationEventModel, detectionEventModel, service } =
      makeService();

    await service.getTimeline('user-1');

    expect(detectionEventModel.find).toHaveBeenCalledWith({
      user_id: 'user-1',
    });
    expect(activationEventModel.find).toHaveBeenCalledWith({
      user_id: 'user-1',
    });
  });
});

describe('GoGoSense merchant seed catalog', () => {
  it('merchant seed > given MVP target > then defines 30 merchant mapping candidates', () => {
    expect(defaultGogosenseMerchants).toHaveLength(30);
    expect(defaultGogosenseMerchants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          merchant_name: 'Shopee',
          android_packages: expect.arrayContaining(['com.shopee.th']),
          domains: expect.arrayContaining(['shopee.co.th']),
        }),
        expect.objectContaining({
          merchant_name: 'Lazada',
          android_packages: expect.arrayContaining(['com.lazada.android']),
          domains: expect.arrayContaining(['lazada.co.th']),
        }),
      ]),
    );
    expect(
      defaultGogosenseMerchants.every((merchant) => merchant.enabled === false),
    ).toBe(true);
  });
});
