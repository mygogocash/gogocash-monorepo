import { HttpException } from '@nestjs/common';
import { Types } from 'mongoose';

import { GototrackService } from './gototrack.service';
import type { ActivationRequestDto } from './dto/activation-request.dto';
import type { DetectionRequestDto } from './dto/detection-request.dto';
import { defaultGototrackMerchants } from './seeds/default-gototrack-merchants';

const TEST_USER_ID = '507f1f77bcf86cd799439011';
const TEST_DETECTION_EVENT_ID = '507f1f77bcf86cd799439012';
const TEST_SCREENSHOT_JOB_ID = '507f1f77bcf86cd799439013';

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
    create: jest.fn(async (doc) => ({
      _id: '507f1f77bcf86cd799439012',
      ...doc,
    })),
    find: jest.fn().mockReturnValue(makeQueryResult([])),
    findOne: jest.fn().mockReturnValue(
      makeQueryResult({
        _id: '507f1f77bcf86cd799439012',
        user_id: '507f1f77bcf86cd799439011',
        merchant_id: 'merchant-shopee',
        network_merchant_id: 201,
        matched: true,
      }),
    ),
  };
  const activationEventModel = {
    findOne: jest.fn().mockReturnValue(makeQueryResult(null)),
    create: jest.fn(async (doc) => ({ _id: 'activation-1', ...doc })),
    find: jest.fn().mockReturnValue(makeQueryResult([])),
    findByIdAndUpdate: jest.fn(async (id, update) => ({
      _id: id,
      ...update,
    })),
    deleteOne: jest.fn(async () => ({ deletedCount: 1 })),
  };
  const screenshotJobModel = {
    create: jest.fn(async (doc) => ({
      _id: '507f1f77bcf86cd799439013',
      ...doc,
    })),
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
    service: new GototrackService(
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

describe('GototrackService merchant mapping', () => {
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

  it('merchant mapping > given manual merchantHint Shopee > then returns Shopee', async () => {
    const { service } = makeService();

    await expect(
      service.matchMerchant({
        ...baseDetectionRequest,
        method: 'manual',
        merchantHint: 'Shopee',
      } as DetectionRequestDto),
    ).resolves.toMatchObject({
      matched: true,
      merchantId: 'merchant-shopee',
      merchantName: 'Shopee',
      recommendedAction: 'activate',
    });
  });
});

describe('GototrackService searchMerchants', () => {
  it('searchMerchants > given shopee query > then returns matching enabled merchants', async () => {
    const { service } = makeService();

    await expect(service.searchMerchants('shopee')).resolves.toEqual([
      expect.objectContaining({
        merchant_id: 'merchant-shopee',
        merchant_name: 'Shopee',
      }),
    ]);
  });

  it('searchMerchants > given empty query > then returns all enabled merchants', async () => {
    const { service } = makeService();

    await expect(service.searchMerchants('')).resolves.toHaveLength(2);
  });
});

describe('GototrackService detection and activation', () => {
  it('detection > given matched merchant > then creates detection event', async () => {
    const { detectionEventModel, service } = makeService();

    await expect(
      service.detect('507f1f77bcf86cd799439011', {
        ...baseDetectionRequest,
        packageName: 'com.shopee.th',
      } as DetectionRequestDto),
    ).resolves.toMatchObject({
      detectionEventId: '507f1f77bcf86cd799439012',
      matched: true,
      merchantId: 'merchant-shopee',
    });

    expect(detectionEventModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: '507f1f77bcf86cd799439011',
        detection_method: 'android_package',
        merchant_id: 'merchant-shopee',
        package_name: 'com.shopee.th',
      }),
    );
  });

  it('detection > given disabled GoGoTrack setting > then rejects without event', async () => {
    const { detectionEventModel, service } = makeService();
    const userSettingsModel = (service as any).userSettingsModel;
    userSettingsModel.findOne.mockReturnValueOnce(
      makeQueryResult({
        user_id: '507f1f77bcf86cd799439011',
        enabled: false,
        usage_stats_enabled: true,
      }),
    );

    await expect(
      service.detect('507f1f77bcf86cd799439011', {
        ...baseDetectionRequest,
        packageName: 'com.shopee.th',
      }),
    ).rejects.toThrow('GoGoTrack tracking is disabled');

    expect(detectionEventModel.create).not.toHaveBeenCalled();
  });

  it('detection > given disabled usage stats setting > then rejects Android package event', async () => {
    const { detectionEventModel, service } = makeService();
    const userSettingsModel = (service as any).userSettingsModel;
    userSettingsModel.findOne.mockReturnValueOnce(
      makeQueryResult({
        user_id: '507f1f77bcf86cd799439011',
        enabled: true,
        usage_stats_enabled: false,
      }),
    );

    await expect(
      service.detect('507f1f77bcf86cd799439011', {
        ...baseDetectionRequest,
        packageName: 'com.shopee.th',
      }),
    ).rejects.toThrow('Usage access detection is disabled');

    expect(detectionEventModel.create).not.toHaveBeenCalled();
  });

  it('detection > given screenshot OCR without job id > then rejects without event', async () => {
    const { detectionEventModel, service } = makeService();
    const screenshotJobModel = (service as any).screenshotJobModel;

    await expect(
      service.detect('507f1f77bcf86cd799439011', {
        ...baseDetectionRequest,
        method: 'screenshot_ocr',
      }),
    ).rejects.toThrow(
      'Screenshot recovery job is required for screenshot OCR detection',
    );

    expect(screenshotJobModel.findOne).not.toHaveBeenCalled();
    expect(detectionEventModel.create).not.toHaveBeenCalled();
  });

  it('detection > given screenshot job id > then requires active user-owned job', async () => {
    const { detectionEventModel, service } = makeService();
    const screenshotJobModel = (service as any).screenshotJobModel;
    screenshotJobModel.findOne.mockReturnValueOnce(
      makeQueryResult({
        _id: '507f1f77bcf86cd799439013',
        user_id: '507f1f77bcf86cd799439011',
        expires_at: new Date('2026-05-24T09:00:00.000Z'),
      }),
    );

    await service.detect('507f1f77bcf86cd799439011', {
      ...baseDetectionRequest,
      packageName: 'com.shopee.th',
      screenshotJobId: '507f1f77bcf86cd799439013',
    });

    expect(screenshotJobModel.findOne).toHaveBeenCalledWith({
      _id: new Types.ObjectId(TEST_SCREENSHOT_JOB_ID),
      user_id: TEST_USER_ID,
      expires_at: { $gt: expect.any(Date) },
    });
    expect(detectionEventModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        screenshot_job_id: TEST_SCREENSHOT_JOB_ID,
      }),
    );
  });

  it('detection > given missing or expired screenshot job > then rejects without event', async () => {
    const { detectionEventModel, service } = makeService();
    const screenshotJobModel = (service as any).screenshotJobModel;

    await expect(
      service.detect('507f1f77bcf86cd799439011', {
        ...baseDetectionRequest,
        packageName: 'com.shopee.th',
        screenshotJobId: '507f1f77bcf86cd799439013',
      }),
    ).rejects.toThrow('Screenshot recovery job is invalid or expired');

    expect(screenshotJobModel.findOne).toHaveBeenCalledWith({
      _id: new Types.ObjectId(TEST_SCREENSHOT_JOB_ID),
      user_id: TEST_USER_ID,
      expires_at: { $gt: expect.any(Date) },
    });
    expect(detectionEventModel.create).not.toHaveBeenCalled();
  });

  it('activation > given matched merchant > then creates or reuses deeplink', async () => {
    const {
      activationEventModel,
      detectionEventModel,
      involveService,
      service,
    } = makeService();
    const request = {
      detectionEventId: '507f1f77bcf86cd799439012',
      merchantId: 'merchant-shopee',
      offerId: 101,
      networkMerchantId: 201,
      source: 'gototrack',
    } satisfies ActivationRequestDto;

    await expect(
      service.activate('507f1f77bcf86cd799439011', request),
    ).resolves.toEqual({
      activationEventId: 'activation-1',
      deeplink: 'https://track.gogocash.co/shopee',
    });

    expect(detectionEventModel.findOne).toHaveBeenCalledWith({
      _id: new Types.ObjectId(TEST_DETECTION_EVENT_ID),
      user_id: TEST_USER_ID,
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
      '507f1f77bcf86cd799439011',
    );
    expect(activationEventModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: '507f1f77bcf86cd799439011',
        detection_event_id: '507f1f77bcf86cd799439012',
        merchant_id: 'merchant-shopee',
        deeplink: '',
      }),
    );
    expect(activationEventModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'activation-1',
      { deeplink: 'https://track.gogocash.co/shopee' },
      { new: true },
    );
    const createOrder = activationEventModel.create.mock.invocationCallOrder[0];
    const involveOrder =
      involveService.createAffiliate.mock.invocationCallOrder[0];
    expect(createOrder).toBeLessThan(involveOrder);
  });

  it('activation > given affiliate network rejects merchant mapping > then surfaces a clear 422 without recording activation', async () => {
    const {
      activationEventModel,
      detectionEventModel,
      involveService,
      service,
    } = makeService();
    const error = new Error('Request failed with status code 422') as Error & {
      response: { status: number; data: { status_code: number } };
    };
    error.response = { status: 422, data: { status_code: 422 } };
    involveService.createAffiliate.mockRejectedValueOnce(error);

    try {
      await service.activate('507f1f77bcf86cd799439011', {
        detectionEventId: '507f1f77bcf86cd799439012',
        merchantId: 'merchant-shopee',
        offerId: 101,
        networkMerchantId: 201,
        source: 'gototrack',
      });
      throw new Error('Expected GoGoTrack activation to fail');
    } catch (caught) {
      expect(caught).toBeInstanceOf(HttpException);
      expect((caught as HttpException).getStatus()).toBe(422);
      expect((caught as HttpException).getResponse()).toEqual(
        expect.objectContaining({
          code: 'GOGOSENSE_DEEPLINK_UNAVAILABLE',
          upstreamStatusCode: 422,
        }),
      );
    }

    expect(detectionEventModel.findOne).toHaveBeenCalledWith({
      _id: new Types.ObjectId(TEST_DETECTION_EVENT_ID),
      user_id: TEST_USER_ID,
      merchant_id: 'merchant-shopee',
      network_merchant_id: 201,
      matched: true,
    });
    expect(activationEventModel.create).toHaveBeenCalled();
    expect(activationEventModel.deleteOne).toHaveBeenCalledWith({
      _id: 'activation-1',
    });
    expect(activationEventModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('activation > given detection event was already activated > rejects before deeplink creation', async () => {
    const { activationEventModel, involveService, service } = makeService();
    activationEventModel.findOne.mockReturnValueOnce(
      makeQueryResult({
        _id: 'activation-existing',
        detection_event_id: '507f1f77bcf86cd799439012',
        user_id: '507f1f77bcf86cd799439011',
      }),
    );

    await expect(
      service.activate('507f1f77bcf86cd799439011', {
        detectionEventId: '507f1f77bcf86cd799439012',
        merchantId: 'merchant-shopee',
        offerId: 101,
        networkMerchantId: 201,
        source: 'gototrack',
      }),
    ).rejects.toThrow('GoGoTrack detection event has already been activated');

    expect(activationEventModel.findOne).toHaveBeenCalledWith({
      user_id: '507f1f77bcf86cd799439011',
      detection_event_id: '507f1f77bcf86cd799439012',
    });
    expect(involveService.createAffiliate).not.toHaveBeenCalled();
    expect(activationEventModel.create).not.toHaveBeenCalled();
  });

  it('activation > given duplicate key on create > then rejects as already activated', async () => {
    const { activationEventModel, involveService, service } = makeService();
    const duplicateKeyError = Object.assign(new Error('duplicate key'), {
      code: 11000,
    });
    activationEventModel.create.mockRejectedValueOnce(duplicateKeyError);

    await expect(
      service.activate('507f1f77bcf86cd799439011', {
        detectionEventId: '507f1f77bcf86cd799439012',
        merchantId: 'merchant-shopee',
        offerId: 101,
        networkMerchantId: 201,
        source: 'gototrack',
      }),
    ).rejects.toThrow('GoGoTrack detection event has already been activated');

    expect(involveService.createAffiliate).not.toHaveBeenCalled();
    expect(activationEventModel.create).toHaveBeenCalled();
  });

  it('activation > given disabled GoGoTrack setting > then rejects gototrack activation', async () => {
    const { activationEventModel, involveService, service } = makeService();
    const userSettingsModel = (service as any).userSettingsModel;
    userSettingsModel.findOne.mockReturnValueOnce(
      makeQueryResult({
        user_id: '507f1f77bcf86cd799439011',
        enabled: false,
      }),
    );

    await expect(
      service.activate('507f1f77bcf86cd799439011', {
        detectionEventId: '507f1f77bcf86cd799439012',
        merchantId: 'merchant-shopee',
        networkMerchantId: 201,
        offerId: 101,
        source: 'gototrack',
      }),
    ).rejects.toThrow('GoGoTrack tracking is disabled');

    expect(involveService.createAffiliate).not.toHaveBeenCalled();
    expect(activationEventModel.create).not.toHaveBeenCalled();
  });

  it('activation > given an invalid detection event id > rejects before deeplink creation', async () => {
    const {
      activationEventModel,
      detectionEventModel,
      involveService,
      service,
    } = makeService();
    detectionEventModel.findOne.mockReturnValueOnce(makeQueryResult(null));

    await expect(
      service.activate('507f1f77bcf86cd799439011', {
        detectionEventId: '507f1f77bcf86cd799439012',
        merchantId: 'merchant-shopee',
        offerId: 101,
        networkMerchantId: 201,
        source: 'gototrack',
      }),
    ).rejects.toThrow('Invalid GoGoTrack detection event for activation');

    expect(involveService.createAffiliate).not.toHaveBeenCalled();
    expect(activationEventModel.create).not.toHaveBeenCalled();
  });

  it('activation > given gototrack source without detection event > rejects before deeplink creation', async () => {
    const {
      activationEventModel,
      detectionEventModel,
      involveService,
      service,
    } = makeService();

    await expect(
      service.activate('507f1f77bcf86cd799439011', {
        merchantId: 'merchant-shopee',
        offerId: 101,
        networkMerchantId: 201,
        source: 'gototrack',
      }),
    ).rejects.toThrow('GoGoTrack activation requires a detection event');

    expect(detectionEventModel.findOne).not.toHaveBeenCalled();
    expect(involveService.createAffiliate).not.toHaveBeenCalled();
    expect(activationEventModel.create).not.toHaveBeenCalled();
  });

  it('activation > given gototrack_background_prompt source > then creates activation', async () => {
    const { activationEventModel, involveService, service } = makeService();

    await expect(
      service.activate('507f1f77bcf86cd799439011', {
        detectionEventId: '507f1f77bcf86cd799439012',
        merchantId: 'merchant-shopee',
        offerId: 101,
        networkMerchantId: 201,
        source: 'gototrack_background_prompt',
      }),
    ).resolves.toMatchObject({
      activationEventId: 'activation-1',
      deeplink: 'https://track.gogocash.co/shopee',
    });

    expect(activationEventModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'gototrack_background_prompt',
      }),
    );
    expect(involveService.createAffiliate).toHaveBeenCalled();
  });

  it('activation > given gototrack_agent source without detection event > rejects before deeplink creation', async () => {
    const { activationEventModel, involveService, service } = makeService();

    await expect(
      service.activate('507f1f77bcf86cd799439011', {
        merchantId: 'merchant-shopee',
        offerId: 101,
        networkMerchantId: 201,
        source: 'gototrack_agent',
      }),
    ).rejects.toThrow('GoGoTrack activation requires a detection event');

    expect(involveService.createAffiliate).not.toHaveBeenCalled();
    expect(activationEventModel.create).not.toHaveBeenCalled();
  });
});

it('detect > minimizes URL and notification text before storing detection event', async () => {
  const { detectionEventModel, service } = makeService();

  await service.detect('507f1f77bcf86cd799439011', {
    method: 'notification',
    notificationText:
      'Shopee order 123456789 for +66 81 234 5678 user test@example.com https://shopee.co.th/orders?token=secret',
    observedAt: '2026-05-23T09:00:00.000Z',
    platform: 'android',
    url: 'https://shopee.co.th/orders?token=secret#fragment',
  });

  expect(detectionEventModel.create).toHaveBeenCalledWith(
    expect.objectContaining({
      notification_text:
        'Shopee order [redacted-number] for [redacted-phone] user [redacted-email] [redacted-url]',
      url: 'https://shopee.co.th',
    }),
  );
});

describe('GototrackService settings and timeline', () => {
  it('settings > given partial update > then only writes provided flags', async () => {
    const { service } = makeService();
    const userSettingsModel = (service as any).userSettingsModel;

    await service.updateSettings('507f1f77bcf86cd799439011', { enabled: true });

    expect(userSettingsModel.findOneAndUpdate).toHaveBeenCalledWith(
      { user_id: '507f1f77bcf86cd799439011' },
      {
        $set: {
          enabled: true,
        },
      },
      { new: true, upsert: true },
    );
  });

  it('settings > given background prompts enabled > then also enables master tracking', async () => {
    const { service } = makeService();
    const userSettingsModel = (service as any).userSettingsModel;

    await service.updateSettings('507f1f77bcf86cd799439011', {
      backgroundPromptsEnabled: true,
    });

    expect(userSettingsModel.findOneAndUpdate).toHaveBeenCalledWith(
      { user_id: '507f1f77bcf86cd799439011' },
      {
        $set: {
          background_prompts_enabled: true,
          enabled: true,
        },
      },
      { new: true, upsert: true },
    );
  });

  it('timeline > given user > then queries only current user events', async () => {
    const { activationEventModel, detectionEventModel, service } =
      makeService();

    await service.getTimeline('507f1f77bcf86cd799439011');

    expect(detectionEventModel.find).toHaveBeenCalledWith({
      user_id: '507f1f77bcf86cd799439011',
    });
    expect(activationEventModel.find).toHaveBeenCalledWith({
      user_id: '507f1f77bcf86cd799439011',
    });
  });

  it('screenshot recovery > given new job > then writes a 24 hour expiry', async () => {
    const now = Date.parse('2026-05-23T09:00:00.000Z');
    const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(now);
    const { service } = makeService();
    const screenshotJobModel = (service as any).screenshotJobModel;

    try {
      await service.createScreenshotJob('507f1f77bcf86cd799439011');
    } finally {
      dateNowSpy.mockRestore();
    }

    expect(screenshotJobModel.create).toHaveBeenCalledWith({
      user_id: '507f1f77bcf86cd799439011',
      status: 'pending',
      expires_at: new Date('2026-05-24T09:00:00.000Z'),
    });
  });

  it('screenshot recovery > given disabled recovery setting > then rejects job creation', async () => {
    const { service } = makeService();
    const screenshotJobModel = (service as any).screenshotJobModel;
    const userSettingsModel = (service as any).userSettingsModel;
    userSettingsModel.findOne.mockReturnValueOnce(
      makeQueryResult({
        user_id: '507f1f77bcf86cd799439011',
        enabled: true,
        screenshot_recovery_enabled: false,
      }),
    );

    await expect(
      service.createScreenshotJob('507f1f77bcf86cd799439011'),
    ).rejects.toThrow('Screenshot recovery is disabled');

    expect(screenshotJobModel.create).not.toHaveBeenCalled();
  });

  it('screenshot recovery > given job lookup > then requires owner and unexpired job', async () => {
    const { service } = makeService();
    const screenshotJobModel = (service as any).screenshotJobModel;

    await service.getScreenshotJob(
      '507f1f77bcf86cd799439011',
      '507f1f77bcf86cd799439013',
    );

    expect(screenshotJobModel.findOne).toHaveBeenCalledWith({
      _id: new Types.ObjectId(TEST_SCREENSHOT_JOB_ID),
      user_id: TEST_USER_ID,
      expires_at: { $gt: expect.any(Date) },
    });
  });
});

describe('GoGoTrack merchant seed catalog', () => {
  it('merchant seed > given MVP target > then defines 30 merchant mapping candidates', () => {
    expect(defaultGototrackMerchants).toHaveLength(30);
    expect(defaultGototrackMerchants).toEqual(
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
      defaultGototrackMerchants.every((merchant) => merchant.enabled === false),
    ).toBe(true);
  });
});
