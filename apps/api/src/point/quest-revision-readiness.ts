export const QUEST_REVISION_WORKFLOW_DISABLED =
  'QUEST_REVISION_WORKFLOW_DISABLED';
export const QUEST_DIRECT_CREATE_DISABLED = 'QUEST_DIRECT_CREATE_DISABLED';
export const QUEST_TASK_V2_UNAVAILABLE = 'QUEST_TASK_V2_UNAVAILABLE';
export const QUEST_REVISION_PUBLISH_NOT_READY =
  'QUEST_REVISION_PUBLISH_NOT_READY';
export const QUEST_REVISION_PREFLIGHT_REQUIRED =
  'QUEST_REVISION_PREFLIGHT_REQUIRED';
export const QUEST_REVISION_WINDOW_INVALID = 'QUEST_REVISION_WINDOW_INVALID';
export const QUEST_REVISION_SOURCE_STALE = 'QUEST_REVISION_SOURCE_STALE';
export const QUEST_REVISION_OFFERS_UNAVAILABLE =
  'QUEST_REVISION_OFFERS_UNAVAILABLE';
export const QUEST_REVISION_WINDOW_OVERLAP = 'QUEST_REVISION_WINDOW_OVERLAP';
export const QUEST_REVISION_NOT_DRAFT = 'QUEST_REVISION_NOT_DRAFT';
export const QUEST_REVISION_TASKS_REQUIRED = 'QUEST_REVISION_TASKS_REQUIRED';
export const QUEST_REVISION_TASKS_INVALID = 'QUEST_REVISION_TASKS_INVALID';
export const QUEST_REVISION_REWARDS_REQUIRED =
  'QUEST_REVISION_REWARDS_REQUIRED';
export const QUEST_REVISION_REWARDS_INVALID = 'QUEST_REVISION_REWARDS_INVALID';
export const QUEST_REVISION_MEDIA_REQUIRED = 'QUEST_REVISION_MEDIA_REQUIRED';
export const QUEST_REVISION_DECISION_REQUIRED =
  'QUEST_REVISION_DECISION_REQUIRED';

export type QuestRevisionWorkflowReadiness = {
  workflow_enabled: boolean;
  task_v2_enabled: boolean;
  publish_ready: boolean;
  can_create_revision: boolean;
  can_publish: boolean;
  blockers: string[];
};

export type QuestRevisionPublishPreflight = {
  checked: true;
  blockers: string[];
};

type QuestRevisionReadinessRecord = {
  publication_status?: unknown;
  reward_model?: unknown;
  tasks?: Array<Record<string, unknown>>;
  rewards?: Array<Record<string, unknown>>;
  banner_en?: unknown;
  banner_th?: unknown;
  sub_banner_en?: unknown;
  sub_banner_th?: unknown;
  banner_assets?: Record<string, { url?: unknown } | undefined>;
  blocked_decisions?: unknown[];
};

function enabled(name: string): boolean {
  return process.env[name]?.trim().toLowerCase() === 'true';
}

export function isQuestRevisionWorkflowEnabled(): boolean {
  return enabled('QUEST_REVISION_WORKFLOW_ENABLED');
}

function hasMedia(
  quest: QuestRevisionReadinessRecord,
  key: 'banner_en' | 'banner_th' | 'sub_banner_en' | 'sub_banner_th',
): boolean {
  return Boolean(
    String(quest[key] ?? '').trim() ||
    String(quest.banner_assets?.[key]?.url ?? '').trim(),
  );
}

function hasValidTask(task: Record<string, unknown>): boolean {
  const taskKey = String(task.task_key ?? '').trim();
  const points = Number(task.points ?? task.extra_point);
  const wordingEn =
    String(task.wording_en ?? '').trim() || String(task.wording ?? '').trim();
  const wordingTh = String(task.wording_th ?? '').trim();
  if (
    !/^task_[A-Za-z0-9_-]{12,80}$/.test(taskKey) ||
    !Number.isSafeInteger(points) ||
    points < 2 ||
    points > 10_000 ||
    (!wordingEn && !wordingTh) ||
    wordingEn.length > 140 ||
    wordingTh.length > 140
  ) {
    return false;
  }

  if (task.task_type === 'brand_purchase') {
    const offerId = Number(task.offer_id);
    const merchantId = Number(task.merchant_id);
    return Boolean(
      String(task.offer ?? '').trim() &&
      Number.isSafeInteger(offerId) &&
      offerId > 0 &&
      Number.isSafeInteger(merchantId) &&
      merchantId > 0,
    );
  }
  if (task.task_type === 'friend_referral') {
    return (
      task.completion_rule === 'account_created' ||
      task.completion_rule === 'first_earning_conversion'
    );
  }
  if (task.task_type === 'spend_target') {
    const target = Number(task.target_thb_minor);
    return (
      task.spend_scope === 'any_shop_via_ggc' &&
      Number.isSafeInteger(target) &&
      target >= 1
    );
  }
  return false;
}

function hasValidRewards(rewards: Array<Record<string, unknown>>): boolean {
  const ranks = new Set<number>();
  return rewards.every((item) => {
    const rank = Number(item.rank);
    const reward = Number(item.reward);
    const currency = String(item.currency ?? 'THB').trim();
    if (
      !Number.isInteger(rank) ||
      rank < 1 ||
      rank > 1_000 ||
      !Number.isFinite(reward) ||
      reward < 0 ||
      reward > 1_000_000 ||
      !currency ||
      currency.length > 12 ||
      ranks.has(rank)
    ) {
      return false;
    }
    ranks.add(rank);
    return true;
  });
}

export function questRevisionContentBlockers(
  quest: QuestRevisionReadinessRecord,
): string[] {
  const blockers: string[] = [];
  const enabledTasks = (quest.tasks ?? []).filter(
    (task) => task.enabled !== false,
  );
  if (quest.reward_model !== 'task_v2' || enabledTasks.length === 0) {
    blockers.push(QUEST_REVISION_TASKS_REQUIRED);
  } else if (
    !enabledTasks.every(hasValidTask) ||
    new Set(enabledTasks.map((task) => String(task.task_key))).size !==
      enabledTasks.length
  ) {
    blockers.push(QUEST_REVISION_TASKS_INVALID);
  }
  if (!Array.isArray(quest.rewards) || quest.rewards.length === 0) {
    blockers.push(QUEST_REVISION_REWARDS_REQUIRED);
  } else if (!hasValidRewards(quest.rewards)) {
    blockers.push(QUEST_REVISION_REWARDS_INVALID);
  }
  if (
    !['banner_en', 'banner_th', 'sub_banner_en', 'sub_banner_th'].every((key) =>
      hasMedia(
        quest,
        key as 'banner_en' | 'banner_th' | 'sub_banner_en' | 'sub_banner_th',
      ),
    )
  ) {
    blockers.push(QUEST_REVISION_MEDIA_REQUIRED);
  }
  if ((quest.blocked_decisions ?? []).length > 0) {
    blockers.push(QUEST_REVISION_DECISION_REQUIRED);
  }
  return blockers;
}

export function questRevisionWorkflowReadiness(
  quest: QuestRevisionReadinessRecord,
  options: {
    canCreateRevision: boolean;
    publishPreflight?: QuestRevisionPublishPreflight;
  },
): QuestRevisionWorkflowReadiness {
  const workflowEnabled = isQuestRevisionWorkflowEnabled();
  const taskV2Enabled = enabled('QUEST_TASK_V2_ENABLED');
  const publishReady = enabled('QUEST_REVISION_PUBLISH_READY');
  const isDraft = quest.publication_status === 'draft';
  const blockers: string[] = [];

  if (!workflowEnabled) blockers.push(QUEST_REVISION_WORKFLOW_DISABLED);
  if (!taskV2Enabled) blockers.push(QUEST_TASK_V2_UNAVAILABLE);
  if (!publishReady) blockers.push(QUEST_REVISION_PUBLISH_NOT_READY);
  if (isDraft) {
    if (!options.publishPreflight?.checked) {
      blockers.push(QUEST_REVISION_PREFLIGHT_REQUIRED);
    } else {
      blockers.push(...options.publishPreflight.blockers);
    }
  }
  if (!isDraft) blockers.push(QUEST_REVISION_NOT_DRAFT);
  blockers.push(...questRevisionContentBlockers(quest));

  const uniqueBlockers = [...new Set(blockers)];
  return {
    workflow_enabled: workflowEnabled,
    task_v2_enabled: taskV2Enabled,
    publish_ready: publishReady,
    can_create_revision:
      workflowEnabled && options.canCreateRevision && !isDraft,
    can_publish: uniqueBlockers.length === 0,
    blockers: uniqueBlockers,
  };
}
