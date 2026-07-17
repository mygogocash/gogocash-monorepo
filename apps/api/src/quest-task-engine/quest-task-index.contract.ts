export type RequiredQuestTaskIndex = {
  collection: string;
  name: string;
  key: Record<string, number>;
  unique: boolean;
  partialFilterExpression?: Record<string, unknown>;
};

export const QUEST_TASK_V2_CANONICAL_FENCE_ID = 'task-v2-source-config-v1';

/** Every identity constraint used to make task-v2 effects exactly once. */
export const QUEST_TASK_V2_REQUIRED_INDEXES: ReadonlyArray<RequiredQuestTaskIndex> =
  [
    {
      collection: 'conversions',
      name: 'uniq_conversion_provider_identity',
      key: { source: 1, provider_account: 1, provider_conversion_id: 1 },
      unique: true,
      partialFilterExpression: {
        provider_account: { $type: 'string' },
        provider_conversion_id: { $type: 'string' },
      },
    },
    {
      collection: 'conversions',
      name: 'conversion_id_1',
      key: { conversion_id: 1 },
      unique: false,
    },
    {
      collection: 'quest_account_transitions',
      name: 'uniq_quest_account_transition',
      key: { user_id: 1, version: 1 },
      unique: true,
    },
    {
      collection: 'quest_account_transitions',
      name: 'uniq_quest_account_transition_id',
      key: { transition_id: 1 },
      unique: true,
    },
    {
      collection: 'quest_account_transitions',
      name: 'idx_quest_account_transition_occurred_at',
      key: { occurred_at: 1 },
      unique: false,
    },
    {
      collection: 'quest_conversion_transitions',
      name: 'uniq_quest_conversion_transition',
      key: {
        source: 1,
        provider_account: 1,
        provider_conversion_id: 1,
        transition_version: 1,
      },
      unique: true,
    },
    {
      collection: 'quest_conversion_transitions',
      name: 'uniq_quest_conversion_transition_id',
      key: { transition_id: 1 },
      unique: true,
    },
    {
      collection: 'quest_conversion_transitions',
      name: 'idx_quest_conversion_transition_purchase_at',
      key: { 'current.datetime_conversion': 1, quarantined: 1 },
      unique: false,
    },
    {
      collection: 'quest_conversion_quarantine',
      name: 'uniq_quest_conversion_quarantine',
      key: { ambiguity_key: 1 },
      unique: true,
    },
    {
      collection: 'quest_outbox',
      name: 'uniq_quest_outbox_source_event',
      key: { source_type: 1, source_event_id: 1 },
      unique: true,
    },
    {
      collection: 'quest_outbox',
      name: 'quest_outbox_dispatch',
      key: { status: 1, available_at: 1, lease_expires_at: 1, createdAt: 1 },
      unique: false,
    },
    {
      collection: 'quest_event_ingestions',
      name: 'uniq_quest_event_ingestion',
      key: { source_type: 1, source_event_id: 1 },
      unique: true,
    },
    {
      collection: 'quest_task_progress',
      name: 'uniq_quest_task_progress',
      key: { quest_id: 1, task_key: 1, progress_scope_key: 1 },
      unique: true,
    },
    {
      collection: 'quest_task_progress',
      name: 'quest_progress_customer_read',
      key: { beneficiary_user_id: 1, quest_id: 1 },
      unique: false,
    },
    {
      collection: 'quest_task_contributions',
      name: 'uniq_quest_contribution_transition',
      key: {
        quest_id: 1,
        task_key: 1,
        progress_scope_key: 1,
        source_type: 1,
        source_aggregate_id: 1,
        source_transition_version: 1,
      },
      unique: true,
    },
    {
      collection: 'quest_task_conversion_state',
      name: 'uniq_quest_conversion_state',
      key: {
        quest_id: 1,
        task_key: 1,
        progress_scope_key: 1,
        conversion_identity: 1,
      },
      unique: true,
    },
    {
      collection: 'quest_source_config_fence',
      name: 'uniq_quest_source_config_fence',
      key: { fence_key: 1 },
      unique: true,
    },
    {
      collection: 'points',
      name: 'uniq_point_idempotency_key',
      key: { idempotency_key: 1 },
      unique: true,
      partialFilterExpression: {
        idempotency_key: { $type: 'string', $gt: '' },
      },
    },
  ];

export function questTaskIndexMatches(
  index: {
    name?: string;
    key?: Record<string, number>;
    unique?: boolean;
    sparse?: boolean;
    partialFilterExpression?: Record<string, unknown>;
  },
  required: RequiredQuestTaskIndex,
): boolean {
  const same = (left: unknown, right: unknown) =>
    JSON.stringify(left) === JSON.stringify(right);
  const partialMatches = required.partialFilterExpression
    ? same(index.partialFilterExpression, required.partialFilterExpression)
    : index.partialFilterExpression === undefined;
  return (
    index.name === required.name &&
    same(index.key ?? {}, required.key) &&
    (index.unique === true) === required.unique &&
    index.sparse !== true &&
    partialMatches
  );
}
