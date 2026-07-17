import { createHash } from 'node:crypto';
import {
  isLegacyRewardModel,
  legacyPurchasePointKey,
  legacyRankPayoutKey,
  legacySocialPayoutKey,
  legacySpecialPointKey,
} from './legacy-reward-identity';
import {
  assertLegacyRewardManifest,
  legacyQuestPayoutConfigChecksum,
  legacySocialRewardAllowlist,
  legacyRewardManifestKey,
  LegacyRewardManifest,
} from './legacy-reward-manifest';
import { legacyManifestResolutionCommandKey } from './legacy-reward-manifest-resolution';

type RewardModel = 'legacy_v1' | 'task_v2' | string | null | undefined;

export interface LegacyQuestEvidence {
  _id: string;
  start_date: Date;
  end_date: Date;
  reward_model?: RewardModel;
  reward_status?: boolean;
  timezone?: string;
  audience?: { kind?: string; tier_ids?: string[] };
  reward_caps?: {
    max_awards_per_user?: number | null;
    max_referrals_per_user?: number | null;
  };
  tasks?: unknown[];
  rewards?: Array<{ rank: number; reward: number; currency?: string }>;
  facebook_page?: string;
  facebook_post?: string;
  line?: string;
  legacy_payout_reconciliation_status?: 'pending' | 'ready' | 'quarantined';
  legacy_payout_reconciliation_version?: number;
  legacy_payout_reconciled_at?: Date;
  legacy_payout_config_checksum?: string;
  legacy_payout_resolution_command_key?: string;
  legacy_payout_resolution_plan_checksum?: string;
  legacy_payout_resolution_started_at?: Date;
  legacy_special_point_completed_at?: Date;
  legacy_rank_payout_completed_at?: Date;
  [key: string]: unknown;
}

export interface LegacyPointEvidence {
  _id: string;
  user_id: string;
  conversion_id?: string | number | null;
  point: number;
  type: string;
  action: string;
  createdAt?: Date;
  updatedAt?: Date;
  idempotency_key?: string;
  [key: string]: unknown;
}

export interface LegacyConversionEvidence {
  _id: string;
  conversion_id: string | number;
  source?: string;
  provider_account?: string;
  provider_conversion_id?: string;
  user_id?: string;
  aff_sub1?: string;
  offer_name: string;
  adv_sub3?: string;
  adv_sub5?: string;
  currency: string;
  sale_amount: number;
  payout: number;
  datetime_conversion: Date;
  quest_payout_key?: string;
  conversion_status?: string;
  add_point?: boolean;
  quest_synthetic_reward?: boolean;
  legacy_point_reconciliation_status?:
    'pending' | 'ready' | 'completed' | 'quarantined';
  legacy_point_reconciliation_version?: number;
  legacy_point_payout_key?: string;
  legacy_point_amount?: number;
  legacy_point_reconciled_at?: Date;
  legacy_point_completed_at?: Date;
  [key: string]: unknown;
}

export interface LegacySocialRewardEvidence {
  _id: string;
  quest_id: string;
  user_id: string;
  type: string;
  action: string;
  reward_status: boolean;
  legacy_payout_key?: string;
  [key: string]: unknown;
}

export interface LegacyRewardListEvidence {
  _id: string;
  name: string;
  data: Array<{ rank: number; reward: number; currency?: string }>;
}

export interface LegacyRewardResolutionCommandEvidence {
  _id?: string;
  command_key: string;
  quest_id: string;
  reconciliation_version: number;
  status: 'preparing' | 'complete';
  plan_checksum: string;
  quest_config_checksum: string;
  expected_manifest_hashes: string[];
}

export interface LegacyRewardReconciliationSnapshot {
  quests: LegacyQuestEvidence[];
  points: LegacyPointEvidence[];
  conversions: LegacyConversionEvidence[];
  socialRewards: LegacySocialRewardEvidence[];
  rewardLists: LegacyRewardListEvidence[];
  manifests: LegacyRewardManifest[];
  resolutionCommands?: LegacyRewardResolutionCommandEvidence[];
}

export type LegacyRewardCollection =
  'quests' | 'points' | 'conversions' | 'socialrewards';

export interface LegacyRewardBackfillOperation {
  collection: LegacyRewardCollection;
  id: string;
  expected: Record<string, unknown>;
  set: Record<string, unknown>;
  identity: string;
}

export type LegacyRewardQuarantineReason =
  | 'unknown_reward_model'
  | 'overlapping_quest_windows'
  | 'manual_reward_without_quest_id'
  | 'unknown_quest'
  | 'task_v2_legacy_effect'
  | 'mutable_reward_fallback'
  | 'amount_currency_rank_mismatch'
  | 'duplicate_round'
  | 'partial_round'
  | 'absence_does_not_prove_unpaid'
  | 'social_referral_ambiguity'
  | 'missing_quest_lineage'
  | 'purchase_lineage_mismatch'
  | 'purchase_identity_conflict'
  | 'duplicate_purchase_effect'
  | 'purchase_missing_effect'
  | 'unsupported_purchase_currency'
  | 'rank_manifest_coverage_mismatch'
  | 'rank_user_identity_conflict'
  | 'quest_config_checksum_mismatch'
  | 'incomplete_manifest_resolution'
  | 'missing_recipient_manifest'
  | 'invalid_recipient_manifest';

export interface LegacyRewardQuarantineEntry {
  reason: LegacyRewardQuarantineReason;
  quest_id?: string;
  collection?: LegacyRewardCollection | 'rewardlists' | 'legacyrewardmanifests';
  record_ids: string[];
  detail: string;
}

export interface LegacyRewardReconciliationCounts {
  quests_scanned: number;
  legacy_quests: number;
  task_v2_quests_excluded: number;
  unknown_model_quests: number;
  points_scanned: number;
  conversions_scanned: number;
  social_rewards_scanned: number;
  reward_lists_scanned: number;
  manifests_scanned: number;
  resolution_commands_scanned: number;
  point_keys_planned: number;
  conversion_keys_planned: number;
  social_keys_planned: number;
  quests_ready_planned: number;
  quests_quarantined_planned: number;
  quarantine_items: number;
}

export interface LegacyRewardReconciliationPlan {
  counts: LegacyRewardReconciliationCounts;
  operations: LegacyRewardBackfillOperation[];
  quarantine: LegacyRewardQuarantineEntry[];
  evidence_checksum: string;
  rollback_checksum: string;
  backup: Array<{
    collection: LegacyRewardCollection;
    id: string;
    preimage: Record<string, unknown>;
  }>;
  rollback: LegacyRewardBackfillOperation[];
}

export interface LegacyRewardRollbackArtifact {
  evidence_checksum: string;
  rollback_checksum: string;
  rollback: LegacyRewardBackfillOperation[];
}

export interface LegacyRewardReconciliationStore {
  readSnapshot(): Promise<LegacyRewardReconciliationSnapshot>;
  compareAndSet(operation: LegacyRewardBackfillOperation): Promise<boolean>;
  ensureIndexes?(): Promise<string[]>;
}

export interface LegacyRewardReconciliationReport extends LegacyRewardReconciliationPlan {
  mode: 'dry-run' | 'apply';
  run_id: string;
  applied: { updated: number; cas_conflicts: number };
  indexes_verified: string[];
}

export interface LegacyRewardRollbackReport {
  mode: 'rollback';
  run_id: string;
  evidence_checksum: string;
  rollback_checksum: string;
  operations: LegacyRewardBackfillOperation[];
  applied: { updated: number; already_restored: number; cas_conflicts: number };
}

const RECONCILIATION_VERSION = 1;

function stringId(value: unknown): string {
  return String(value ?? '').trim();
}

function affSub1UserId(conversion: LegacyConversionEvidence): string {
  const match = /^user_id:(.+)$/.exec(conversion.aff_sub1 ?? '');
  return match?.[1]?.trim() ?? '';
}

function conversionUserId(conversion: LegacyConversionEvidence): string {
  return stringId(conversion.user_id) || affSub1UserId(conversion);
}

function conversionUserIdentityConflicts(
  conversion: LegacyConversionEvidence,
): boolean {
  const direct = stringId(conversion.user_id);
  const affiliate = affSub1UserId(conversion);
  return Boolean(direct && affiliate && direct !== affiliate);
}

function stableValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, nested]) => [key, stableValue(nested)]),
    );
  }
  return value;
}

function checksum(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(stableValue(value)))
    .digest('hex');
}

function sameTimeRange(
  a: LegacyQuestEvidence,
  b: LegacyQuestEvidence,
): boolean {
  const aStart = new Date(a.start_date).getTime();
  const aEnd = new Date(a.end_date).getTime();
  const bStart = new Date(b.start_date).getTime();
  const bEnd = new Date(b.end_date).getTime();
  return aStart <= bEnd && bStart <= aEnd;
}

function operationKey(operation: LegacyRewardBackfillOperation): string {
  return `${operation.collection}:${operation.id}:${Object.keys(operation.set).sort().join(',')}`;
}

function snapshotRow(
  snapshot: LegacyRewardReconciliationSnapshot,
  collection: LegacyRewardCollection,
  id: string,
): Record<string, unknown> | undefined {
  const rows =
    collection === 'points'
      ? snapshot.points
      : collection === 'conversions'
        ? snapshot.conversions
        : collection === 'socialrewards'
          ? snapshot.socialRewards
          : snapshot.quests;
  return rows.find((row) => stringId(row._id) === id) as
    Record<string, unknown> | undefined;
}

function sameStableValue(left: unknown, right: unknown) {
  return (
    JSON.stringify(stableValue(left)) === JSON.stringify(stableValue(right))
  );
}

const ROLLBACK_DATE_FIELDS = new Set([
  'legacy_point_reconciled_at',
  'legacy_point_completed_at',
  'legacy_payout_reconciled_at',
  'legacy_payout_resolution_started_at',
  'legacy_rank_payout_completed_at',
  'legacy_special_point_completed_at',
]);

function executableRollbackValue(field: string, value: unknown) {
  if (
    ROLLBACK_DATE_FIELDS.has(field) &&
    typeof value === 'string' &&
    Number.isFinite(new Date(value).getTime())
  ) {
    return new Date(value);
  }
  return value;
}

function executableRollbackOperation(
  operation: LegacyRewardBackfillOperation,
): LegacyRewardBackfillOperation {
  return {
    ...operation,
    expected: Object.fromEntries(
      Object.entries(operation.expected).map(([field, value]) => [
        field,
        executableRollbackValue(field, value),
      ]),
    ),
    set: Object.fromEntries(
      Object.entries(operation.set).map(([field, value]) => [
        field,
        executableRollbackValue(field, value),
      ]),
    ),
  };
}

export function buildLegacyRewardReconciliationPlan(
  snapshot: LegacyRewardReconciliationSnapshot,
  now = new Date(),
): LegacyRewardReconciliationPlan {
  const operations: LegacyRewardBackfillOperation[] = [];
  const quarantine: LegacyRewardQuarantineEntry[] = [];
  const operationKeys = new Set<string>();
  const quarantinedQuestIds = new Set<string>();

  const addOperation = (operation: LegacyRewardBackfillOperation) => {
    const key = operationKey(operation);
    if (operationKeys.has(key)) return;
    operationKeys.add(key);
    operations.push(operation);
  };
  const addQuarantine = (entry: LegacyRewardQuarantineEntry) => {
    quarantine.push({ ...entry, record_ids: [...entry.record_ids].sort() });
    if (entry.quest_id) quarantinedQuestIds.add(entry.quest_id);
  };

  const questsById = new Map(
    snapshot.quests.map((quest) => [stringId(quest._id), quest]),
  );
  const legacyQuests = snapshot.quests.filter((quest) =>
    isLegacyRewardModel(quest.reward_model),
  );
  const taskV2Quests = snapshot.quests.filter(
    (quest) => quest.reward_model === 'task_v2',
  );
  const unknownModelQuests = snapshot.quests.filter(
    (quest) =>
      !isLegacyRewardModel(quest.reward_model) &&
      quest.reward_model !== 'task_v2',
  );

  for (const quest of unknownModelQuests) {
    addQuarantine({
      reason: 'unknown_reward_model',
      quest_id: stringId(quest._id),
      collection: 'quests',
      record_ids: [stringId(quest._id)],
      detail: `Unknown reward_model ${String(quest.reward_model)}`,
    });
  }

  for (let left = 0; left < legacyQuests.length; left += 1) {
    for (let right = left + 1; right < legacyQuests.length; right += 1) {
      if (!sameTimeRange(legacyQuests[left], legacyQuests[right])) continue;
      const ids = [
        stringId(legacyQuests[left]._id),
        stringId(legacyQuests[right]._id),
      ].sort();
      for (const questId of ids) quarantinedQuestIds.add(questId);
      quarantine.push({
        reason: 'overlapping_quest_windows',
        collection: 'quests',
        record_ids: ids,
        detail:
          'Overlapping legacy windows make referral and unlineaged reward attribution ambiguous',
      });
    }
  }

  const validManifests = new Map<string, LegacyRewardManifest>();
  const manifestGroups = new Map<string, LegacyRewardManifest[]>();
  for (const manifest of snapshot.manifests) {
    const group = manifestGroups.get(manifest.manifest_key) ?? [];
    group.push(manifest);
    manifestGroups.set(manifest.manifest_key, group);
  }
  for (const [manifestKey, manifests] of manifestGroups) {
    const questId = stringId(manifests[0]?.quest_id);
    const quest = questsById.get(questId);
    const recordIds = manifests.map((manifest) =>
      stringId(manifest._id ?? manifest.manifest_key),
    );
    if (manifests.length !== 1 || !quest) {
      addQuarantine({
        reason: 'invalid_recipient_manifest',
        quest_id: questId || undefined,
        collection: 'legacyrewardmanifests',
        record_ids: recordIds,
        detail:
          manifests.length !== 1
            ? `Duplicate immutable recipient manifest ${manifestKey}`
            : 'Recipient manifest references a missing quest',
      });
      continue;
    }
    if (quest.reward_model === 'task_v2') {
      addQuarantine({
        reason: 'task_v2_legacy_effect',
        quest_id: questId,
        collection: 'legacyrewardmanifests',
        record_ids: recordIds,
        detail: 'A task_v2 quest must not have a legacy payout manifest',
      });
      continue;
    }
    try {
      assertLegacyRewardManifest(
        manifests[0],
        questId,
        manifests[0].reward_type,
        RECONCILIATION_VERSION,
        quest.legacy_payout_config_checksum,
      );
      validManifests.set(manifestKey, manifests[0]);
    } catch (error) {
      addQuarantine({
        reason: 'invalid_recipient_manifest',
        quest_id: questId,
        collection: 'legacyrewardmanifests',
        record_ids: recordIds,
        detail:
          error instanceof Error ? error.message : 'Invalid recipient manifest',
      });
    }
  }
  for (const quest of legacyQuests) {
    const questId = stringId(quest._id);
    let liveConfigChecksum = '';
    try {
      liveConfigChecksum = legacyQuestPayoutConfigChecksum(quest);
    } catch (error) {
      addQuarantine({
        reason: 'quest_config_checksum_mismatch',
        quest_id: questId,
        collection: 'quests',
        record_ids: [questId],
        detail:
          error instanceof Error
            ? error.message
            : 'Invalid quest configuration',
      });
    }
    if (
      !liveConfigChecksum ||
      quest.legacy_payout_config_checksum !== liveConfigChecksum
    ) {
      addQuarantine({
        reason: 'quest_config_checksum_mismatch',
        quest_id: questId,
        collection: 'quests',
        record_ids: [questId],
        detail:
          'Persisted legacy payout checksum does not match the current quest configuration',
      });
    }
    for (const rewardType of ['rank', 'special-next-round'] as const) {
      const manifestKey = legacyRewardManifestKey(questId, rewardType);
      if (validManifests.has(manifestKey)) continue;
      addQuarantine({
        reason: 'missing_recipient_manifest',
        quest_id: questId,
        collection: 'legacyrewardmanifests',
        record_ids: [manifestKey],
        detail: `Reconciliation has not frozen the ${rewardType} expected/excluded recipients`,
      });
    }
    const resolutionCommands = (snapshot.resolutionCommands ?? []).filter(
      (command) => stringId(command.quest_id) === questId,
    );
    const expectedManifestHashes = (['rank', 'special-next-round'] as const)
      .map((rewardType) =>
        validManifests.get(legacyRewardManifestKey(questId, rewardType)),
      )
      .filter((manifest): manifest is LegacyRewardManifest => Boolean(manifest))
      .map((manifest) => manifest.manifest_hash)
      .sort();
    const command = resolutionCommands[0];
    if (
      resolutionCommands.length !== 1 ||
      command?.command_key !== legacyManifestResolutionCommandKey(questId) ||
      command.status !== 'complete' ||
      command.reconciliation_version !== RECONCILIATION_VERSION ||
      command.plan_checksum !== quest.legacy_payout_resolution_plan_checksum ||
      command.quest_config_checksum !== liveConfigChecksum ||
      JSON.stringify([...(command.expected_manifest_hashes ?? [])].sort()) !==
        JSON.stringify(expectedManifestHashes) ||
      expectedManifestHashes.length !== 2
    ) {
      addQuarantine({
        reason: 'incomplete_manifest_resolution',
        quest_id: questId,
        collection: 'legacyrewardmanifests',
        record_ids:
          resolutionCommands.length > 0
            ? resolutionCommands.map((item) =>
                stringId(item._id ?? item.command_key),
              )
            : [legacyManifestResolutionCommandKey(questId)],
        detail:
          'The standalone-safe resolution command is missing, incomplete, or does not match both immutable manifests',
      });
    }
  }

  const purchasePoints = snapshot.points.filter(
    (candidate) => candidate.type === 'add' && candidate.action === 'purchase',
  );
  const purchaseConversions = snapshot.conversions.filter(
    (conversion) =>
      conversion.offer_name !== 'reward_conversion_quest' &&
      conversion.quest_synthetic_reward !== true &&
      conversion.conversion_id !== undefined &&
      (conversion.conversion_status === undefined ||
        conversion.conversion_status === 'approved' ||
        conversion.add_point === true ||
        purchasePoints.some(
          (point) =>
            String(point.conversion_id) === String(conversion.conversion_id),
        )),
  );
  const purchaseConversionGroups = new Map<
    string,
    LegacyConversionEvidence[]
  >();
  for (const conversion of purchaseConversions) {
    const payoutKey = legacyPurchasePointKey(
      conversion as unknown as Record<string, unknown>,
    );
    const group = purchaseConversionGroups.get(payoutKey) ?? [];
    group.push(conversion);
    purchaseConversionGroups.set(payoutKey, group);
  }
  const purchaseLineagePayoutKeys = new Map<string, Set<string>>();
  for (const [payoutKey, conversions] of purchaseConversionGroups) {
    for (const conversion of conversions) {
      const userId = conversionUserId(conversion);
      if (!userId || conversionUserIdentityConflicts(conversion)) continue;
      const lineage = `${String(conversion.conversion_id)}\u0000${userId}`;
      const keys = purchaseLineagePayoutKeys.get(lineage) ?? new Set<string>();
      keys.add(payoutKey);
      purchaseLineagePayoutKeys.set(lineage, keys);
    }
  }
  const purchasePointCandidateKeys = new Map<string, Set<string>>();
  for (const point of purchasePoints) {
    const lineage = `${String(point.conversion_id)}\u0000${stringId(point.user_id)}`;
    purchasePointCandidateKeys.set(
      stringId(point._id),
      purchaseLineagePayoutKeys.get(lineage) ?? new Set<string>(),
    );
  }
  const matchedPurchasePointIds = new Set<string>();
  const addPurchaseState = (
    conversion: LegacyConversionEvidence,
    desired: Record<string, unknown>,
    payoutKey: string,
  ) => {
    const expected: Record<string, unknown> = {};
    const set: Record<string, unknown> = {};
    for (const [field, value] of Object.entries(desired)) {
      const current = conversion[field];
      if (
        current === value ||
        (current instanceof Date &&
          value instanceof Date &&
          current.getTime() === value.getTime())
      ) {
        continue;
      }
      expected[field] = current;
      set[field] = value;
    }
    if (Object.keys(set).length === 0) return;
    addOperation({
      collection: 'conversions',
      id: stringId(conversion._id),
      expected,
      set,
      identity: `purchase-state:${payoutKey}`,
    });
  };

  for (const [payoutKey, conversions] of purchaseConversionGroups) {
    if (conversions.length !== 1) {
      addQuarantine({
        reason: 'purchase_identity_conflict',
        collection: 'conversions',
        record_ids: conversions.map((conversion) => stringId(conversion._id)),
        detail: `Multiple conversions claim canonical purchase identity ${payoutKey}`,
      });
      for (const conversion of conversions) {
        addPurchaseState(
          conversion,
          {
            legacy_point_reconciliation_status: 'quarantined',
            legacy_point_reconciliation_version: RECONCILIATION_VERSION,
            legacy_point_payout_key: payoutKey,
            ...(conversion.legacy_point_reconciled_at
              ? {}
              : { legacy_point_reconciled_at: now }),
          },
          payoutKey,
        );
      }
      continue;
    }
    const conversion = conversions[0];
    const userId = conversionUserId(conversion);
    const effects = purchasePoints.filter(
      (point) =>
        String(point.conversion_id) === String(conversion.conversion_id) &&
        stringId(point.user_id) === userId,
    );
    for (const point of effects) {
      matchedPurchasePointIds.add(stringId(point._id));
    }
    const quarantinePurchase = (
      reason: LegacyRewardQuarantineReason,
      recordIds: string[],
      detail: string,
    ) => {
      addQuarantine({
        reason,
        collection: effects.length ? 'points' : 'conversions',
        record_ids: recordIds,
        detail,
      });
      addPurchaseState(
        conversion,
        {
          legacy_point_reconciliation_status: 'quarantined',
          legacy_point_reconciliation_version: RECONCILIATION_VERSION,
          legacy_point_payout_key: payoutKey,
          ...(conversion.legacy_point_reconciled_at
            ? {}
            : { legacy_point_reconciled_at: now }),
        },
        payoutKey,
      );
    };
    if (!userId || conversionUserIdentityConflicts(conversion)) {
      quarantinePurchase(
        'purchase_lineage_mismatch',
        [stringId(conversion._id)],
        'Purchase conversion has missing or conflicting user lineage',
      );
      continue;
    }
    const ambiguousEffects = effects.filter(
      (point) =>
        (purchasePointCandidateKeys.get(stringId(point._id))?.size ?? 0) > 1,
    );
    if (ambiguousEffects.length > 0) {
      addQuarantine({
        reason: 'purchase_identity_conflict',
        collection: 'points',
        record_ids: ambiguousEffects.map((point) => stringId(point._id)),
        detail:
          'A legacy purchase Point matches multiple canonical provider conversion identities',
      });
      addQuarantine({
        reason: 'purchase_identity_conflict',
        collection: 'conversions',
        record_ids: [stringId(conversion._id)],
        detail: `Conversion ${payoutKey} cannot exclusively claim its legacy Point effect`,
      });
      addPurchaseState(
        conversion,
        {
          legacy_point_reconciliation_status: 'quarantined',
          legacy_point_reconciliation_version: RECONCILIATION_VERSION,
          legacy_point_payout_key: payoutKey,
          ...(conversion.legacy_point_reconciled_at
            ? {}
            : { legacy_point_reconciled_at: now }),
        },
        payoutKey,
      );
      continue;
    }
    if (
      conversion.legacy_point_payout_key &&
      conversion.legacy_point_payout_key !== payoutKey
    ) {
      quarantinePurchase(
        'purchase_identity_conflict',
        [stringId(conversion._id)],
        'Persisted purchase reconciliation key is not canonical',
      );
      continue;
    }
    if (effects.length > 1) {
      quarantinePurchase(
        'duplicate_purchase_effect',
        effects.map((point) => stringId(point._id)),
        'Multiple Point ledger effects exist for one canonical purchase conversion',
      );
      continue;
    }
    const point = effects[0];
    if (point?.idempotency_key && point.idempotency_key !== payoutKey) {
      quarantinePurchase(
        'purchase_identity_conflict',
        [stringId(point._id)],
        'Existing purchase Point key does not match its canonical conversion identity',
      );
      continue;
    }
    if (
      point &&
      String(conversion.currency || 'THB').toUpperCase() === 'THB' &&
      Math.floor(Number(conversion.sale_amount)) !== Number(point.point)
    ) {
      quarantinePurchase(
        'amount_currency_rank_mismatch',
        [stringId(point._id)],
        'Purchase Point amount does not match the immutable THB sale amount',
      );
      continue;
    }
    if (!point && conversion.add_point === true) {
      quarantinePurchase(
        'purchase_missing_effect',
        [stringId(conversion._id)],
        'Conversion is marked awarded but no Point ledger effect exists',
      );
      continue;
    }
    const purchaseCurrency = String(conversion.currency || 'THB').toUpperCase();
    if (!point && !['THB', 'USD'].includes(purchaseCurrency)) {
      quarantinePurchase(
        'unsupported_purchase_currency',
        [stringId(conversion._id)],
        `Purchase currency ${purchaseCurrency} has no persisted immutable payout quote`,
      );
      continue;
    }
    if (
      !point &&
      (!Number.isFinite(Number(conversion.sale_amount)) ||
        Number(conversion.sale_amount) < 0)
    ) {
      quarantinePurchase(
        'amount_currency_rank_mismatch',
        [stringId(conversion._id)],
        'Purchase sale amount is invalid for a future Point payout',
      );
      continue;
    }
    if (point && !point.idempotency_key) {
      addOperation({
        collection: 'points',
        id: stringId(point._id),
        expected: { idempotency_key: point.idempotency_key },
        set: { idempotency_key: payoutKey },
        identity: payoutKey,
      });
    }
    addPurchaseState(
      conversion,
      {
        legacy_point_reconciliation_status: point ? 'completed' : 'ready',
        legacy_point_reconciliation_version: RECONCILIATION_VERSION,
        legacy_point_payout_key: payoutKey,
        ...(point
          ? {
              legacy_point_amount: Number(point.point),
              add_point: true,
              ...(conversion.legacy_point_completed_at
                ? {}
                : { legacy_point_completed_at: now }),
            }
          : purchaseCurrency === 'THB'
            ? {
                legacy_point_amount: Math.floor(Number(conversion.sale_amount)),
              }
            : {}),
        ...(conversion.legacy_point_reconciled_at
          ? {}
          : { legacy_point_reconciled_at: now }),
      },
      payoutKey,
    );
  }
  for (const point of purchasePoints) {
    if (matchedPurchasePointIds.has(stringId(point._id))) continue;
    addQuarantine({
      reason: 'purchase_lineage_mismatch',
      collection: 'points',
      record_ids: [stringId(point._id)],
      detail: 'Purchase Point has no single canonical conversion lineage',
    });
  }

  const socialIdentityGroups = new Map<string, LegacySocialRewardEvidence[]>();
  for (const social of snapshot.socialRewards) {
    const key = [
      stringId(social.quest_id),
      stringId(social.user_id),
      social.type,
      social.action,
    ].join(':');
    const group = socialIdentityGroups.get(key) ?? [];
    group.push(social);
    socialIdentityGroups.set(key, group);
  }
  for (const [identity, socials] of socialIdentityGroups) {
    if (socials.length !== 1) {
      const questId = stringId(socials[0]?.quest_id);
      addQuarantine({
        reason: 'social_referral_ambiguity',
        quest_id: questId || undefined,
        collection: 'socialrewards',
        record_ids: socials.map((social) => stringId(social._id)),
        detail: `Duplicate social reward identity ${identity}`,
      });
      continue;
    }
    const social = socials[0];
    const questId = stringId(social.quest_id);
    const quest = questsById.get(questId);
    if (!quest) {
      addQuarantine({
        reason: 'unknown_quest',
        quest_id: questId,
        collection: 'socialrewards',
        record_ids: [stringId(social._id)],
        detail: 'SocialReward references a missing quest',
      });
      continue;
    }
    if (quest.reward_model === 'task_v2') {
      addQuarantine({
        reason: 'task_v2_legacy_effect',
        quest_id: questId,
        collection: 'socialrewards',
        record_ids: [stringId(social._id)],
        detail: 'A task_v2 quest must not contain a legacy social reward',
      });
      continue;
    }
    if (!isLegacyRewardModel(quest.reward_model)) continue;
    if (
      !legacySocialRewardAllowlist(quest).some(
        (pair) => pair.type === social.type && pair.action === social.action,
      )
    ) {
      addQuarantine({
        reason: 'social_referral_ambiguity',
        quest_id: questId,
        collection: 'socialrewards',
        record_ids: [stringId(social._id)],
        detail: 'SocialReward identity is not in immutable quest configuration',
      });
      continue;
    }
    const payoutKey = legacySocialPayoutKey(
      questId,
      social.user_id,
      social.type,
      social.action,
    );
    if (social.legacy_payout_key && social.legacy_payout_key !== payoutKey) {
      addQuarantine({
        reason: 'social_referral_ambiguity',
        quest_id: questId,
        collection: 'socialrewards',
        record_ids: [stringId(social._id)],
        detail: 'Existing SocialReward key is not its canonical identity',
      });
      continue;
    }
    const matchingPoints = snapshot.points.filter(
      (point) =>
        stringId(point.user_id) === stringId(social.user_id) &&
        point.action ===
          `reward_quest_social:${social.type}:${social.action}:${stringId(social._id)}`,
    );
    if (matchingPoints.length > 1) {
      addQuarantine({
        reason: 'duplicate_round',
        quest_id: questId,
        collection: 'points',
        record_ids: matchingPoints.map((point) => stringId(point._id)),
        detail: 'Multiple Point rows exist for one social reward claim',
      });
      continue;
    }
    if (social.reward_status && matchingPoints.length === 0) {
      addQuarantine({
        reason: 'partial_round',
        quest_id: questId,
        collection: 'socialrewards',
        record_ids: [stringId(social._id)],
        detail: 'SocialReward is marked paid but no Point evidence exists',
      });
      continue;
    }
    if (matchingPoints[0] && Number(matchingPoints[0].point) !== 50) {
      addQuarantine({
        reason: 'amount_currency_rank_mismatch',
        quest_id: questId,
        collection: 'points',
        record_ids: [stringId(matchingPoints[0]._id)],
        detail: 'Legacy social Point amount is not the historical 50 points',
      });
      continue;
    }
    if (
      matchingPoints[0]?.idempotency_key &&
      matchingPoints[0].idempotency_key !== payoutKey
    ) {
      addQuarantine({
        reason: 'social_referral_ambiguity',
        quest_id: questId,
        collection: 'points',
        record_ids: [stringId(matchingPoints[0]._id)],
        detail: 'Existing social Point key is not its canonical identity',
      });
      continue;
    }
    if (
      !social.legacy_payout_key ||
      (!social.reward_status && matchingPoints[0])
    ) {
      addOperation({
        collection: 'socialrewards',
        id: stringId(social._id),
        expected: {
          legacy_payout_key: social.legacy_payout_key,
          reward_status: social.reward_status,
        },
        set: {
          ...(!social.legacy_payout_key
            ? { legacy_payout_key: payoutKey }
            : {}),
          ...(!social.reward_status && matchingPoints[0]
            ? { reward_status: true }
            : {}),
        },
        identity: payoutKey,
      });
    }
    if (matchingPoints[0] && !matchingPoints[0].idempotency_key) {
      addOperation({
        collection: 'points',
        id: stringId(matchingPoints[0]._id),
        expected: { idempotency_key: matchingPoints[0].idempotency_key },
        set: { idempotency_key: payoutKey },
        identity: payoutKey,
      });
    }
  }

  const rankConversions = snapshot.conversions.filter(
    (conversion) => conversion.offer_name === 'reward_conversion_quest',
  );
  const rankGroups = new Map<string, LegacyConversionEvidence[]>();
  const rankCoverageCompletedQuestIds = new Set<string>();
  for (const conversion of rankConversions) {
    const questId = stringId(conversion.adv_sub3);
    if (!questId) {
      addQuarantine({
        reason: 'manual_reward_without_quest_id',
        collection: 'conversions',
        record_ids: [stringId(conversion._id)],
        detail: 'Synthetic reward conversion has no immutable quest id',
      });
      for (const candidate of legacyQuests) {
        quarantinedQuestIds.add(stringId(candidate._id));
      }
      continue;
    }
    const group = rankGroups.get(questId) ?? [];
    group.push(conversion);
    rankGroups.set(questId, group);
  }
  for (const [questId, group] of rankGroups) {
    const quest = questsById.get(questId);
    if (!quest) {
      addQuarantine({
        reason: 'unknown_quest',
        quest_id: questId,
        collection: 'conversions',
        record_ids: group.map((conversion) => stringId(conversion._id)),
        detail: 'Rank conversions reference a missing quest',
      });
      for (const candidate of legacyQuests) {
        quarantinedQuestIds.add(stringId(candidate._id));
      }
      continue;
    }
    if (quest.reward_model === 'task_v2') {
      addQuarantine({
        reason: 'task_v2_legacy_effect',
        quest_id: questId,
        collection: 'conversions',
        record_ids: group.map((conversion) => stringId(conversion._id)),
        detail: 'A task_v2 quest must not enter legacy rank payout',
      });
      continue;
    }
    if (!isLegacyRewardModel(quest.reward_model)) continue;
    const rankManifest = validManifests.get(
      legacyRewardManifestKey(questId, 'rank'),
    );
    if (!rankManifest) continue;
    if (!quest.rewards?.length) {
      addQuarantine({
        reason: 'mutable_reward_fallback',
        quest_id: questId,
        collection: 'rewardlists',
        record_ids: snapshot.rewardLists
          .filter((list) => list.name === 'quest')
          .map((list) => stringId(list._id)),
        detail:
          'Current RewardList fallback cannot prove historical rank economics',
      });
      continue;
    }
    const includedRecipients = rankManifest.recipients.filter(
      (recipient) => !recipient.excluded,
    );
    const recipientByUser = new Map(
      includedRecipients.map((recipient) => [
        stringId(recipient.user_id),
        recipient,
      ]),
    );
    const effectByUser = new Map<string, LegacyConversionEvidence[]>();
    let coverageInvalid = false;
    for (const conversion of group) {
      if (conversionUserIdentityConflicts(conversion)) {
        addQuarantine({
          reason: 'rank_user_identity_conflict',
          quest_id: questId,
          collection: 'conversions',
          record_ids: [stringId(conversion._id)],
          detail:
            'Rank conversion user_id and aff_sub1 identify different users',
        });
        coverageInvalid = true;
        continue;
      }
      const userId = conversionUserId(conversion);
      if (!userId || !recipientByUser.has(userId)) {
        addQuarantine({
          reason: 'rank_manifest_coverage_mismatch',
          quest_id: questId,
          collection: 'conversions',
          record_ids: [stringId(conversion._id)],
          detail:
            'Synthetic rank effect is not one included manifest recipient',
        });
        coverageInvalid = true;
        continue;
      }
      const effects = effectByUser.get(userId) ?? [];
      effects.push(conversion);
      effectByUser.set(userId, effects);
    }
    const duplicateEffects = [...effectByUser.values()].flatMap((effects) =>
      effects.length > 1 ? effects : [],
    );
    if (duplicateEffects.length > 0) {
      addQuarantine({
        reason: 'duplicate_round',
        quest_id: questId,
        collection: 'conversions',
        record_ids: duplicateEffects.map((conversion) =>
          stringId(conversion._id),
        ),
        detail:
          'Rank round contains duplicate effects for one manifest recipient',
      });
      coverageInvalid = true;
    }
    for (const manifestRecipient of includedRecipients) {
      const userId = stringId(manifestRecipient.user_id);
      const effects = effectByUser.get(userId) ?? [];
      if (effects.length !== 1) continue;
      const conversion = effects[0];
      const rank = Number(manifestRecipient.rank);
      const reward = quest.rewards?.find(
        (candidate) => Number(candidate.rank) === rank,
      );
      if (
        !reward ||
        Number(reward.reward) !== Number(conversion.payout) ||
        String(reward.currency || 'THB') !==
          String(conversion.currency || 'THB') ||
        Number(manifestRecipient.amount) !== Number(conversion.payout) ||
        String(manifestRecipient.currency || 'THB') !==
          String(conversion.currency || 'THB')
      ) {
        addQuarantine({
          reason: 'amount_currency_rank_mismatch',
          quest_id: questId,
          collection: 'conversions',
          record_ids: [stringId(conversion._id)],
          detail: `Rank ${rank} payout does not match the immutable quest reward`,
        });
        coverageInvalid = true;
        continue;
      }
      const expectedPayoutKey = legacyRankPayoutKey(questId, userId, rank);
      const payoutKey = manifestRecipient.payout_key;
      if (
        payoutKey !== expectedPayoutKey ||
        (conversion.quest_payout_key &&
          conversion.quest_payout_key !== payoutKey) ||
        (conversion.source && conversion.source !== 'involve') ||
        (conversion.provider_account &&
          conversion.provider_account !== 'legacy-quest') ||
        (conversion.provider_conversion_id &&
          conversion.provider_conversion_id !== payoutKey) ||
        (conversion.adv_sub5 && String(conversion.adv_sub5) !== String(rank))
      ) {
        addQuarantine({
          reason: 'invalid_recipient_manifest',
          quest_id: questId,
          collection: 'legacyrewardmanifests',
          record_ids: [rankManifest?.manifest_key ?? stringId(conversion._id)],
          detail: `Rank ${rank} payout identity conflicts with its recipient evidence`,
        });
        coverageInvalid = true;
        continue;
      }
      const set = {
        ...(!conversion.quest_payout_key
          ? { quest_payout_key: payoutKey }
          : {}),
        ...(!conversion.source ? { source: 'involve' } : {}),
        ...(!conversion.provider_account
          ? { provider_account: 'legacy-quest' }
          : {}),
        ...(!conversion.provider_conversion_id
          ? { provider_conversion_id: payoutKey }
          : {}),
        ...(!conversion.adv_sub5 ? { adv_sub5: String(rank) } : {}),
        ...(!conversion.user_id ? { user_id: userId } : {}),
        ...(!conversion.aff_sub1 ? { aff_sub1: `user_id:${userId}` } : {}),
        ...(conversion.quest_synthetic_reward !== true
          ? { quest_synthetic_reward: true }
          : {}),
      };
      if (Object.keys(set).length > 0) {
        addOperation({
          collection: 'conversions',
          id: stringId(conversion._id),
          expected: {
            ...(!conversion.quest_payout_key
              ? { quest_payout_key: conversion.quest_payout_key }
              : {}),
            ...(!conversion.source ? { source: conversion.source } : {}),
            ...(!conversion.provider_account
              ? { provider_account: conversion.provider_account }
              : {}),
            ...(!conversion.provider_conversion_id
              ? {
                  provider_conversion_id: conversion.provider_conversion_id,
                }
              : {}),
            ...(!conversion.adv_sub5 ? { adv_sub5: conversion.adv_sub5 } : {}),
            ...(!conversion.user_id ? { user_id: conversion.user_id } : {}),
            ...(!conversion.aff_sub1 ? { aff_sub1: conversion.aff_sub1 } : {}),
            ...(conversion.quest_synthetic_reward !== true
              ? { quest_synthetic_reward: conversion.quest_synthetic_reward }
              : {}),
          },
          set,
          identity: payoutKey,
        });
      }
    }
    const exactCoverage =
      !coverageInvalid &&
      group.length === includedRecipients.length &&
      includedRecipients.every(
        (recipient) =>
          (effectByUser.get(stringId(recipient.user_id)) ?? []).length === 1,
      );
    const exactAbsence = !coverageInvalid && group.length === 0;
    if (
      (quest.reward_status === true && !exactCoverage) ||
      (quest.reward_status !== true && !exactCoverage && !exactAbsence)
    ) {
      addQuarantine({
        reason: 'rank_manifest_coverage_mismatch',
        quest_id: questId,
        collection: 'conversions',
        record_ids:
          group.length > 0
            ? group.map((conversion) => stringId(conversion._id))
            : [rankManifest.manifest_key],
        detail:
          'Rank effects do not exactly cover every included immutable manifest recipient',
      });
    } else if (exactCoverage) {
      rankCoverageCompletedQuestIds.add(questId);
    }
  }

  for (const quest of legacyQuests) {
    const questId = stringId(quest._id);
    if (rankGroups.has(questId)) continue;
    const rankManifest = validManifests.get(
      legacyRewardManifestKey(questId, 'rank'),
    );
    if (!rankManifest) continue;
    const includedCount = rankManifest.recipients.filter(
      (recipient) => !recipient.excluded,
    ).length;
    if (quest.reward_status === true && includedCount > 0) {
      addQuarantine({
        reason: 'rank_manifest_coverage_mismatch',
        quest_id: questId,
        collection: 'conversions',
        record_ids: [rankManifest.manifest_key],
        detail:
          'Quest is marked rank-paid but no effects cover its included recipients',
      });
    } else if (quest.reward_status === true && includedCount === 0) {
      rankCoverageCompletedQuestIds.add(questId);
    }
  }

  for (const point of snapshot.points.filter(
    (candidate) => candidate.action === 'special_point_quest',
  )) {
    if (point.idempotency_key) continue;
    const matches = [...validManifests.values()].flatMap((manifest) =>
      manifest.reward_type === 'special-next-round'
        ? manifest.recipients
            .filter(
              (recipient) =>
                !recipient.excluded &&
                stringId(recipient.user_id) === stringId(point.user_id) &&
                Number(recipient.amount) === Number(point.point),
            )
            .map((recipient) => ({ manifest, recipient }))
        : [],
    );
    if (matches.length === 1) {
      const { manifest, recipient } = matches[0];
      const expectedKey = legacySpecialPointKey(
        manifest.quest_id,
        recipient.user_id,
      );
      if (recipient.payout_key === expectedKey) {
        addOperation({
          collection: 'points',
          id: stringId(point._id),
          expected: { idempotency_key: point.idempotency_key },
          set: { idempotency_key: expectedKey },
          identity: expectedKey,
        });
        continue;
      }
    }
    addQuarantine({
      reason: 'missing_quest_lineage',
      collection: 'points',
      record_ids: [stringId(point._id)],
      detail:
        'Historical special-point rows contain no quest id and cannot be guessed from time alone',
    });
    for (const quest of legacyQuests) {
      quarantinedQuestIds.add(stringId(quest._id));
    }
  }

  for (const quest of legacyQuests) {
    const questId = stringId(quest._id);
    const hasRankRows = rankGroups.has(questId);
    const hasRankManifest = validManifests.has(
      legacyRewardManifestKey(questId, 'rank'),
    );
    if (quest.reward_status === false && !hasRankRows && !hasRankManifest) {
      addQuarantine({
        reason: 'absence_does_not_prove_unpaid',
        quest_id: questId,
        collection: 'quests',
        record_ids: [questId],
        detail:
          'No new payout key or row exists, which is not proof that a legacy round is unpaid',
      });
    }
  }

  for (const quest of legacyQuests) {
    const questId = stringId(quest._id);
    const nextStatus = quarantinedQuestIds.has(questId)
      ? 'quarantined'
      : 'ready';
    if (
      quest.legacy_payout_reconciliation_status === nextStatus &&
      quest.legacy_payout_reconciliation_version === RECONCILIATION_VERSION
    ) {
      continue;
    }
    const set: Record<string, unknown> = {
      legacy_payout_reconciliation_status: nextStatus,
      legacy_payout_reconciliation_version: RECONCILIATION_VERSION,
      legacy_payout_reconciled_at: now,
    };
    const rankManifest = validManifests.get(
      legacyRewardManifestKey(questId, 'rank'),
    );
    const specialManifest = validManifests.get(
      legacyRewardManifestKey(questId, 'special-next-round'),
    );
    if (
      nextStatus === 'ready' &&
      (rankManifest?.status === 'completed' ||
        rankCoverageCompletedQuestIds.has(questId))
    ) {
      set.legacy_rank_payout_completed_at =
        quest.legacy_rank_payout_completed_at ?? now;
      set.reward_status = true;
    }
    if (specialManifest?.status === 'completed') {
      set.legacy_special_point_completed_at =
        quest.legacy_special_point_completed_at ?? now;
    }
    addOperation({
      collection: 'quests',
      id: questId,
      expected: {
        legacy_payout_reconciliation_status:
          quest.legacy_payout_reconciliation_status,
        legacy_payout_reconciliation_version:
          quest.legacy_payout_reconciliation_version,
      },
      set,
      identity: `legacy:quest:${questId}:reconciliation:v${RECONCILIATION_VERSION}`,
    });
  }

  operations.sort((a, b) =>
    `${a.collection}:${a.id}:${a.identity}`.localeCompare(
      `${b.collection}:${b.id}:${b.identity}`,
    ),
  );
  quarantine.sort((a, b) =>
    `${a.reason}:${a.quest_id ?? ''}:${a.record_ids.join(',')}`.localeCompare(
      `${b.reason}:${b.quest_id ?? ''}:${b.record_ids.join(',')}`,
    ),
  );

  const backup = operations.map((operation) => {
    const row = snapshotRow(snapshot, operation.collection, operation.id);
    if (!row)
      throw new Error(
        `Missing reconciliation preimage ${operation.collection}:${operation.id}`,
      );
    return {
      collection: operation.collection,
      id: operation.id,
      preimage: Object.fromEntries(
        Object.keys(operation.set).map((field) => [field, row[field]]),
      ),
    };
  });
  const rollback = operations
    .map((operation, index) => ({
      collection: operation.collection,
      id: operation.id,
      expected: { ...operation.set },
      set: { ...backup[index].preimage },
      identity: `rollback:${operation.identity}`,
    }))
    .reverse();
  const counts: LegacyRewardReconciliationCounts = {
    quests_scanned: snapshot.quests.length,
    legacy_quests: legacyQuests.length,
    task_v2_quests_excluded: taskV2Quests.length,
    unknown_model_quests: unknownModelQuests.length,
    points_scanned: snapshot.points.length,
    conversions_scanned: snapshot.conversions.length,
    social_rewards_scanned: snapshot.socialRewards.length,
    reward_lists_scanned: snapshot.rewardLists.length,
    manifests_scanned: snapshot.manifests.length,
    resolution_commands_scanned: (snapshot.resolutionCommands ?? []).length,
    point_keys_planned: operations.filter(
      (operation) =>
        operation.collection === 'points' &&
        Object.prototype.hasOwnProperty.call(operation.set, 'idempotency_key'),
    ).length,
    conversion_keys_planned: operations.filter(
      (operation) =>
        operation.collection === 'conversions' &&
        Object.prototype.hasOwnProperty.call(operation.set, 'quest_payout_key'),
    ).length,
    social_keys_planned: operations.filter(
      (operation) =>
        operation.collection === 'socialrewards' &&
        Object.prototype.hasOwnProperty.call(
          operation.set,
          'legacy_payout_key',
        ),
    ).length,
    quests_ready_planned: operations.filter(
      (operation) =>
        operation.collection === 'quests' &&
        operation.set.legacy_payout_reconciliation_status === 'ready',
    ).length,
    quests_quarantined_planned: operations.filter(
      (operation) =>
        operation.collection === 'quests' &&
        operation.set.legacy_payout_reconciliation_status === 'quarantined',
    ).length,
    quarantine_items: quarantine.length,
  };

  const evidenceChecksum = checksum(snapshot);
  const rollbackChecksum = checksum({
    evidence_checksum: evidenceChecksum,
    backup,
    rollback,
  });
  return {
    counts,
    operations,
    quarantine,
    evidence_checksum: evidenceChecksum,
    rollback_checksum: rollbackChecksum,
    backup,
    rollback,
  };
}

export async function runLegacyRewardRollback(
  store: LegacyRewardReconciliationStore,
  artifact: LegacyRewardRollbackArtifact,
  options: { runId: string },
): Promise<LegacyRewardRollbackReport> {
  const expectedChecksum = checksum({
    evidence_checksum: artifact.evidence_checksum,
    backup: artifact.rollback
      .slice()
      .reverse()
      .map((operation) => ({
        collection: operation.collection,
        id: operation.id,
        preimage: { ...operation.set },
      })),
    rollback: artifact.rollback,
  });
  if (artifact.rollback_checksum !== expectedChecksum) {
    throw new Error('Rollback artifact checksum mismatch');
  }
  const snapshot = await store.readSnapshot();
  let updated = 0;
  let alreadyRestored = 0;
  let casConflicts = 0;
  for (const serializedOperation of artifact.rollback) {
    const operation = executableRollbackOperation(serializedOperation);
    const row = snapshotRow(snapshot, operation.collection, operation.id);
    if (
      row &&
      Object.entries(operation.set).every(([field, value]) =>
        sameStableValue(row[field], value),
      )
    ) {
      alreadyRestored += 1;
      continue;
    }
    if (await store.compareAndSet(operation)) updated += 1;
    else casConflicts += 1;
  }
  return {
    mode: 'rollback',
    run_id: options.runId,
    evidence_checksum: artifact.evidence_checksum,
    rollback_checksum: artifact.rollback_checksum,
    operations: artifact.rollback,
    applied: {
      updated,
      already_restored: alreadyRestored,
      cas_conflicts: casConflicts,
    },
  };
}

export async function runLegacyRewardReconciliation(
  store: LegacyRewardReconciliationStore,
  options: { mode: 'dry-run' | 'apply'; runId: string; now?: Date },
): Promise<LegacyRewardReconciliationReport> {
  const snapshot = await store.readSnapshot();
  const plan = buildLegacyRewardReconciliationPlan(snapshot, options.now);
  let updated = 0;
  let casConflicts = 0;
  let indexesVerified: string[] = [];
  if (options.mode === 'apply') {
    const dataOperations = plan.operations.filter(
      (operation) => operation.collection !== 'quests',
    );
    const readinessOperations = plan.operations.filter(
      (operation) => operation.collection === 'quests',
    );
    for (const operation of dataOperations) {
      if (await store.compareAndSet(operation)) updated += 1;
      else casConflicts += 1;
    }
    if (casConflicts === 0 && store.ensureIndexes) {
      indexesVerified = await store.ensureIndexes();
    }
    // Publishing Quest readiness is deliberately last. A CAS conflict or an
    // index failure leaves every scheduler disabled by the missing/non-ready
    // gate and makes the apply safe to rerun.
    if (casConflicts === 0) {
      for (const operation of readinessOperations) {
        if (await store.compareAndSet(operation)) updated += 1;
        else casConflicts += 1;
      }
    }
  }
  return {
    mode: options.mode,
    run_id: options.runId,
    ...plan,
    applied: { updated, cas_conflicts: casConflicts },
    indexes_verified: indexesVerified,
  };
}
