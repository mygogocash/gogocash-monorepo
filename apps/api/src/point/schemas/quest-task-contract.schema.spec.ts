import { QuestSchema, QuestTaskSchema } from './quest.schema';

describe('Quest task contract schema', () => {
  it('keeps reward_model optional for legacy reads and stores a separate config revision', () => {
    expect(QuestSchema.path('reward_model')?.options.required).not.toBe(true);
    expect(QuestSchema.path('reward_model')?.options.enum).toEqual([
      'legacy_v1',
      'task_v2',
    ]);
    expect(QuestSchema.path('config_revision')?.options.default).toBe(0);
    expect(QuestSchema.path('campaign_revision')).toBeDefined();
  });

  it('stores discriminated task fields without requiring brand fields globally', () => {
    expect(QuestTaskSchema.path('task_type')?.options.enum).toEqual([
      'brand_purchase',
      'friend_referral',
      'spend_target',
    ]);
    expect(QuestTaskSchema.path('task_key')).toBeDefined();
    expect(QuestTaskSchema.path('points')).toBeDefined();
    expect(QuestTaskSchema.path('offer')?.options.required).not.toBe(true);
    expect(QuestTaskSchema.path('completion_rule')?.options.enum).toEqual([
      'account_created',
      'first_earning_conversion',
    ]);
    expect(QuestTaskSchema.path('spend_scope')?.options.enum).toEqual([
      'any_shop_via_ggc',
    ]);
    expect(QuestTaskSchema.path('target_thb_minor')).toBeDefined();
  });

  it('persists the Bangkok eligibility/cap contract and atomic state fence', () => {
    expect(QuestSchema.path('timezone')?.options.default).toBe('Asia/Bangkok');
    expect(QuestSchema.path('audience')).toBeDefined();
    expect(QuestSchema.path('reward_caps')).toBeDefined();
    expect(QuestSchema.path('task_v2_state_frozen_at')).toBeDefined();
    expect(QuestSchema.path('task_v2_state_frozen_revision')).toBeDefined();
    expect(
      QuestSchema.path('task_v2_state_frozen_reason')?.options.enum,
    ).toEqual(['outbox', 'progress', 'award']);
  });

  it('persists legacy reconciliation and round-completion rollout fields', () => {
    expect(
      QuestSchema.path('legacy_payout_reconciliation_status')?.options.enum,
    ).toEqual(['pending', 'ready', 'quarantined']);
    expect(
      QuestSchema.path('legacy_payout_reconciliation_version'),
    ).toBeDefined();
    expect(QuestSchema.path('legacy_payout_reconciled_at')).toBeDefined();
    expect(QuestSchema.path('legacy_special_point_completed_at')).toBeDefined();
    expect(QuestSchema.path('legacy_rank_payout_completed_at')).toBeDefined();
  });
});
