import { Types } from 'mongoose';

import {
  contributionFromConversion,
  conversionTransitionPolicy,
  customerOffer,
  matchesBrandPurchaseTask,
  memoizeQuestFxRateProviderForEvent,
  membershipQualifiesAt,
  questEventSelectionDate,
  requalificationCanAward,
  QuestFxUnavailableError,
  QuestTaskProgressService,
  questAwardIdentity,
} from './quest-task-progress.service';

describe('QuestTaskProgressService pure contracts', () => {
  describe('membership audience validity at immutable event time', () => {
    const tierId = new Types.ObjectId();
    const otherTierId = new Types.ObjectId();
    const at = new Date('2026-07-17T12:00:00.000Z');
    const membership = (overrides: Record<string, unknown> = {}) => ({
      tier_id: tierId,
      status: 'active',
      start_date: new Date('2026-07-01T00:00:00.000Z'),
      tier_assignment_started_at: new Date('2026-07-01T00:00:00.000Z'),
      end_date: new Date('2026-07-31T23:59:59.999Z'),
      cancelled_at: null,
      ...overrides,
    });

    it.each([
      ['active in-window membership', membership(), true],
      ['wrong tier', membership({ tier_id: otherTierId }), false],
      [
        'before current tier assignment',
        membership({
          tier_assignment_started_at: new Date('2026-07-18T00:00:00.000Z'),
        }),
        false,
      ],
      [
        'before membership start',
        membership({ start_date: new Date('2026-07-18T00:00:00.000Z') }),
        false,
      ],
      [
        'after membership expiry',
        membership({ end_date: new Date('2026-07-16T23:59:59.999Z') }),
        false,
      ],
      [
        'cancelled after event',
        membership({
          status: 'cancelled',
          cancelled_at: new Date('2026-07-18T00:00:00.000Z'),
        }),
        true,
      ],
      [
        'cancelled exactly at event',
        membership({ status: 'cancelled', cancelled_at: at }),
        false,
      ],
      [
        'cancelled before event',
        membership({
          status: 'cancelled',
          cancelled_at: new Date('2026-07-17T11:59:59.999Z'),
        }),
        false,
      ],
      [
        'cancelled without cancellation time',
        membership({ status: 'cancelled' }),
        false,
      ],
      [
        'expired with historical end boundary after event',
        membership({
          status: 'expired',
          end_date: new Date('2026-07-18T00:00:00.000Z'),
        }),
        true,
      ],
      [
        'expired without a valid end boundary',
        membership({ status: 'expired', end_date: 'not-a-date' }),
        false,
      ],
      ['pending membership', membership({ status: 'pending' }), false],
      ['paused membership', membership({ status: 'paused' }), false],
      ['unknown membership state', membership({ status: 'vip' }), false],
    ])('%s is evaluated deterministically', (_label, record, expected) => {
      expect(membershipQualifiesAt(record, [tierId.toHexString()], at)).toBe(
        expected,
      );
    });

    it('fails closed for missing membership, malformed configured ids, and malformed dates or assignment boundaries', () => {
      expect(membershipQualifiesAt(null, [tierId.toHexString()], at)).toBe(
        false,
      );
      expect(membershipQualifiesAt(membership(), ['gogopass'], at)).toBe(false);
      expect(
        membershipQualifiesAt(
          membership({ start_date: 'not-a-date' }),
          [tierId.toHexString()],
          at,
        ),
      ).toBe(false);
      expect(
        membershipQualifiesAt(
          membership({ tier_assignment_started_at: undefined }),
          [tierId.toHexString()],
          at,
        ),
      ).toBe(false);
      expect(
        membershipQualifiesAt(
          membership({ tier_assignment_started_at: 'not-a-date' }),
          [tierId.toHexString()],
          at,
        ),
      ).toBe(false);
    });

    it('denies historical tier-B replay before A-to-B assignment and admits post-switch events', () => {
      const tierB = new Types.ObjectId();
      const switchedAt = new Date('2026-07-17T12:00:00.000Z');
      const reassignedMembership = membership({
        tier_id: tierB,
        tier_assignment_started_at: switchedAt,
      });

      expect(
        membershipQualifiesAt(
          reassignedMembership,
          [tierB.toHexString()],
          new Date(switchedAt.getTime() - 1),
        ),
      ).toBe(false);
      expect(
        membershipQualifiesAt(
          reassignedMembership,
          [tierB.toHexString()],
          switchedAt,
        ),
      ).toBe(true);
    });
  });

  it('separates user and referral-pair achievement identities from event ids', () => {
    expect(questAwardIdentity('q1', 'task_spend', 'user1')).toBe(
      'quest:q1:task:task_spend:user:user1',
    );
    expect(questAwardIdentity('q1', 'task_ref', 'referrer', 'referee')).toBe(
      'quest:q1:task:task_ref:referrer:referrer:referee:referee',
    );
  });

  it('persists THB minor-unit normalization with immutable quote evidence', async () => {
    const quote = {
      rate: 35.25,
      as_of: new Date('2026-07-17T00:00:00.000Z'),
      source: 'test-fx',
    };
    const quoteToThb = jest.fn().mockResolvedValue(quote);
    const occurredAt = new Date('2026-07-16T23:59:00.000Z');
    await expect(
      contributionFromConversion(
        {
          event_type: 'approved',
          occurred_at: occurredAt,
          current: {
            conversion_status: 'approved',
            sale_amount: 12.34,
            payout: 1,
            currency: 'USD',
          },
        },
        { quoteToThb },
        0,
      ),
    ).resolves.toEqual({
      delta_thb_minor: 43_499,
      active_thb_minor: 43_499,
      snapshot: {
        original_amount_minor: 1234,
        original_currency: 'USD',
        fx_rate_to_thb: 35.25,
        fx_as_of: quote.as_of,
        fx_source: 'test-fx',
        normalized_thb_minor: 43_499,
      },
    });
    expect(quoteToThb).toHaveBeenCalledWith('USD', occurredAt);
  });

  it('memoizes one immutable FX snapshot per currency and reference date', async () => {
    const quote = {
      rate: 35,
      as_of: new Date('2026-07-16T00:00:00.000Z'),
      source: 'test-fx',
    };
    const provider = {
      quoteToThb: jest.fn().mockResolvedValue(quote),
    };
    const eventFx = memoizeQuestFxRateProviderForEvent(provider);
    const at = new Date('2026-07-17T06:00:00.000Z');

    const [first, second] = await Promise.all([
      eventFx.quoteToThb('usd', at),
      eventFx.quoteToThb('USD', at),
    ]);

    expect(provider.quoteToThb).toHaveBeenCalledTimes(1);
    expect(first).toBe(quote);
    expect(second).toBe(quote);
  });

  it('reversal reuses the prior immutable amount and never fetches current FX', async () => {
    const provider = { quoteToThb: jest.fn() };
    await expect(
      contributionFromConversion(
        {
          event_type: 'reversed',
          current: { conversion_status: 'rejected' },
        },
        provider,
        25_000,
      ),
    ).resolves.toMatchObject({
      delta_thb_minor: -25_000,
      active_thb_minor: 0,
    });
    expect(provider.quoteToThb).not.toHaveBeenCalled();
  });

  it('missing FX stays retryable and yields no contribution', async () => {
    await expect(
      contributionFromConversion(
        {
          event_type: 'approved',
          occurred_at: new Date('2026-07-17T00:00:00.000Z'),
          current: {
            conversion_status: 'approved',
            sale_amount: 100,
            payout: 5,
            currency: 'JPY',
          },
        },
        { quoteToThb: jest.fn().mockResolvedValue(null) },
        0,
      ),
    ).rejects.toBeInstanceOf(QuestFxUnavailableError);
  });

  it('correction emits only the immutable replacement delta', async () => {
    await expect(
      contributionFromConversion(
        {
          event_type: 'correction',
          occurred_at: new Date('2026-07-17T00:00:00.000Z'),
          current: {
            conversion_status: 'approved',
            sale_amount: 150,
            payout: 5,
            currency: 'THB',
          },
        },
        { quoteToThb: jest.fn() },
        10_000,
      ),
    ).resolves.toMatchObject({
      delta_thb_minor: 5_000,
      active_thb_minor: 15_000,
      snapshot: { normalized_thb_minor: 15_000 },
    });
  });

  it('compensates prior spend when a correction becomes non-earning', async () => {
    const provider = { quoteToThb: jest.fn() };
    await expect(
      contributionFromConversion(
        {
          event_type: 'correction',
          occurred_at: new Date('2026-07-17T00:00:00.000Z'),
          current: {
            conversion_status: 'approved',
            sale_amount: 150,
            payout: 0,
            currency: 'USD',
          },
        },
        provider,
        15_000,
      ),
    ).resolves.toEqual({
      delta_thb_minor: -15_000,
      active_thb_minor: 0,
      snapshot: {
        normalized_thb_minor: 0,
        disqualified_thb_minor: 15_000,
      },
    });
    expect(provider.quoteToThb).not.toHaveBeenCalled();
  });

  it('requires exact offer and merchant parity for brand purchases', () => {
    const task = {
      task_type: 'brand_purchase' as const,
      offer_id: 10,
      merchant_id: 20,
    };
    expect(
      matchesBrandPurchaseTask(task, { offer_id: 10, merchant_id: 20 }),
    ).toBe(true);
    expect(
      matchesBrandPurchaseTask(task, { offer_id: 11, merchant_id: 20 }),
    ).toBe(false);
    expect(
      matchesBrandPurchaseTask(task, { offer_id: 10, merchant_id: 21 }),
    ).toBe(false);
  });

  it('projects only bounded customer-safe brand offer fields', () => {
    const offer = customerOffer({
      task_type: 'brand_purchase',
      offer: {
        _id: 'offer-1',
        offer_name_display: 'Safe Shop',
        logo_desktop: 'https://cdn.example/logo.png',
        tracking_link: 'https://secret-network.example/click',
        commission_store: 'internal commission',
        raw: { secret: true },
      },
    } as never);
    expect(offer).toEqual({
      id: 'offer-1',
      name: 'Safe Shop',
      logo_url: 'https://cdn.example/logo.png',
      shop_path: '/shop/offer-1',
    });
    expect(offer).not.toHaveProperty('tracking_link');
    expect(offer).not.toHaveProperty('commission_store');
    expect(offer).not.toHaveProperty('raw');
  });

  it('selects conversion quests by immutable purchase time, not approval time', () => {
    const approvedAt = new Date('2026-08-01T00:00:00.000Z');
    const purchasedAt = new Date('2026-07-17T02:00:00.000Z');
    expect(
      questEventSelectionDate(
        'affiliate_conversion',
        { current: { datetime_conversion: purchasedAt } },
        approvedAt,
      ),
    ).toEqual(purchasedAt);
    expect(
      questEventSelectionDate('account_registration', {}, approvedAt),
    ).toEqual(approvedAt);
  });

  it('allows late approval/correction but blocks positive requalification after quest end', () => {
    const end = new Date('2026-07-31T16:59:59.999Z');
    const afterEnd = new Date('2026-08-01T00:00:00.000Z');
    expect(
      requalificationCanAward(
        { event_type: 'approved', occurred_at: afterEnd },
        end,
      ),
    ).toBe(true);
    expect(
      requalificationCanAward(
        { event_type: 'correction', occurred_at: afterEnd },
        end,
      ),
    ).toBe(true);
    expect(
      requalificationCanAward(
        { event_type: 'requalified', occurred_at: afterEnd },
        end,
      ),
    ).toBe(false);
  });

  it('gates only new positive conversion state on the current audience', () => {
    const questEnd = new Date('2026-07-31T16:59:59.999Z');
    const approved = {
      event_type: 'approved',
      occurred_at: new Date('2026-07-17T00:00:00.000Z'),
      current: {
        conversion_status: 'approved',
        sale_amount: 100,
        payout: 5,
      },
    };
    expect(
      conversionTransitionPolicy(approved, questEnd, false, 0, false),
    ).toMatchObject({
      currentlyEarning: true,
      shouldEvaluateContribution: false,
      audienceQualificationDenied: true,
    });
    expect(
      conversionTransitionPolicy(approved, questEnd, true, 0, false),
    ).toMatchObject({
      shouldEvaluateContribution: true,
      audienceQualificationDenied: false,
    });
  });

  it('keeps corrections and reversals evaluable for existing state after audience loss', () => {
    const questEnd = new Date('2026-07-31T16:59:59.999Z');
    const correction = {
      event_type: 'correction',
      occurred_at: new Date('2026-07-18T00:00:00.000Z'),
      current: {
        conversion_status: 'approved',
        sale_amount: 150,
        payout: 5,
      },
    };
    const reversed = {
      event_type: 'reversed',
      occurred_at: new Date('2026-07-19T00:00:00.000Z'),
      current: {
        conversion_status: 'rejected',
        sale_amount: 150,
        payout: 5,
      },
    };

    expect(
      conversionTransitionPolicy(correction, questEnd, false, 10_000, true),
    ).toMatchObject({
      currentlyEarning: true,
      shouldEvaluateContribution: true,
      audienceQualificationDenied: false,
    });
    expect(
      conversionTransitionPolicy(reversed, questEnd, false, 10_000, true),
    ).toMatchObject({
      currentlyEarning: false,
      shouldEvaluateContribution: true,
    });
    expect(
      conversionTransitionPolicy(
        { ...correction, event_type: 'requalified' },
        questEnd,
        false,
        0,
        false,
      ),
    ).toMatchObject({
      shouldEvaluateContribution: false,
      audienceQualificationDenied: true,
    });
    expect(
      conversionTransitionPolicy(
        { ...correction, event_type: 'requalified' },
        questEnd,
        false,
        0,
        true,
      ),
    ).toMatchObject({
      shouldEvaluateContribution: true,
      audienceQualificationDenied: false,
    });
  });

  it('returns all-audience and matching-tier quests but hides ineligible tiers', async () => {
    const userId = new Types.ObjectId();
    const eligibleTierId = new Types.ObjectId();
    const ineligibleTierId = new Types.ObjectId();
    const task = {
      task_key: 'referral-task',
      task_type: 'friend_referral',
      completion_rule: 'account_created',
      points: 100,
      sort_order: 0,
      enabled: true,
      wording: 'Refer a friend',
      wording_en: 'Refer a friend',
      wording_th: 'ชวนเพื่อน',
      notes: '',
    };
    const quest = (
      audience: Record<string, unknown>,
      id = new Types.ObjectId(),
    ) => ({
      _id: id,
      reward_model: 'task_v2',
      config_revision: 1,
      start_date: new Date('2026-07-01T00:00:00.000Z'),
      end_date: new Date('2026-07-31T16:59:59.999Z'),
      reward_caps: {
        max_awards_per_user: null,
        max_referrals_per_user: null,
      },
      audience,
      tasks: [task],
    });
    const allQuest = quest({ kind: 'all', tier_ids: [] });
    const eligibleQuest = quest({
      kind: 'membership_tiers',
      tier_ids: [eligibleTierId.toHexString()],
    });
    const ineligibleQuest = quest({
      kind: 'membership_tiers',
      tier_ids: [ineligibleTierId.toHexString()],
    });
    const questQuery = {
      sort: jest.fn(),
      populate: jest
        .fn()
        .mockResolvedValue([allQuest, eligibleQuest, ineligibleQuest]),
    };
    questQuery.sort.mockReturnValue(questQuery);
    const questModel = { find: jest.fn().mockReturnValue(questQuery) };
    const membershipModel = {
      findOne: jest.fn().mockResolvedValue({
        tier_id: eligibleTierId,
        status: 'active',
        start_date: new Date('2026-07-01T00:00:00.000Z'),
        tier_assignment_started_at: new Date('2026-07-01T00:00:00.000Z'),
        end_date: new Date('2026-07-31T16:59:59.999Z'),
        cancelled_at: null,
      }),
    };
    const progressModel = { find: jest.fn().mockResolvedValue([]) };
    const service = new QuestTaskProgressService(
      questModel as never,
      {} as never,
      membershipModel as never,
      {} as never,
      {} as never,
      progressModel as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const response = await service.getCustomerProgress(
      userId.toHexString(),
      new Date('2026-07-17T00:00:00.000Z'),
    );

    expect(response.map((entry) => entry.quest_id)).toEqual([
      allQuest._id.toHexString(),
      eligibleQuest._id.toHexString(),
    ]);
    expect(membershipModel.findOne).toHaveBeenCalledTimes(2);
    expect(progressModel.find).toHaveBeenCalledTimes(2);
  });
});
