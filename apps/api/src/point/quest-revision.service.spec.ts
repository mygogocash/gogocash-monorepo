import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';

import { Offer } from 'src/offer/schemas/offer.schema';

import { QuestRevisionPreflightService } from './quest-revision-preflight.service';
import {
  QuestRevisionService,
  SOURCE_OFFER_REMEDIATION_WARNING,
} from './quest-revision.service';
import { QuestTaskCatalogService } from './quest-task-catalog.service';
import { Quest } from './schemas/quest.schema';

function query(result: unknown) {
  const value: Record<string, jest.Mock> = {};
  for (const method of ['lean', 'select', 'sort']) {
    value[method] = jest.fn(() => value);
  }
  value.lean = jest.fn().mockResolvedValue(result);
  return value;
}

describe('QuestRevisionService', () => {
  let service: QuestRevisionService;
  let questModel: {
    findById: jest.Mock;
    findOne: jest.Mock;
    findOneAndUpdate: jest.Mock;
    exists: jest.Mock;
  };
  let offerModel: { find: jest.Mock };
  let catalog: { getAdminCatalog: jest.Mock };
  let revisionPreflight: { evaluate: jest.Mock };
  const originalEnv = process.env;

  beforeEach(async () => {
    process.env = {
      ...originalEnv,
      QUEST_REVISION_WORKFLOW_ENABLED: 'true',
      QUEST_REVISION_PUBLISH_READY: 'true',
      QUEST_TASK_V2_ENABLED: 'false',
    };
    questModel = {
      findById: jest.fn(),
      findOne: jest.fn().mockReturnValue(query(null)),
      findOneAndUpdate: jest.fn(),
      exists: jest.fn().mockResolvedValue(null),
    };
    offerModel = { find: jest.fn() };
    catalog = { getAdminCatalog: jest.fn() };
    revisionPreflight = {
      evaluate: jest.fn().mockResolvedValue({ checked: true, blockers: [] }),
    };
    const module = await Test.createTestingModule({
      providers: [
        QuestRevisionService,
        { provide: getModelToken(Quest.name), useValue: questModel },
        { provide: getModelToken(Offer.name), useValue: offerModel },
        { provide: QuestTaskCatalogService, useValue: catalog },
        {
          provide: QuestRevisionPreflightService,
          useValue: revisionPreflight,
        },
      ],
    }).compile();
    service = module.get(QuestRevisionService);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const input = {
    request_key: 'quest-revision:august-2026',
    expected_campaign_revision: 2,
    expected_config_revision: 3,
    start_date: new Date('2099-08-01T00:00:00.000Z'),
    end_date: new Date('2099-08-31T23:59:59.999Z'),
    reason: 'Prepare the next campaign',
  };
  const actorId = new Types.ObjectId().toHexString();

  function legacySource(id: Types.ObjectId) {
    return {
      _id: id,
      campaign_revision: 2,
      config_revision: 3,
      reward_model: 'legacy_v1',
      start_date: new Date('2026-07-01T00:00:00.000Z'),
      end_date: new Date('2026-07-31T23:59:59.999Z'),
      status: 'open',
      banner_en: 'https://cdn.example/banner-en.png',
      banner_th: 'https://cdn.example/banner-th.png',
      sub_banner_en: 'https://cdn.example/sub-en.png',
      sub_banner_th: 'https://cdn.example/sub-th.png',
      banner_assets: {},
      rewards: [{ rank: 1, reward: 1200, currency: 'THB' }],
      tasks: [],
    };
  }

  it('fails closed while the revision workflow flag is off', async () => {
    process.env.QUEST_REVISION_WORKFLOW_ENABLED = 'false';

    await expect(
      service.createRevision(
        new Types.ObjectId().toHexString(),
        input,
        'admin',
      ),
    ).rejects.toMatchObject({
      status: 503,
      response: expect.objectContaining({
        code: 'QUEST_REVISION_WORKFLOW_DISABLED',
      }),
    });
    expect(questModel.findById).not.toHaveBeenCalled();
  });

  it('rejects revision writes without a stable authenticated admin actor', async () => {
    await expect(
      service.createRevision(
        new Types.ObjectId().toHexString(),
        input,
        'missing-actor',
      ),
    ).rejects.toMatchObject({
      status: 400,
      message: 'Authenticated admin actor is required.',
    });
    expect(questModel.findById).not.toHaveBeenCalled();
  });

  it('creates an idempotent legacy draft with canonical brand tasks and blocks the unresolved system rule', async () => {
    const sourceId = new Types.ObjectId();
    const offerId = new Types.ObjectId();
    const source = legacySource(sourceId);
    let created: Record<string, any> | null = null;
    questModel.findById
      .mockReturnValueOnce(query(null))
      .mockReturnValueOnce(query(source))
      .mockImplementation(() => query(created));
    catalog.getAdminCatalog.mockResolvedValue({
      tasks: [
        {
          source: 'legacy_offer_fallback',
          task_kind: 'brand_purchase',
          task_key: `legacy:offer:${offerId}`,
          points: 50,
          sort_order: 0,
          wording_en: 'Make an order on Traveloka',
          wording_th: 'สั่งซื้อที่ Traveloka',
          offer: { id: String(offerId), name: 'Traveloka' },
        },
        {
          source: 'legacy_system_rule',
          task_kind: 'points_threshold_bonus',
          task_key: 'legacy:points-threshold:300',
          points: 50,
          sort_order: 1,
          wording_en: 'Reach 300 quest points',
          wording_th: 'สะสมคะแนนเควสต์ให้ครบ 300 คะแนน',
        },
      ],
    });
    offerModel.find.mockReturnValue(
      query([{ _id: offerId, offer_id: 10, merchant_id: 20 }]),
    );
    questModel.findOneAndUpdate.mockImplementation(
      (_filter, update: { $setOnInsert: Record<string, any> }) => {
        created = update.$setOnInsert;
        return query(created);
      },
    );
    questModel.exists
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ _id: sourceId });

    const first = await service.createRevision(
      sourceId.toHexString(),
      input,
      actorId,
    );
    const replay = await service.createRevision(
      sourceId.toHexString(),
      input,
      actorId,
    );

    expect(first).toMatchObject({
      quest: {
        revision_of: sourceId,
        revision_number: 1,
        publication_status: 'draft',
        reward_model: 'task_v2',
        tasks: [
          expect.objectContaining({
            task_type: 'brand_purchase',
            offer: offerId,
            points: 50,
          }),
        ],
      },
      blocked_decisions: ['legacy_points_threshold_semantics'],
      warnings: [
        expect.objectContaining({
          code: 'LEGACY_POINTS_THRESHOLD_NOT_MATERIALIZED',
        }),
      ],
    });
    expect(replay).toEqual(first);
    expect(first.quest.tasks).toHaveLength(1);
    expect(first.quest).not.toHaveProperty('revision_request_key');
    expect(first.quest).not.toHaveProperty('revision_payload_hash');
    expect(first.quest).not.toHaveProperty('revision_created_by');
    expect(first.quest).not.toHaveProperty('banner_assets');
    expect(questModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
  });

  it('rejects an overlapping future window before creating a draft', async () => {
    const sourceId = new Types.ObjectId();
    questModel.findById
      .mockReturnValueOnce(query(null))
      .mockReturnValueOnce(query(legacySource(sourceId)));
    questModel.exists.mockResolvedValue({ _id: new Types.ObjectId() });

    await expect(
      service.createRevision(sourceId.toHexString(), input, actorId),
    ).rejects.toThrow('overlaps another published quest');
    expect(questModel.exists).toHaveBeenCalledWith(
      expect.objectContaining({
        start_date: { $lte: input.end_date },
        end_date: { $gte: input.start_date },
      }),
    );
    expect(questModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('accepts missing legacy revision fields as expected revision zero', async () => {
    const sourceId = new Types.ObjectId();
    const {
      campaign_revision: _campaignRevision,
      config_revision: _configRevision,
      ...source
    } = legacySource(sourceId);
    let created: Record<string, any> | null = null;
    questModel.findById
      .mockReturnValueOnce(query(null))
      .mockReturnValueOnce(query(source));
    catalog.getAdminCatalog.mockResolvedValue({ tasks: [] });
    offerModel.find.mockReturnValue(query([]));
    questModel.exists
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ _id: sourceId });
    questModel.findOneAndUpdate.mockImplementation(
      (_filter, update: { $setOnInsert: Record<string, any> }) => {
        created = update.$setOnInsert;
        return query(created);
      },
    );
    await expect(
      service.createRevision(
        sourceId.toHexString(),
        {
          ...input,
          request_key: 'quest-revision:legacy-zero',
          expected_campaign_revision: 0,
          expected_config_revision: 0,
        },
        actorId,
      ),
    ).resolves.toMatchObject({
      quest: {
        revision_source_campaign_revision: 0,
        revision_source_config_revision: 0,
      },
    });
    expect(questModel.exists).toHaveBeenLastCalledWith(
      expect.objectContaining({
        $and: [
          {
            $or: [
              { campaign_revision: 0 },
              { campaign_revision: { $exists: false } },
            ],
          },
          {
            $or: [
              { config_revision: 0 },
              { config_revision: { $exists: false } },
            ],
          },
        ],
      }),
    );
  });

  it('canonicalizes stored pre-v2 brand tasks in the new task-v2 draft', async () => {
    const sourceId = new Types.ObjectId();
    const offerId = new Types.ObjectId();
    const source = legacySource(sourceId);
    source.tasks = [
      {
        offer: offerId,
        offer_id: 999,
        merchant_id: 888,
        extra_point: 50,
        enabled: true,
        wording: 'Buy from Traveloka',
        sort_order: 0,
      },
    ];
    let created: Record<string, any> | null = null;
    questModel.findById
      .mockReturnValueOnce(query(null))
      .mockReturnValueOnce(query(source));
    questModel.exists
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ _id: sourceId });
    questModel.findOneAndUpdate.mockImplementation(
      (_filter, update: { $setOnInsert: Record<string, any> }) => {
        created = update.$setOnInsert;
        return query(created);
      },
    );
    offerModel.find.mockReturnValue(
      query([{ _id: offerId, offer_id: 10, merchant_id: 20 }]),
    );

    await expect(
      service.createRevision(
        sourceId.toHexString(),
        { ...input, request_key: 'quest-revision:stored-legacy-task' },
        actorId,
      ),
    ).resolves.toMatchObject({
      quest: {
        reward_model: 'task_v2',
        tasks: [
          expect.objectContaining({
            task_key: expect.stringMatching(/^task_/),
            task_type: 'brand_purchase',
            offer: offerId,
            offer_id: 10,
            merchant_id: 20,
            points: 50,
            extra_point: 50,
          }),
        ],
      },
      blocked_decisions: ['legacy_points_threshold_semantics'],
      warnings: [
        expect.objectContaining({
          code: 'LEGACY_POINTS_THRESHOLD_NOT_MATERIALIZED',
        }),
      ],
    });
    expect(catalog.getAdminCatalog).not.toHaveBeenCalled();
  });

  it('creates a recoverable draft when a frozen source references an unavailable offer', async () => {
    const sourceId = new Types.ObjectId();
    const offerId = new Types.ObjectId();
    const source = {
      ...legacySource(sourceId),
      reward_model: 'task_v2',
      tasks: [
        {
          task_key: 'task_retired_offer_1234',
          task_type: 'brand_purchase',
          offer: offerId,
          offer_id: 10,
          merchant_id: 20,
          points: 50,
          extra_point: 50,
          enabled: true,
          sort_order: 0,
          wording: 'Shop at retired brand',
          wording_en: 'Shop at retired brand',
          wording_th: '',
          notes: '',
        },
      ],
    };
    let created: Record<string, any> | null = null;
    questModel.findById
      .mockReturnValueOnce(query(null))
      .mockReturnValueOnce(query(source));
    questModel.exists
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ _id: sourceId });
    offerModel.find.mockReturnValue(query([]));
    questModel.findOneAndUpdate.mockImplementation(
      (_filter, update: { $setOnInsert: Record<string, any> }) => {
        created = update.$setOnInsert;
        return query(created);
      },
    );

    const result = await service.createRevision(
      sourceId.toHexString(),
      { ...input, request_key: 'quest-revision:retired-offer-recovery' },
      actorId,
    );

    expect(result).toMatchObject({
      quest: {
        publication_status: 'draft',
        tasks: [
          {
            task_type: 'brand_purchase',
            offer: offerId,
            offer_id: 10,
            merchant_id: 20,
            enabled: false,
            source_offer_remediation_required: true,
          },
        ],
      },
      warnings: [
        expect.objectContaining({
          code: SOURCE_OFFER_REMEDIATION_WARNING,
        }),
      ],
      blocked_decisions: [],
    });
    expect(questModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
  });

  it('allocates the next direct-child number when a stale draft already exists', async () => {
    const sourceId = new Types.ObjectId();
    const source = legacySource(sourceId);
    let created: Record<string, any> | null = null;
    questModel.findById
      .mockReturnValueOnce(query(null))
      .mockReturnValueOnce(query(source));
    questModel.findOne.mockReturnValue(query({ revision_number: 1 }));
    questModel.exists
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ _id: sourceId });
    catalog.getAdminCatalog.mockResolvedValue({ tasks: [] });
    offerModel.find.mockReturnValue(query([]));
    questModel.findOneAndUpdate.mockImplementation(
      (_filter, update: { $setOnInsert: Record<string, any> }) => {
        created = update.$setOnInsert;
        return query(created);
      },
    );

    await expect(
      service.createRevision(
        sourceId.toHexString(),
        { ...input, request_key: 'quest-revision:replace-stale-draft' },
        actorId,
      ),
    ).resolves.toMatchObject({
      quest: { revision_of: sourceId, revision_number: 2 },
    });
  });

  it('retries with a fresh lineage number when a concurrent creator wins', async () => {
    const sourceId = new Types.ObjectId();
    const source = legacySource(sourceId);
    const latestChildren = [{ revision_number: 1 }, { revision_number: 2 }];
    questModel.findById
      .mockReturnValueOnce(query(null))
      .mockReturnValueOnce(query(source))
      .mockReturnValue(query(null));
    questModel.findOne.mockImplementation((filter) =>
      'revision_of' in filter
        ? query(latestChildren.shift() ?? { revision_number: 2 })
        : query(null),
    );
    questModel.exists
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ _id: sourceId });
    catalog.getAdminCatalog.mockResolvedValue({ tasks: [] });
    offerModel.find.mockReturnValue(query([]));
    questModel.findOneAndUpdate
      .mockImplementationOnce(() => {
        throw Object.assign(new Error('duplicate lineage'), { code: 11000 });
      })
      .mockImplementationOnce(
        (_filter, update: { $setOnInsert: Record<string, any> }) =>
          query(update.$setOnInsert),
      );

    await expect(
      service.createRevision(
        sourceId.toHexString(),
        { ...input, request_key: 'quest-revision:concurrent-lineage' },
        actorId,
      ),
    ).resolves.toMatchObject({
      quest: { revision_number: 3 },
    });
    expect(questModel.findOneAndUpdate).toHaveBeenCalledTimes(2);
  });

  it('rechecks the source revision through a CAS fence before inserting', async () => {
    const sourceId = new Types.ObjectId();
    questModel.findById
      .mockReturnValueOnce(query(null))
      .mockReturnValueOnce(query(legacySource(sourceId)));
    catalog.getAdminCatalog.mockResolvedValue({ tasks: [] });
    offerModel.find.mockReturnValue(query([]));
    questModel.exists.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    await expect(
      service.createRevision(sourceId.toHexString(), input, actorId),
    ).rejects.toMatchObject({
      status: 409,
      response: expect.objectContaining({
        code: 'QUEST_CONFIG_REVISION_CONFLICT',
      }),
    });
    expect(questModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('keeps publication unavailable until task-v2 is enabled', async () => {
    await expect(
      service.publishRevision(
        new Types.ObjectId().toHexString(),
        {
          request_key: 'quest-publish:august-2026',
          expected_campaign_revision: 0,
          expected_config_revision: 0,
        },
        actorId,
      ),
    ).rejects.toMatchObject({
      status: 503,
      response: expect.objectContaining({ code: 'QUEST_TASK_V2_UNAVAILABLE' }),
    });
    expect(questModel.findById).not.toHaveBeenCalled();
  });

  it('keeps publication unavailable until the separate readiness gate is enabled', async () => {
    process.env.QUEST_REVISION_PUBLISH_READY = 'false';
    process.env.QUEST_TASK_V2_ENABLED = 'true';

    await expect(
      service.publishRevision(
        new Types.ObjectId().toHexString(),
        {
          request_key: 'quest-publish:august-2026',
          expected_campaign_revision: 0,
          expected_config_revision: 0,
        },
        actorId,
      ),
    ).rejects.toMatchObject({
      status: 503,
      response: expect.objectContaining({
        code: 'QUEST_REVISION_PUBLISH_NOT_READY',
      }),
    });
    expect(questModel.findById).not.toHaveBeenCalled();
  });

  it('blocks publication while the legacy threshold decision is unresolved', async () => {
    process.env.QUEST_TASK_V2_ENABLED = 'true';
    const id = new Types.ObjectId();
    questModel.findById.mockReturnValue(
      query({
        _id: id,
        revision_of: new Types.ObjectId(),
        revision_source_campaign_revision: 2,
        revision_source_config_revision: 3,
        publication_status: 'draft',
        reward_model: 'task_v2',
        campaign_revision: 0,
        config_revision: 0,
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
        blocked_decisions: ['legacy_points_threshold_semantics'],
      }),
    );

    await expect(
      service.publishRevision(
        id.toHexString(),
        {
          request_key: 'quest-publish:august-2026',
          expected_campaign_revision: 0,
          expected_config_revision: 0,
        },
        actorId,
      ),
    ).rejects.toMatchObject({
      status: 409,
      response: expect.objectContaining({
        code: 'QUEST_REVISION_DECISION_REQUIRED',
      }),
    });
    expect(questModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('re-runs the shared publication preflight before the publish CAS', async () => {
    process.env.QUEST_TASK_V2_ENABLED = 'true';
    const id = new Types.ObjectId();
    questModel.findById.mockReturnValue(
      query({
        _id: id,
        revision_of: new Types.ObjectId(),
        revision_source_campaign_revision: 2,
        revision_source_config_revision: 3,
        publication_status: 'draft',
        reward_model: 'task_v2',
        campaign_revision: 0,
        config_revision: 0,
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
      blockers: ['QUEST_REVISION_SOURCE_STALE'],
    });

    await expect(
      service.publishRevision(
        id.toHexString(),
        {
          request_key: 'quest-publish:stale-source',
          expected_campaign_revision: 0,
          expected_config_revision: 0,
        },
        actorId,
      ),
    ).rejects.toMatchObject({
      status: 409,
      response: expect.objectContaining({
        code: 'QUEST_CONFIG_REVISION_CONFLICT',
        blocker: 'QUEST_REVISION_SOURCE_STALE',
      }),
    });
    expect(revisionPreflight.evaluate).toHaveBeenCalledWith(
      expect.objectContaining({ _id: id }),
    );
    expect(questModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('publishes a complete unblocked draft through one CAS update', async () => {
    process.env.QUEST_TASK_V2_ENABLED = 'true';
    const id = new Types.ObjectId();
    const draft = {
      _id: id,
      revision_of: new Types.ObjectId(),
      revision_source_campaign_revision: 2,
      revision_source_config_revision: 3,
      publication_status: 'draft',
      reward_model: 'task_v2',
      campaign_revision: 0,
      config_revision: 0,
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
    };
    questModel.findById.mockReturnValue(query(draft));
    questModel.exists
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ _id: draft.revision_of });
    questModel.findOneAndUpdate.mockImplementation((_filter, update) =>
      query({ ...draft, ...update.$set }),
    );

    const published = await service.publishRevision(
      id.toHexString(),
      {
        request_key: 'quest-publish:august-2026',
        expected_campaign_revision: 0,
        expected_config_revision: 0,
      },
      actorId,
    );
    expect(published).toMatchObject({
      published: true,
      quest: {
        publication_status: 'published',
      },
      revision_workflow: {
        can_publish: false,
        can_create_revision: true,
      },
    });
    expect(published.quest).not.toHaveProperty('published_by');
    expect(published.quest).not.toHaveProperty('publish_request_key');
    expect(published.quest).not.toHaveProperty('publish_payload_hash');
    expect(published.quest).not.toHaveProperty('banner_assets');
    expect(questModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: id,
        publication_status: 'draft',
        campaign_revision: 0,
        config_revision: 0,
        revision_source_campaign_revision: 2,
        revision_source_config_revision: 3,
        start_date: { $gt: expect.any(Date) },
      }),
      expect.objectContaining({
        $set: expect.objectContaining({
          publication_status: 'published',
        }),
      }),
      { new: true },
    );
  });

  it('returns the published winner when an identical concurrent publish loses CAS', async () => {
    process.env.QUEST_TASK_V2_ENABLED = 'true';
    const id = new Types.ObjectId();
    const draft = {
      _id: id,
      revision_of: new Types.ObjectId(),
      revision_source_campaign_revision: 2,
      revision_source_config_revision: 3,
      publication_status: 'draft',
      reward_model: 'task_v2',
      campaign_revision: 0,
      config_revision: 0,
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
    };
    let winner: Record<string, any> | null = null;
    questModel.findById
      .mockReturnValueOnce(query(draft))
      .mockImplementation(() => query(winner));
    questModel.exists
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ _id: draft.revision_of });
    questModel.findOneAndUpdate.mockImplementation((_filter, update) => {
      winner = { ...draft, ...update.$set };
      return query(null);
    });

    await expect(
      service.publishRevision(
        id.toHexString(),
        {
          request_key: 'quest-publish:concurrent-august-2026',
          expected_campaign_revision: 0,
          expected_config_revision: 0,
        },
        actorId,
      ),
    ).resolves.toMatchObject({
      published: true,
      quest: { publication_status: 'published' },
      revision_workflow: { can_create_revision: true },
    });
  });
});
