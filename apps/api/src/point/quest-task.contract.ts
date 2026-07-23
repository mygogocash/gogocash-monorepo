import { createHash, randomUUID } from 'node:crypto';
import type { ClientSession } from 'mongoose';

export const QUEST_TIMEZONE = 'Asia/Bangkok' as const;
export const QUEST_TASK_STATE_INSPECTOR = Symbol('QUEST_TASK_STATE_INSPECTOR');

export const QUEST_TASK_CONFIG_FROZEN = 'QUEST_TASK_CONFIG_FROZEN';
export const QUEST_CONFIG_REVISION_CONFLICT = 'QUEST_CONFIG_REVISION_CONFLICT';
export const QUEST_TASK_STATE_INSPECTOR_UNAVAILABLE =
  'QUEST_TASK_STATE_INSPECTOR_UNAVAILABLE';

export type QuestRewardModel = 'legacy_v1' | 'task_v2';
export type QuestTaskType =
  'brand_purchase' | 'friend_referral' | 'spend_target';
export type QuestAudience =
  { kind: 'all' } | { kind: 'membership_tiers'; tier_ids: string[] };

export type QuestRewardCaps = {
  max_awards_per_user: number | null;
  max_referrals_per_user: number | null;
};

export type QuestTaskStateInspection = {
  has_outbox: boolean;
  has_progress: boolean;
  has_award: boolean;
};

export type QuestTaskCandidateWindow = {
  start_at: Date;
  end_at: Date;
};

export type QuestEconomicCommitFence = <T>(
  commit: (
    state: QuestTaskStateInspection,
    session: ClientSession,
  ) => Promise<T>,
) => Promise<T>;

/**
 * Slice B owns the durable implementation. The callback must execute while an
 * event cannot cross the quest's task-config fence, so the callback's CAS and
 * event adoption have one winner.
 */
export interface QuestTaskStateInspector {
  withTaskConfigEditFence<T>(
    questId: string,
    operation: (
      state: QuestTaskStateInspection,
      session: ClientSession,
    ) => Promise<T>,
    candidateWindow?: QuestTaskCandidateWindow,
  ): Promise<T>;
}

export type CanonicalQuestTaskBase = {
  task_key: string;
  task_type: QuestTaskType;
  points: number;
  sort_order: number;
  enabled: boolean;
  wording: string;
  wording_en: string;
  wording_th: string;
  notes: string;
};

export type CanonicalBrandPurchaseTask = CanonicalQuestTaskBase & {
  task_type: 'brand_purchase';
  offer: unknown;
  offer_id: number;
  merchant_id: number;
  extra_point: number;
};

export type CanonicalFriendReferralTask = CanonicalQuestTaskBase & {
  task_type: 'friend_referral';
  completion_rule: 'account_created' | 'first_earning_conversion';
};

export type CanonicalSpendTargetTask = CanonicalQuestTaskBase & {
  task_type: 'spend_target';
  spend_scope: 'any_shop_via_ggc';
  target_thb_minor: number;
};

export type CanonicalQuestTask =
  | CanonicalBrandPurchaseTask
  | CanonicalFriendReferralTask
  | CanonicalSpendTargetTask;

export type QuestTaskProgressState =
  'not_started' | 'in_progress' | 'completed' | 'compensated';

export type QuestTaskProgressResponse = {
  quest_id: string;
  reward_model: QuestRewardModel;
  config_revision: number;
  window: {
    start_at: string;
    end_at: string;
    timezone: typeof QUEST_TIMEZONE;
  };
  tasks: Array<{
    task_key: string;
    task_type: QuestTaskType;
    points: number;
    wording_en: string;
    wording_th: string;
    offer?: {
      id: string;
      name: string;
      logo_url?: string;
      shop_path?: string;
    };
    progress: {
      state: QuestTaskProgressState;
      cap_reached: boolean;
      cap_reason: 'max_awards_per_user' | 'max_referrals_per_user' | null;
      current: number;
      target: number | null;
      unit: 'purchase' | 'referral' | 'thb_minor';
      completion_count: number;
      completed_at: string | null;
      award_epoch: number;
      active_awarded_points: number;
    };
  }>;
};

export function effectiveQuestRewardModel(value: unknown): QuestRewardModel {
  if (value === undefined || value === null || value === '') return 'legacy_v1';
  if (value === 'legacy_v1' || value === 'task_v2') return value;
  throw new Error(`Unknown quest reward_model: ${String(value)}`);
}

function offerIdentity(value: unknown): string {
  if (value && typeof value === 'object') {
    const populated = value as { _id?: unknown };
    if (populated._id !== undefined) return String(populated._id);
  }
  return String(value ?? '');
}

export function stableLegacyTaskKey(questId: string, offer: unknown): string {
  const digest = createHash('sha256')
    .update(`quest:${questId}:brand_purchase:offer:${offerIdentity(offer)}`)
    .digest('base64url')
    .slice(0, 32);
  return `task_${digest}`;
}

export function newQuestTaskKey(): string {
  return `task_${randomUUID().replaceAll('-', '')}`;
}

export function revisedQuestTaskKey(
  questId: string,
  previousTaskKey: string,
  nextConfigRevision: number,
): string {
  const digest = createHash('sha256')
    .update(
      `quest:${questId}:task:${previousTaskKey}:config-revision:${nextConfigRevision}`,
    )
    .digest('base64url')
    .slice(0, 32);
  return `task_${digest}`;
}

export function canonicalizeStoredQuestTask<T extends Record<string, unknown>>(
  questId: string,
  task: T,
  rewardModel: unknown,
): T & { task_type: QuestTaskType; task_key: string; points: number } {
  const model = effectiveQuestRewardModel(rewardModel);
  const taskType = task.task_type;
  if (
    taskType !== undefined &&
    taskType !== 'brand_purchase' &&
    taskType !== 'friend_referral' &&
    taskType !== 'spend_target'
  ) {
    throw new Error(`Unknown quest task_type: ${String(taskType)}`);
  }
  if (model === 'task_v2' && taskType === undefined) {
    throw new Error('task_v2 quests require an explicit task_type');
  }

  const effectiveType = (taskType ?? 'brand_purchase') as QuestTaskType;
  const submittedTaskKey =
    typeof task.task_key === 'string' ? task.task_key.trim() : task.task_key;
  const taskKey = String(
    submittedTaskKey ||
      (effectiveType === 'brand_purchase'
        ? stableLegacyTaskKey(questId, task.offer)
        : ''),
  );
  if (!taskKey) {
    throw new Error('Typed quest tasks require a task_key');
  }

  return {
    ...task,
    task_type: effectiveType,
    task_key: taskKey,
    points: Number(task.points ?? task.extra_point),
  };
}

type QuestEconomicConfig = {
  reward_model?: unknown;
  timezone?: unknown;
  start_date?: unknown;
  end_date?: unknown;
  audience?: unknown;
  reward_caps?: unknown;
  tasks?: Array<Record<string, unknown>>;
};

function dateIdentity(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

function taskEconomicProjection(task: Record<string, unknown>) {
  const taskType = (task.task_type ?? 'brand_purchase') as QuestTaskType;
  const base = {
    task_key: String(task.task_key ?? ''),
    task_type: taskType,
    points: Number(task.points ?? task.extra_point),
    sort_order: Number(task.sort_order ?? 0),
    enabled: task.enabled !== false,
  };

  if (taskType === 'brand_purchase') {
    return {
      ...base,
      offer: offerIdentity(task.offer),
      offer_id: Number(task.offer_id),
      merchant_id: Number(task.merchant_id),
    };
  }
  if (taskType === 'friend_referral') {
    return { ...base, completion_rule: String(task.completion_rule ?? '') };
  }
  return {
    ...base,
    spend_scope: String(task.spend_scope ?? ''),
    target_thb_minor: Number(task.target_thb_minor),
  };
}

function taskIdentityProjection(task: Record<string, unknown>) {
  const economic = taskEconomicProjection(task);
  const { task_key: _taskKey, sort_order: _sortOrder, ...identity } = economic;
  return identity;
}

function taskConfigProjection(task: Record<string, unknown>) {
  return {
    ...taskEconomicProjection(task),
    wording: String(task.wording ?? task.wording_en ?? '').trim(),
    wording_en: String(task.wording_en ?? task.wording ?? '').trim(),
    wording_th: String(task.wording_th ?? '').trim(),
    notes: String(task.notes ?? '').trim(),
  };
}

export function hasQuestTaskIdentityChange(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): boolean {
  return (
    JSON.stringify(taskIdentityProjection(before)) !==
    JSON.stringify(taskIdentityProjection(after))
  );
}

function economicProjection(config: QuestEconomicConfig) {
  const audience = config.audience as
    { kind?: unknown; tier_ids?: unknown[] } | undefined;
  const caps = config.reward_caps as
    | {
        max_awards_per_user?: unknown;
        max_referrals_per_user?: unknown;
      }
    | undefined;
  return {
    reward_model: effectiveQuestRewardModel(config.reward_model),
    timezone: String(config.timezone ?? QUEST_TIMEZONE),
    start_date: dateIdentity(config.start_date),
    end_date: dateIdentity(config.end_date),
    audience:
      audience?.kind === 'membership_tiers'
        ? {
            kind: 'membership_tiers',
            tier_ids: [...(audience.tier_ids ?? [])].map(String).sort(),
          }
        : { kind: 'all' },
    reward_caps: {
      max_awards_per_user: caps?.max_awards_per_user ?? null,
      max_referrals_per_user: caps?.max_referrals_per_user ?? null,
    },
    tasks: (config.tasks ?? []).map(taskEconomicProjection),
  };
}

export function hasQuestTaskEconomicChange(
  before: QuestEconomicConfig,
  after: QuestEconomicConfig,
): boolean {
  return (
    JSON.stringify(economicProjection(before)) !==
    JSON.stringify(economicProjection(after))
  );
}

export function hasQuestTaskConfigChange(
  before: QuestEconomicConfig,
  after: QuestEconomicConfig,
): boolean {
  return (
    JSON.stringify({
      ...economicProjection(before),
      tasks: (before.tasks ?? []).map(taskConfigProjection),
    }) !==
    JSON.stringify({
      ...economicProjection(after),
      tasks: (after.tasks ?? []).map(taskConfigProjection),
    })
  );
}
