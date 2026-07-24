import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';

import { Offer } from 'src/offer/schemas/offer.schema';

import {
  QUEST_REVISION_NOT_DRAFT,
  QUEST_REVISION_OFFERS_UNAVAILABLE,
  QUEST_REVISION_SOURCE_STALE,
  QUEST_REVISION_WINDOW_INVALID,
  QUEST_REVISION_WINDOW_OVERLAP,
} from './quest-revision-readiness';
import { QuestRevisionPreflightService } from './quest-revision-preflight.service';
import { Quest } from './schemas/quest.schema';

function query(result: unknown) {
  const value: Record<string, jest.Mock> = {};
  value.select = jest.fn(() => value);
  value.lean = jest.fn().mockResolvedValue(result);
  return value;
}

describe('QuestRevisionPreflightService', () => {
  let service: QuestRevisionPreflightService;
  let questModel: { exists: jest.Mock };
  let offerModel: { find: jest.Mock };

  const now = new Date('2099-07-01T00:00:00.000Z');

  beforeEach(async () => {
    questModel = {
      exists: jest.fn(),
    };
    offerModel = {
      find: jest.fn(),
    };
    const module = await Test.createTestingModule({
      providers: [
        QuestRevisionPreflightService,
        { provide: getModelToken(Quest.name), useValue: questModel },
        { provide: getModelToken(Offer.name), useValue: offerModel },
      ],
    }).compile();
    service = module.get(QuestRevisionPreflightService);
  });

  function completeDraft() {
    const offerId = new Types.ObjectId();
    return {
      _id: new Types.ObjectId(),
      publication_status: 'draft',
      revision_of: new Types.ObjectId(),
      revision_source_campaign_revision: 2,
      revision_source_config_revision: 3,
      start_date: new Date('2099-08-01T00:00:00.000Z'),
      end_date: new Date('2099-08-31T23:59:59.999Z'),
      tasks: [
        {
          task_type: 'brand_purchase',
          offer: offerId,
          offer_id: 10,
          merchant_id: 20,
          enabled: true,
        },
        {
          task_type: 'friend_referral',
          enabled: true,
        },
      ],
    };
  }

  it('returns a clean snapshot receipt for a future draft with current lineage, active offers, and no overlap', async () => {
    const draft = completeDraft();
    const offerId = draft.tasks[0].offer;
    questModel.exists
      .mockResolvedValueOnce({ _id: draft.revision_of })
      .mockResolvedValueOnce(null);
    offerModel.find.mockReturnValue(
      query([{ _id: offerId, offer_id: 10, merchant_id: 20 }]),
    );

    await expect(service.evaluate(draft, now)).resolves.toEqual({
      checked: true,
      blockers: [],
    });

    expect(questModel.exists).toHaveBeenNthCalledWith(1, {
      _id: draft.revision_of,
      publication_status: { $ne: 'draft' },
      $and: [{ campaign_revision: 2 }, { config_revision: 3 }],
    });
    expect(offerModel.find).toHaveBeenCalledWith({
      _id: { $in: [offerId] },
      disabled: { $ne: true },
      status: { $nin: ['pending_review', 'rejected'] },
    });
    expect(questModel.exists).toHaveBeenNthCalledWith(2, {
      _id: { $ne: draft._id },
      publication_status: { $ne: 'draft' },
      start_date: { $lte: draft.end_date },
      end_date: { $gte: draft.start_date },
    });
  });

  it('blocks a disabled source-offer recovery row until Admin replaces or removes it', async () => {
    const draft = {
      ...completeDraft(),
      tasks: [
        {
          task_type: 'brand_purchase',
          enabled: false,
          source_offer_remediation_required: true,
        },
      ],
    };
    questModel.exists
      .mockResolvedValueOnce({ _id: draft.revision_of })
      .mockResolvedValueOnce(null);

    await expect(service.evaluate(draft, now)).resolves.toEqual({
      checked: true,
      blockers: [QUEST_REVISION_OFFERS_UNAVAILABLE],
    });
    expect(offerModel.find).not.toHaveBeenCalled();
  });

  it('matches a source at legacy revision zero when revision fields are zero or missing', async () => {
    const draft = {
      ...completeDraft(),
      revision_source_campaign_revision: 0,
      revision_source_config_revision: 0,
      tasks: [],
    };
    questModel.exists
      .mockResolvedValueOnce({ _id: draft.revision_of })
      .mockResolvedValueOnce(null);

    await expect(service.evaluate(draft, now)).resolves.toEqual({
      checked: true,
      blockers: [],
    });

    expect(questModel.exists).toHaveBeenNthCalledWith(1, {
      _id: draft.revision_of,
      publication_status: { $ne: 'draft' },
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
    });
    expect(offerModel.find).not.toHaveBeenCalled();
  });

  it.each([
    ['missing revision_of', { revision_of: undefined }],
    [
      'missing expected campaign revision',
      { revision_source_campaign_revision: undefined },
    ],
    [
      'negative expected config revision',
      { revision_source_config_revision: -1 },
    ],
  ])(
    'blocks stale lineage for %s without a source lookup',
    async (_label, patch) => {
      const draft = { ...completeDraft(), ...patch, tasks: [] };
      questModel.exists.mockResolvedValueOnce(null);

      await expect(service.evaluate(draft, now)).resolves.toEqual({
        checked: true,
        blockers: [QUEST_REVISION_SOURCE_STALE],
      });

      expect(questModel.exists).toHaveBeenCalledTimes(1);
      expect(questModel.exists).toHaveBeenCalledWith(
        expect.objectContaining({
          publication_status: { $ne: 'draft' },
          start_date: expect.any(Object),
        }),
      );
    },
  );

  it('blocks a draft when the exact source revisions no longer exist', async () => {
    const draft = { ...completeDraft(), tasks: [] };
    questModel.exists.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    await expect(service.evaluate(draft, now)).resolves.toEqual({
      checked: true,
      blockers: [QUEST_REVISION_SOURCE_STALE],
    });
  });

  it.each([
    [
      'started',
      {
        start_date: new Date('2099-07-01T00:00:00.000Z'),
        end_date: new Date('2099-08-01T00:00:00.000Z'),
      },
    ],
    [
      'empty',
      {
        start_date: new Date('2099-08-01T00:00:00.000Z'),
        end_date: new Date('2099-08-01T00:00:00.000Z'),
      },
    ],
    [
      'invalid',
      {
        start_date: 'not-a-date',
        end_date: new Date('2099-08-01T00:00:00.000Z'),
      },
    ],
  ])(
    'blocks a %s campaign window and skips the overlap query',
    async (_label, patch) => {
      const draft = { ...completeDraft(), ...patch, tasks: [] };
      questModel.exists.mockResolvedValueOnce({ _id: draft.revision_of });

      await expect(service.evaluate(draft, now)).resolves.toEqual({
        checked: true,
        blockers: [QUEST_REVISION_WINDOW_INVALID],
      });

      expect(questModel.exists).toHaveBeenCalledTimes(1);
    },
  );

  it('blocks non-draft snapshots even if the other preflight checks pass', async () => {
    const draft = {
      ...completeDraft(),
      publication_status: 'published',
      tasks: [],
    };
    questModel.exists
      .mockResolvedValueOnce({ _id: draft.revision_of })
      .mockResolvedValueOnce(null);

    await expect(service.evaluate(draft, now)).resolves.toEqual({
      checked: true,
      blockers: [QUEST_REVISION_NOT_DRAFT],
    });
  });

  it('ignores disabled brand tasks and deduplicates repeated active offer references', async () => {
    const draft = completeDraft();
    const offerId = draft.tasks[0].offer;
    draft.tasks = [
      draft.tasks[0],
      { ...draft.tasks[0] },
      {
        task_type: 'brand_purchase',
        offer: new Types.ObjectId(),
        offer_id: 30,
        merchant_id: 40,
        enabled: false,
      },
    ];
    questModel.exists
      .mockResolvedValueOnce({ _id: draft.revision_of })
      .mockResolvedValueOnce(null);
    offerModel.find.mockReturnValue(
      query([{ _id: offerId, offer_id: 10, merchant_id: 20 }]),
    );

    await expect(service.evaluate(draft, now)).resolves.toEqual({
      checked: true,
      blockers: [],
    });
    expect(offerModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: { $in: [offerId] },
      }),
    );
  });

  it('blocks stale provider identities even when the referenced offer is active', async () => {
    const draft: Record<string, any> = completeDraft();
    const offerId = draft.tasks[0].offer;
    draft.tasks[0].offer_id = 999;
    draft.tasks[0].merchant_id = 888;
    questModel.exists
      .mockResolvedValueOnce({ _id: draft.revision_of })
      .mockResolvedValueOnce(null);
    offerModel.find.mockReturnValue(
      query([{ _id: offerId, offer_id: 10, merchant_id: 20 }]),
    );

    await expect(service.evaluate(draft, now)).resolves.toEqual({
      checked: true,
      blockers: [QUEST_REVISION_OFFERS_UNAVAILABLE],
    });
  });

  it('blocks invalid, missing, disabled, pending, or rejected brand offer references', async () => {
    const draft: Record<string, any> = completeDraft();
    const unavailableOfferId = new Types.ObjectId();
    draft.tasks = [
      draft.tasks[0],
      {
        task_type: 'brand_purchase',
        offer: unavailableOfferId,
        offer_id: 30,
        merchant_id: 40,
        enabled: true,
      },
      {
        task_type: 'brand_purchase',
        offer: 'not-an-object-id',
        enabled: true,
      },
    ];
    questModel.exists
      .mockResolvedValueOnce({ _id: draft.revision_of })
      .mockResolvedValueOnce(null);
    offerModel.find.mockReturnValue(
      query([
        {
          _id: draft.tasks[0].offer,
          offer_id: 10,
          merchant_id: 20,
        },
      ]),
    );

    await expect(service.evaluate(draft, now)).resolves.toEqual({
      checked: true,
      blockers: [QUEST_REVISION_OFFERS_UNAVAILABLE],
    });
    expect(offerModel.find).toHaveBeenCalledWith({
      _id: {
        $in: [draft.tasks[0].offer, unavailableOfferId],
      },
      disabled: { $ne: true },
      status: { $nin: ['pending_review', 'rejected'] },
    });
  });

  it('blocks an inclusive overlap with any non-draft quest', async () => {
    const draft = { ...completeDraft(), tasks: [] };
    const competingQuestId = new Types.ObjectId();
    questModel.exists
      .mockResolvedValueOnce({ _id: draft.revision_of })
      .mockResolvedValueOnce({ _id: competingQuestId });

    await expect(service.evaluate(draft, now)).resolves.toEqual({
      checked: true,
      blockers: [QUEST_REVISION_WINDOW_OVERLAP],
    });
  });

  it('returns all independent snapshot blockers in a stable order', async () => {
    const draft = {
      ...completeDraft(),
      publication_status: 'published',
      revision_of: 'invalid',
      revision_source_campaign_revision: undefined,
      start_date: new Date('2099-06-01T00:00:00.000Z'),
      end_date: new Date('2099-05-01T00:00:00.000Z'),
      tasks: [
        {
          task_type: 'brand_purchase',
          offer: 'invalid',
          enabled: true,
        },
      ],
    };

    await expect(service.evaluate(draft, now)).resolves.toEqual({
      checked: true,
      blockers: [
        QUEST_REVISION_NOT_DRAFT,
        QUEST_REVISION_WINDOW_INVALID,
        QUEST_REVISION_SOURCE_STALE,
        QUEST_REVISION_OFFERS_UNAVAILABLE,
      ],
    });
    expect(questModel.exists).not.toHaveBeenCalled();
    expect(offerModel.find).not.toHaveBeenCalled();
  });

  it('propagates database failures instead of issuing a false readiness receipt', async () => {
    const draft = { ...completeDraft(), tasks: [] };
    questModel.exists.mockRejectedValueOnce(new Error('database unavailable'));

    await expect(service.evaluate(draft, now)).rejects.toThrow(
      'database unavailable',
    );
  });
});
