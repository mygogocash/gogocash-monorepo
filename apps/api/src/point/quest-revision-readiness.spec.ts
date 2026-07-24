import {
  QUEST_REVISION_PREFLIGHT_REQUIRED,
  questRevisionWorkflowReadiness,
} from './quest-revision-readiness';

describe('questRevisionWorkflowReadiness', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      QUEST_REVISION_WORKFLOW_ENABLED: 'true',
      QUEST_TASK_V2_ENABLED: 'true',
      QUEST_REVISION_PUBLISH_READY: 'true',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const completeDraft = {
    publication_status: 'draft',
    reward_model: 'task_v2',
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
    banner_en: 'banner-en',
    banner_th: 'banner-th',
    sub_banner_en: 'sub-banner-en',
    sub_banner_th: 'sub-banner-th',
    blocked_decisions: [],
  };

  it('allows a complete selected draft only after an authoritative preflight receipt', () => {
    expect(
      questRevisionWorkflowReadiness(completeDraft, {
        canCreateRevision: false,
        publishPreflight: { checked: true, blockers: [] },
      }),
    ).toEqual({
      workflow_enabled: true,
      task_v2_enabled: true,
      publish_ready: true,
      can_create_revision: false,
      can_publish: true,
      blockers: [],
    });
  });

  it('does not let static content checks advertise publication readiness', () => {
    expect(
      questRevisionWorkflowReadiness(completeDraft, {
        canCreateRevision: false,
      }),
    ).toMatchObject({
      can_publish: false,
      blockers: expect.arrayContaining([QUEST_REVISION_PREFLIGHT_REQUIRED]),
    });
  });

  it('fails closed and explains every disabled environment gate', () => {
    process.env.QUEST_REVISION_WORKFLOW_ENABLED = 'false';
    process.env.QUEST_TASK_V2_ENABLED = 'false';
    process.env.QUEST_REVISION_PUBLISH_READY = 'false';

    expect(
      questRevisionWorkflowReadiness(completeDraft, {
        canCreateRevision: false,
      }),
    ).toMatchObject({
      can_create_revision: false,
      can_publish: false,
      blockers: expect.arrayContaining([
        'QUEST_REVISION_WORKFLOW_DISABLED',
        'QUEST_TASK_V2_UNAVAILABLE',
        'QUEST_REVISION_PUBLISH_NOT_READY',
      ]),
    });
  });

  it('does not expose publish for a source quest', () => {
    expect(
      questRevisionWorkflowReadiness(
        { ...completeDraft, publication_status: 'published' },
        { canCreateRevision: true },
      ),
    ).toMatchObject({
      can_create_revision: true,
      can_publish: false,
      blockers: expect.arrayContaining(['QUEST_REVISION_NOT_DRAFT']),
    });
  });

  it('keeps malformed task and reward economics fail-closed', () => {
    expect(
      questRevisionWorkflowReadiness(
        {
          ...completeDraft,
          tasks: [
            {
              task_key: 'client-owned',
              task_type: 'friend_referral',
              points: Number.NaN,
              enabled: true,
              wording_en: '',
              completion_rule: 'anything',
            },
          ],
          rewards: [
            { rank: 1, reward: 1200, currency: 'THB' },
            { rank: 1, reward: -1, currency: 'THB' },
          ],
        },
        { canCreateRevision: false },
      ),
    ).toMatchObject({
      can_publish: false,
      blockers: expect.arrayContaining([
        'QUEST_REVISION_TASKS_INVALID',
        'QUEST_REVISION_REWARDS_INVALID',
      ]),
    });
  });
});
