import {
  canonicalizeStoredQuestTask,
  effectiveQuestRewardModel,
  hasQuestTaskEconomicChange,
  hasQuestTaskIdentityChange,
  revisedQuestTaskKey,
  stableLegacyTaskKey,
} from './quest-task.contract';

describe('quest task contract', () => {
  const questId = '6942b79d7b9f8214ada6eed5';
  const offerId = '6942b79d7b9f8214ada6eed6';

  it('reads a missing reward_model as legacy_v1 and rejects unknown models', () => {
    expect(effectiveQuestRewardModel(undefined)).toBe('legacy_v1');
    expect(effectiveQuestRewardModel('legacy_v1')).toBe('legacy_v1');
    expect(effectiveQuestRewardModel('task_v2')).toBe('task_v2');
    expect(() => effectiveQuestRewardModel('future_v3')).toThrow(
      'Unknown quest reward_model',
    );
  });

  it('maps a legacy offer task to brand_purchase without losing legacy fields', () => {
    const legacy = {
      offer: offerId,
      offer_id: 803,
      merchant_id: 1604,
      extra_point: 50,
      sort_order: 7,
      enabled: false,
      wording: 'Legacy wording',
      wording_en: 'English wording',
      wording_th: 'ข้อความไทย',
      notes: 'Keep me',
    };

    expect(canonicalizeStoredQuestTask(questId, legacy, undefined)).toEqual({
      ...legacy,
      task_type: 'brand_purchase',
      task_key: stableLegacyTaskKey(questId, offerId),
      points: 50,
    });
  });

  it('derives a stable legacy task key from quest and offer identity, not order', () => {
    expect(stableLegacyTaskKey(questId, offerId)).toBe(
      stableLegacyTaskKey(questId, offerId),
    );
    expect(
      canonicalizeStoredQuestTask(
        questId,
        { offer: offerId, extra_point: 20, sort_order: 0 },
        'legacy_v1',
      ).task_key,
    ).toBe(
      canonicalizeStoredQuestTask(
        questId,
        { offer: offerId, extra_point: 20, sort_order: 99 },
        'legacy_v1',
      ).task_key,
    );
  });

  it('derives deterministic revision-scoped task keys for schedule changes', () => {
    const previousTaskKey = 'task_existing_key_1234';

    expect(revisedQuestTaskKey(questId, previousTaskKey, 6)).toBe(
      revisedQuestTaskKey(questId, previousTaskKey, 6),
    );
    expect(revisedQuestTaskKey(questId, previousTaskKey, 6)).not.toBe(
      previousTaskKey,
    );
    expect(revisedQuestTaskKey(questId, previousTaskKey, 6)).not.toBe(
      revisedQuestTaskKey(questId, previousTaskKey, 7),
    );
  });

  it('treats wording and notes as presentation-only but freezes every economic field', () => {
    const before = {
      reward_model: 'task_v2' as const,
      timezone: 'Asia/Bangkok' as const,
      audience: { kind: 'all' as const },
      reward_caps: {
        max_awards_per_user: 1,
        max_referrals_per_user: null,
      },
      tasks: [
        {
          task_key: 'task_existing_key_1234',
          task_type: 'friend_referral' as const,
          completion_rule: 'account_created' as const,
          points: 50,
          sort_order: 0,
          enabled: true,
          wording_en: 'Invite',
          wording_th: 'ชวนเพื่อน',
          notes: '',
        },
      ],
    };

    expect(
      hasQuestTaskEconomicChange(before, {
        ...before,
        tasks: [
          {
            ...before.tasks[0],
            wording_en: 'Invite one friend',
            notes: 'Updated by support',
          },
        ],
      }),
    ).toBe(false);

    for (const change of [
      { points: 75 },
      { enabled: false },
      { completion_rule: 'first_earning_conversion' },
      { sort_order: 1 },
    ]) {
      expect(
        hasQuestTaskEconomicChange(before, {
          ...before,
          tasks: [{ ...before.tasks[0], ...change } as never],
        }),
      ).toBe(true);
    }
  });

  it('rotates task identity for qualification changes but not copy or ordering', () => {
    const before = {
      task_key: 'task_existing',
      task_type: 'friend_referral',
      completion_rule: 'account_created',
      points: 50,
      sort_order: 0,
      enabled: true,
      wording_en: 'Invite',
    };

    expect(
      hasQuestTaskIdentityChange(before, {
        ...before,
        task_key: 'task_other',
        sort_order: 9,
        wording_en: 'Invite a friend',
      }),
    ).toBe(false);
    expect(hasQuestTaskIdentityChange(before, { ...before, points: 75 })).toBe(
      true,
    );
    expect(
      hasQuestTaskIdentityChange(before, {
        ...before,
        completion_rule: 'first_earning_conversion',
      }),
    ).toBe(true);
  });
});
