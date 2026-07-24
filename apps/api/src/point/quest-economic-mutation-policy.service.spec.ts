import { QuestEconomicMutationPolicy } from './quest-economic-mutation-policy.service';

describe('QuestEconomicMutationPolicy', () => {
  const policy = new QuestEconomicMutationPolicy();
  const now = new Date('2026-07-23T10:00:00.000Z');

  it('allows economic and presentation edits before start with no effects', () => {
    expect(
      policy.capabilities(
        { start_date: new Date('2026-08-01T00:00:00.000Z') },
        undefined,
        now,
      ),
    ).toEqual({
      can_edit_campaign_economics: true,
      can_edit_task_economics: true,
      can_edit_rewards: true,
      can_edit_presentation: true,
      can_create_revision: true,
      freeze_reason: null,
    });
  });

  it('freezes every economic surface after start for any reward model', () => {
    const capabilities = policy.capabilities(
      { start_date: new Date('2026-07-01T00:00:00.000Z') },
      undefined,
      now,
    );

    expect(capabilities).toMatchObject({
      can_edit_campaign_economics: false,
      can_edit_task_economics: false,
      can_edit_rewards: false,
      can_edit_presentation: true,
      freeze_reason: 'QUEST_ALREADY_STARTED',
    });
  });

  it('freezes a future quest when durable effects already exist', () => {
    expect(
      policy.capabilities(
        { start_date: new Date('2026-08-01T00:00:00.000Z') },
        { has_progress: true },
        now,
      ).freeze_reason,
    ).toBe('QUEST_HAS_EFFECTS');
  });

  it('freezes a published future revision before it starts', () => {
    expect(
      policy.capabilities(
        {
          revision_of: 'source-quest',
          publication_status: 'published',
          start_date: new Date('2026-08-01T00:00:00.000Z'),
        },
        undefined,
        now,
      ).freeze_reason,
    ).toBe('QUEST_REVISION_PUBLISHED');
  });

  it('rejects moving a future quest window into the past', () => {
    expect(() =>
      policy.assertEconomicMutationAllowed(
        { start_date: new Date('2026-08-01T00:00:00.000Z') },
        undefined,
        {
          now,
          next_start_date: new Date('2026-07-01T00:00:00.000Z'),
        },
      ),
    ).toThrow(
      expect.objectContaining({
        response: expect.objectContaining({
          code: 'QUEST_TASK_CONFIG_FROZEN',
          freeze_reason: 'QUEST_ALREADY_STARTED',
        }),
      }),
    );
  });
});
