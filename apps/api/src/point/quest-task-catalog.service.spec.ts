import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';

import { Offer } from 'src/offer/schemas/offer.schema';

import { QuestEconomicMutationPolicy } from './quest-economic-mutation-policy.service';
import { QuestRevisionPreflightService } from './quest-revision-preflight.service';
import { QuestTaskCatalogService } from './quest-task-catalog.service';
import { Quest } from './schemas/quest.schema';

function query(result: unknown) {
  const value: Record<string, jest.Mock> = {};
  for (const method of ['select', 'sort', 'limit', 'lean']) {
    value[method] = jest.fn(() => value);
  }
  value.lean = jest.fn().mockResolvedValue(result);
  return value;
}

describe('QuestTaskCatalogService', () => {
  let service: QuestTaskCatalogService;
  let questModel: { findOne: jest.Mock; findById: jest.Mock };
  let offerModel: { find: jest.Mock };
  let revisionPreflight: { evaluate: jest.Mock };
  const originalEnv = process.env;

  beforeEach(async () => {
    process.env = {
      ...originalEnv,
      QUEST_REVISION_WORKFLOW_ENABLED: 'false',
      QUEST_TASK_V2_ENABLED: 'false',
      QUEST_REVISION_PUBLISH_READY: 'false',
    };
    questModel = {
      findOne: jest.fn(),
      findById: jest.fn(),
    };
    offerModel = { find: jest.fn() };
    revisionPreflight = {
      evaluate: jest.fn().mockResolvedValue({ checked: true, blockers: [] }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestTaskCatalogService,
        QuestEconomicMutationPolicy,
        {
          provide: QuestRevisionPreflightService,
          useValue: revisionPreflight,
        },
        { provide: getModelToken(Quest.name), useValue: questModel },
        { provide: getModelToken(Offer.name), useValue: offerModel },
      ],
    }).compile();
    service = module.get(QuestTaskCatalogService);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns a versioned empty public catalog when there is no active quest', async () => {
    questModel.findOne.mockReturnValue(query(null));

    await expect(service.getPublicCatalog()).resolves.toEqual({
      contract_version: 1,
      quest_id: null,
      config_revision: null,
      catalog_source: 'none',
      tasks: [],
    });
    expect(questModel.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        publication_status: { $ne: 'draft' },
        status: { $ne: 'close' },
      }),
    );
    expect(offerModel.find).not.toHaveBeenCalled();
  });

  it('resolves active empty legacy quests from offers plus the server-owned threshold rule', async () => {
    const questId = new Types.ObjectId();
    const offerId = new Types.ObjectId();
    questModel.findOne.mockReturnValue(
      query({
        _id: questId,
        status: 'scheduled',
        publication_status: 'published',
        reward_model: 'legacy_v1',
        config_revision: 3,
        start_date: new Date('2026-07-01T00:00:00.000Z'),
        end_date: new Date('2099-07-31T23:59:59.999Z'),
        tasks: [],
      }),
    );
    offerModel.find.mockReturnValue(
      query([
        {
          _id: offerId,
          offer_name: 'Internal raw name',
          offer_name_display: 'Traveloka',
          logo_desktop: 'https://cdn.example/traveloka.png',
          extra_point: 50,
          tracking_link: 'https://secret-affiliate.example/click',
          commissions: [{ Commission: '10%' }],
        },
      ]),
    );

    const result = await service.getPublicCatalog();

    expect(result).toEqual({
      contract_version: 1,
      quest_id: questId.toHexString(),
      config_revision: 3,
      catalog_source: 'legacy_compatibility',
      tasks: [
        {
          task_key: `legacy:offer:${offerId.toHexString()}`,
          task_kind: 'brand_purchase',
          points: 50,
          sort_order: 0,
          wording_en: 'Make an order on Traveloka',
          wording_th: 'สั่งซื้อที่ Traveloka',
          target: { kind: 'purchase', required_purchases: 1 },
          offer: {
            id: offerId.toHexString(),
            name: 'Traveloka',
            logo_uri: 'https://cdn.example/traveloka.png',
            href: `/shop/${offerId.toHexString()}`,
          },
        },
        {
          task_key: 'legacy:points-threshold:300',
          task_kind: 'points_threshold_bonus',
          points: 50,
          sort_order: 1,
          wording_en: 'Reach 300 quest points',
          wording_th: 'สะสมคะแนนเควสต์ให้ครบ 300 คะแนน',
          target: {
            kind: 'quest_points_threshold',
            threshold_points: 300,
          },
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain('tracking_link');
    expect(JSON.stringify(result)).not.toContain('Commission');
    expect(offerModel.find.mock.results[0].value.limit).toHaveBeenCalledWith(
      100,
    );
  });

  it('does not fall back to offers for an empty task-v2 quest', async () => {
    questModel.findOne.mockReturnValue(
      query({
        _id: new Types.ObjectId(),
        status: 'open',
        reward_model: 'task_v2',
        config_revision: 1,
        start_date: new Date('2026-07-01T00:00:00.000Z'),
        end_date: new Date('2099-07-31T23:59:59.999Z'),
        tasks: [],
      }),
    );

    await expect(service.getPublicCatalog()).resolves.toMatchObject({
      catalog_source: 'none',
      tasks: [],
    });
    expect(offerModel.find).not.toHaveBeenCalled();
  });

  it('uses enabled canonical tasks instead of legacy offer fallback', async () => {
    const questId = new Types.ObjectId();
    const offerId = new Types.ObjectId();
    questModel.findOne.mockReturnValue(
      query({
        _id: questId,
        status: 'open',
        reward_model: 'task_v2',
        config_revision: 8,
        start_date: new Date('2026-07-01T00:00:00.000Z'),
        end_date: new Date('2099-07-31T23:59:59.999Z'),
        tasks: [
          {
            task_key: 'task_brand_1',
            task_type: 'brand_purchase',
            offer: offerId,
            offer_id: 1,
            merchant_id: 10,
            points: 75,
            sort_order: 2,
            enabled: true,
            wording_en: 'Buy from Traveloka',
            wording_th: 'ซื้อสินค้าจาก Traveloka',
            notes: 'admin-only',
          },
          {
            task_key: 'task_disabled',
            task_type: 'friend_referral',
            points: 100,
            sort_order: 1,
            enabled: false,
            completion_rule: 'account_created',
          },
        ],
      }),
    );
    offerModel.find.mockReturnValue(
      query([
        {
          _id: offerId,
          offer_name_display: 'Traveloka',
          extra_point: 999,
        },
      ]),
    );

    const result = await service.getPublicCatalog();

    expect(result.catalog_source).toBe('canonical');
    expect(result.tasks).toEqual([
      expect.objectContaining({
        task_key: 'task_brand_1',
        points: 75,
        wording_en: 'Buy from Traveloka',
      }),
    ]);
    expect(JSON.stringify(result)).not.toContain('admin-only');
    expect(result.tasks.every((task) => !('source' in task))).toBe(true);
    expect(result.tasks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ task_kind: 'points_threshold_bonus' }),
      ]),
    );
  });

  it('appends the server-owned threshold rule to stored legacy tasks', async () => {
    const questId = new Types.ObjectId();
    const offerId = new Types.ObjectId();
    questModel.findOne.mockReturnValue(
      query({
        _id: questId,
        status: 'open',
        reward_model: 'legacy_v1',
        config_revision: 4,
        start_date: new Date('2020-01-01T00:00:00.000Z'),
        end_date: new Date('2099-01-01T00:00:00.000Z'),
        tasks: [
          {
            task_key: 'task_legacy_brand_1234',
            task_type: 'brand_purchase',
            offer: offerId,
            offer_id: 12,
            merchant_id: 34,
            points: 50,
            extra_point: 50,
            sort_order: 7,
            enabled: true,
            wording_en: 'Buy from Traveloka',
            wording_th: 'ซื้อสินค้าจาก Traveloka',
          },
        ],
      }),
    );
    offerModel.find.mockReturnValue(
      query([
        {
          _id: offerId,
          offer_name_display: 'Traveloka',
          extra_point: 50,
        },
      ]),
    );

    const result = await service.getPublicCatalog();

    expect(result.catalog_source).toBe('canonical');
    expect(result.tasks).toEqual([
      expect.objectContaining({
        task_key: 'task_legacy_brand_1234',
        task_kind: 'brand_purchase',
        sort_order: 7,
      }),
      expect.objectContaining({
        task_key: 'legacy:points-threshold:300',
        task_kind: 'points_threshold_bonus',
        sort_order: 8,
      }),
    ]);
    expect(result.tasks.every((task) => !('source' in task))).toBe(true);
  });

  it('keeps the legacy threshold rule when every stored legacy task is disabled', async () => {
    questModel.findOne.mockReturnValue(
      query({
        _id: new Types.ObjectId(),
        status: 'open',
        reward_model: 'legacy_v1',
        config_revision: 1,
        start_date: new Date('2020-01-01T00:00:00.000Z'),
        end_date: new Date('2099-01-01T00:00:00.000Z'),
        tasks: [
          {
            task_key: 'task_disabled_referral_1234',
            task_type: 'friend_referral',
            completion_rule: 'account_created',
            points: 50,
            enabled: false,
          },
        ],
      }),
    );

    await expect(service.getPublicCatalog()).resolves.toMatchObject({
      catalog_source: 'canonical',
      tasks: [
        {
          task_key: 'legacy:points-threshold:300',
          task_kind: 'points_threshold_bonus',
          sort_order: 0,
        },
      ],
    });
    expect(offerModel.find).not.toHaveBeenCalled();
  });

  it.each([
    {
      task_key: 'task_invalid_referral',
      task_type: 'friend_referral',
      points: 50,
      sort_order: 0,
      enabled: true,
    },
    {
      task_key: 'task_invalid_spend',
      task_type: 'spend_target',
      points: 50,
      sort_order: 0,
      enabled: true,
      spend_scope: 'any_shop_via_ggc',
      target_thb_minor: Number.NaN,
    },
  ])(
    'fails closed when a stored $task_type task violates its subtype contract',
    async (task) => {
      questModel.findOne.mockReturnValue(
        query({
          _id: new Types.ObjectId(),
          status: 'open',
          reward_model: 'task_v2',
          config_revision: 1,
          start_date: new Date('2020-01-01T00:00:00.000Z'),
          end_date: new Date('2099-01-01T00:00:00.000Z'),
          tasks: [task],
        }),
      );

      await expect(service.getPublicCatalog()).rejects.toMatchObject({
        status: 500,
        response: expect.objectContaining({
          code: 'QUEST_TASK_CATALOG_INVALID',
        }),
      });
    },
  );

  it('returns provenance and read-only capabilities for an active legacy quest', async () => {
    const questId = new Types.ObjectId();
    const offerId = new Types.ObjectId();
    questModel.findById.mockReturnValue(
      query({
        _id: questId,
        status: 'open',
        reward_model: 'legacy_v1',
        config_revision: 1,
        start_date: new Date('2020-01-01T00:00:00.000Z'),
        end_date: new Date('2099-01-01T00:00:00.000Z'),
        tasks: [],
      }),
    );
    offerModel.find.mockReturnValue(
      query([
        {
          _id: offerId,
          offer_name: 'Shopee',
          extra_point: 50,
        },
      ]),
    );

    const result = await service.getAdminCatalog(questId.toHexString());

    expect(result).toMatchObject({
      stored_task_count: 0,
      effective_task_count: 2,
      catalog_source: 'legacy_compatibility',
      capabilities: {
        can_edit_campaign_economics: false,
        can_edit_task_economics: false,
        can_edit_rewards: false,
        can_edit_presentation: true,
        can_create_revision: false,
        freeze_reason: 'QUEST_ALREADY_STARTED',
      },
      revision_workflow: {
        workflow_enabled: false,
        task_v2_enabled: false,
        publish_ready: false,
        can_create_revision: false,
        can_publish: false,
        blockers: expect.arrayContaining(['QUEST_REVISION_NOT_DRAFT']),
      },
    });
    expect(result.tasks.map((task) => task.source)).toEqual([
      'legacy_offer_fallback',
      'legacy_system_rule',
    ]);
    expect(
      result.tasks.every((task) => task.editable_fields.length === 0),
    ).toBe(true);
    expect(revisionPreflight.evaluate).not.toHaveBeenCalled();
  });

  it('uses the shared dynamic preflight before advertising a draft as publishable', async () => {
    process.env.QUEST_REVISION_WORKFLOW_ENABLED = 'true';
    process.env.QUEST_TASK_V2_ENABLED = 'true';
    process.env.QUEST_REVISION_PUBLISH_READY = 'true';
    const questId = new Types.ObjectId();
    questModel.findById.mockReturnValue(
      query({
        _id: questId,
        revision_of: new Types.ObjectId(),
        publication_status: 'draft',
        status: 'scheduled',
        reward_model: 'task_v2',
        config_revision: 1,
        start_date: new Date('2099-08-01T00:00:00.000Z'),
        end_date: new Date('2099-08-31T00:00:00.000Z'),
        tasks: [
          {
            task_key: 'task_referral_12345678',
            task_type: 'friend_referral',
            points: 50,
            enabled: true,
            wording_en: 'Invite an eligible friend',
            completion_rule: 'account_created',
          },
        ],
        rewards: [{ rank: 1, reward: 1200 }],
        banner_en: 'en',
        banner_th: 'th',
        sub_banner_en: 'sub-en',
        sub_banner_th: 'sub-th',
        blocked_decisions: [],
      }),
    );
    revisionPreflight.evaluate.mockResolvedValue({
      checked: true,
      blockers: ['QUEST_REVISION_WINDOW_OVERLAP'],
    });

    const result = await service.getAdminCatalog(questId.toHexString());

    expect(revisionPreflight.evaluate).toHaveBeenCalledWith(
      expect.objectContaining({ _id: questId }),
    );
    expect(result.revision_workflow).toMatchObject({
      can_publish: false,
      blockers: expect.arrayContaining(['QUEST_REVISION_WINDOW_OVERLAP']),
    });
  });
});
