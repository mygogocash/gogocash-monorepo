import { createHash } from 'node:crypto';
import { Types } from 'mongoose';
import {
  isLegacyRewardModel,
  legacyRankPayoutKey,
  legacySpecialPointKey,
} from './legacy-reward-identity';
import {
  assertLegacyRewardManifest,
  legacyQuestPayoutConfigChecksum,
  LegacyRewardManifest,
  LegacyRewardManifestRecipient,
  LegacyRewardManifestType,
  legacyRewardManifestHash,
  legacyRewardManifestKey,
} from './legacy-reward-manifest';

export const LEGACY_MANIFEST_COMPLETENESS_ATTESTATION =
  'reviewed_complete_recipient_and_exclusion_set';

export function legacyManifestResolutionCommandKey(questId: string) {
  return `legacy:quest:${questId}:manifest-resolution:v1`;
}

export interface LegacyManifestResolutionRecipientEvidence {
  user_id: string;
  amount: number;
  rank?: number;
  currency?: string;
  excluded?: boolean;
  exclusion_reason?: string;
}

export interface LegacyManifestResolutionTypeEvidence {
  reward_type: LegacyRewardManifestType;
  recipients: LegacyManifestResolutionRecipientEvidence[];
  no_recipient_reason?: string;
}

export interface LegacyManifestResolutionEvidence {
  quest_id: string;
  reconciliation_version: 1;
  reviewed_by: string;
  review_reference: string;
  completeness_attestation: typeof LEGACY_MANIFEST_COMPLETENESS_ATTESTATION;
  manifests: LegacyManifestResolutionTypeEvidence[];
}

export interface LegacyManifestResolutionQuestSnapshot {
  _id: string;
  reward_model?: string | null;
  timezone?: string;
  audience?: { kind?: string; tier_ids?: string[] };
  reward_caps?: {
    max_awards_per_user?: number | null;
    max_referrals_per_user?: number | null;
  };
  tasks?: unknown[];
  start_date?: Date | string | null;
  end_date?: Date | string | null;
  reward_distribution_mode?: string;
  reward_distribution_delay_days?: number;
  reward_distribution_scheduled_at?: Date | string | null;
  facebook_page?: string;
  facebook_post?: string;
  line?: string;
  config_revision?: number;
  campaign_revision?: number;
  rewards?: Array<{ rank: number; reward: number; currency?: string }>;
  legacy_payout_reconciliation_status?: string;
  legacy_payout_reconciliation_version?: number;
}

export interface ResolvedLegacyRewardManifest extends LegacyRewardManifest {
  reviewed_by: string;
  review_reference: string;
  resolution_evidence_checksum: string;
  no_recipient_reason?: string;
}

export interface LegacyManifestResolutionSnapshot {
  quest: LegacyManifestResolutionQuestSnapshot | null;
  manifests: ResolvedLegacyRewardManifest[];
}

export interface LegacyManifestResolutionPlan {
  quest_id: string;
  reconciliation_version: 1;
  quest_snapshot_checksum: string;
  quest_config_checksum: string;
  expected_config_revision: number;
  expected_campaign_revision: number;
  evidence_checksum: string;
  plan_checksum: string;
  manifests: ResolvedLegacyRewardManifest[];
  already_applied: boolean;
}

export interface LegacyManifestResolutionStore {
  readSnapshot(questId: string): Promise<LegacyManifestResolutionSnapshot>;
  apply(
    plan: LegacyManifestResolutionPlan,
  ): Promise<'inserted' | 'already_applied'>;
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

function requiredText(value: unknown, label: string) {
  if (typeof value !== 'string') throw new Error(`${label} must be a string`);
  const normalized = String(value ?? '').trim();
  if (!normalized) throw new Error(`${label} is required`);
  return normalized;
}

function normalizedQuestSnapshot(quest: LegacyManifestResolutionQuestSnapshot) {
  return {
    _id: String(quest._id),
    reward_model: quest.reward_model,
    quest_config_checksum: legacyQuestPayoutConfigChecksum(quest),
    config_revision: Number(quest.config_revision ?? 0),
    campaign_revision: Number(quest.campaign_revision ?? 0),
    legacy_payout_reconciliation_status:
      quest.legacy_payout_reconciliation_status,
    legacy_payout_reconciliation_version:
      quest.legacy_payout_reconciliation_version,
  };
}

export function legacyManifestResolutionQuestChecksum(
  quest: LegacyManifestResolutionQuestSnapshot,
) {
  return checksum(normalizedQuestSnapshot(quest));
}

function normalizedRecipient(
  questId: string,
  rewardType: LegacyRewardManifestType,
  recipient: LegacyManifestResolutionRecipientEvidence,
): LegacyRewardManifestRecipient {
  const suppliedUserId = requiredText(recipient.user_id, 'recipient user_id');
  if (!Types.ObjectId.isValid(suppliedUserId)) {
    throw new Error(`Invalid recipient user_id ${suppliedUserId}`);
  }
  const userId = new Types.ObjectId(suppliedUserId).toHexString();
  if (
    typeof recipient.amount !== 'number' ||
    !Number.isFinite(recipient.amount) ||
    recipient.amount < 0
  ) {
    throw new Error(`Invalid recipient amount for ${userId}`);
  }
  const amount = recipient.amount;
  if (
    recipient.excluded !== undefined &&
    typeof recipient.excluded !== 'boolean'
  ) {
    throw new Error(`Invalid excluded flag for ${userId}`);
  }
  const excluded = recipient.excluded === true;
  const exclusionReason = recipient.exclusion_reason?.trim();
  if (excluded && !exclusionReason) {
    throw new Error(`Excluded recipient ${userId} requires a reason`);
  }
  if (!excluded && exclusionReason) {
    throw new Error(
      `Included recipient ${userId} cannot have an exclusion reason`,
    );
  }
  if (rewardType === 'rank') {
    if (typeof recipient.rank !== 'number') {
      throw new Error(`Invalid rank for recipient ${userId}`);
    }
    const rank = recipient.rank;
    if (!Number.isSafeInteger(rank) || rank < 1) {
      throw new Error(`Invalid rank for recipient ${userId}`);
    }
    const currency = requiredText(
      recipient.currency,
      `currency for rank recipient ${userId}`,
    ).toUpperCase();
    return {
      user_id: userId,
      payout_key: legacyRankPayoutKey(questId, userId, rank),
      amount,
      rank,
      currency,
      ...(excluded
        ? { excluded: true, exclusion_reason: exclusionReason }
        : {}),
    };
  }
  if (recipient.rank !== undefined || recipient.currency !== undefined) {
    throw new Error('Special-point evidence cannot contain rank or currency');
  }
  return {
    user_id: userId,
    payout_key: legacySpecialPointKey(questId, userId),
    amount,
    ...(excluded ? { excluded: true, exclusion_reason: exclusionReason } : {}),
  };
}

function manifestsEqual(
  existing: ResolvedLegacyRewardManifest[],
  proposed: ResolvedLegacyRewardManifest[],
) {
  if (existing.length !== proposed.length) return false;
  const byKey = new Map(
    existing.map((manifest) => [manifest.manifest_key, manifest]),
  );
  return proposed.every((manifest) => {
    const current = byKey.get(manifest.manifest_key);
    return (
      current?.manifest_hash === manifest.manifest_hash &&
      current.quest_config_checksum === manifest.quest_config_checksum &&
      current.resolution_evidence_checksum ===
        manifest.resolution_evidence_checksum &&
      current.reviewed_by === manifest.reviewed_by &&
      current.review_reference === manifest.review_reference &&
      (current.no_recipient_reason ?? '') ===
        (manifest.no_recipient_reason ?? '')
    );
  });
}

function manifestsCompatible(
  existing: ResolvedLegacyRewardManifest[],
  proposed: ResolvedLegacyRewardManifest[],
) {
  if (existing.length > proposed.length) return false;
  const proposedByKey = new Map(
    proposed.map((manifest) => [manifest.manifest_key, manifest]),
  );
  return existing.every((current) => {
    const planned = proposedByKey.get(current.manifest_key);
    return Boolean(
      planned &&
      current.manifest_hash === planned.manifest_hash &&
      current.quest_config_checksum === planned.quest_config_checksum &&
      current.resolution_evidence_checksum ===
        planned.resolution_evidence_checksum &&
      current.reviewed_by === planned.reviewed_by &&
      current.review_reference === planned.review_reference &&
      (current.no_recipient_reason ?? '') ===
        (planned.no_recipient_reason ?? ''),
    );
  });
}

export function buildLegacyManifestResolutionPlan(
  evidence: LegacyManifestResolutionEvidence,
  snapshot: LegacyManifestResolutionSnapshot,
): LegacyManifestResolutionPlan {
  const suppliedQuestId = requiredText(evidence.quest_id, 'quest_id');
  if (!Types.ObjectId.isValid(suppliedQuestId)) {
    throw new Error('quest_id is invalid');
  }
  const questId = new Types.ObjectId(suppliedQuestId).toHexString();
  if (evidence.reconciliation_version !== 1) {
    throw new Error('Only reconciliation_version 1 is supported');
  }
  if (
    evidence.completeness_attestation !==
    LEGACY_MANIFEST_COMPLETENESS_ATTESTATION
  ) {
    throw new Error('The complete recipient/exclusion attestation is required');
  }
  const reviewedBy = requiredText(evidence.reviewed_by, 'reviewed_by');
  const reviewReference = requiredText(
    evidence.review_reference,
    'review_reference',
  );
  const quest = snapshot.quest;
  if (!quest || String(quest._id) !== questId) {
    throw new Error('Quest does not match the requested resolution target');
  }
  if (!isLegacyRewardModel(quest.reward_model)) {
    throw new Error('Only a legacy quest can receive legacy payout manifests');
  }

  const evidenceTypes = new Map<
    LegacyRewardManifestType,
    LegacyManifestResolutionTypeEvidence
  >();
  for (const manifest of evidence.manifests ?? []) {
    if (!['rank', 'special-next-round'].includes(manifest.reward_type)) {
      throw new Error(
        `Unsupported reward_type ${String(manifest.reward_type)}`,
      );
    }
    if (evidenceTypes.has(manifest.reward_type)) {
      throw new Error(`Duplicate ${manifest.reward_type} evidence`);
    }
    evidenceTypes.set(manifest.reward_type, manifest);
  }
  for (const requiredType of ['rank', 'special-next-round'] as const) {
    if (!evidenceTypes.has(requiredType)) {
      throw new Error(`Missing complete ${requiredType} evidence`);
    }
  }

  const normalizedEvidence = {
    quest_id: questId,
    reconciliation_version: 1 as const,
    reviewed_by: reviewedBy,
    review_reference: reviewReference,
    completeness_attestation: LEGACY_MANIFEST_COMPLETENESS_ATTESTATION,
    manifests: (['rank', 'special-next-round'] as const).map((rewardType) => {
      const source = evidenceTypes.get(rewardType)!;
      if (!Array.isArray(source.recipients)) {
        throw new Error(`${rewardType} recipients must be an array`);
      }
      const recipients = source.recipients
        .map((recipient) => normalizedRecipient(questId, rewardType, recipient))
        .sort((left, right) =>
          rewardType === 'rank'
            ? Number(left.rank) - Number(right.rank)
            : left.payout_key.localeCompare(right.payout_key),
        );
      const noRecipientReason = source.no_recipient_reason?.trim();
      if (recipients.length === 0 && !noRecipientReason) {
        throw new Error(
          `${rewardType} requires recipients or an explicit no_recipient_reason`,
        );
      }
      if (recipients.length > 0 && noRecipientReason) {
        throw new Error(
          `${rewardType} cannot combine recipients with no_recipient_reason`,
        );
      }
      if (
        new Set(recipients.map((recipient) => recipient.user_id)).size !==
        recipients.length
      ) {
        throw new Error(`Duplicate ${rewardType} recipient`);
      }
      if (
        rewardType === 'rank' &&
        new Set(recipients.map((recipient) => recipient.rank)).size !==
          recipients.length
      ) {
        throw new Error('Duplicate rank recipient position');
      }
      return {
        reward_type: rewardType,
        recipients,
        ...(noRecipientReason
          ? { no_recipient_reason: noRecipientReason }
          : {}),
      };
    }),
  };
  const questRewards = quest.rewards ?? [];
  if (
    new Set(questRewards.map((reward) => Number(reward.rank))).size !==
    questRewards.length
  ) {
    throw new Error('Immutable quest rewards contain duplicate ranks');
  }
  const rewardsByRank = new Map(
    questRewards.map((reward) => [Number(reward.rank), reward]),
  );
  for (const recipient of normalizedEvidence.manifests[0].recipients) {
    if (recipient.excluded) continue;
    const reward = rewardsByRank.get(Number(recipient.rank));
    if (
      !reward ||
      Number(reward.reward) !== recipient.amount ||
      String(reward.currency || 'THB') !== recipient.currency
    ) {
      throw new Error(
        `Rank ${String(recipient.rank)} evidence conflicts with immutable quest rewards`,
      );
    }
  }

  const evidenceChecksum = checksum(normalizedEvidence);
  const questConfigChecksum = legacyQuestPayoutConfigChecksum(quest);
  const manifests: ResolvedLegacyRewardManifest[] =
    normalizedEvidence.manifests.map((manifest) => ({
      manifest_key: legacyRewardManifestKey(questId, manifest.reward_type),
      quest_id: questId,
      reward_type: manifest.reward_type,
      reconciliation_version: 1,
      status: 'ready',
      recipients: manifest.recipients,
      manifest_hash: legacyRewardManifestHash(
        questId,
        manifest.reward_type,
        1,
        manifest.recipients,
        'no_recipient_reason' in manifest
          ? manifest.no_recipient_reason
          : undefined,
        questConfigChecksum,
      ),
      quest_config_checksum: questConfigChecksum,
      reviewed_by: reviewedBy,
      review_reference: reviewReference,
      resolution_evidence_checksum: evidenceChecksum,
      ...('no_recipient_reason' in manifest
        ? { no_recipient_reason: manifest.no_recipient_reason }
        : {}),
    }));
  for (const manifest of manifests) {
    assertLegacyRewardManifest(
      manifest,
      questId,
      manifest.reward_type,
      1,
      questConfigChecksum,
    );
  }

  const alreadyApplied = manifestsEqual(snapshot.manifests, manifests);
  if (
    snapshot.manifests.length > 0 &&
    !manifestsCompatible(snapshot.manifests, manifests)
  ) {
    throw new Error(
      'Existing legacy reward manifests differ; immutable evidence cannot be replaced',
    );
  }
  if (
    !alreadyApplied &&
    (!['pending', 'quarantined'].includes(
      String(quest.legacy_payout_reconciliation_status),
    ) ||
      quest.legacy_payout_reconciliation_version !== 1)
  ) {
    throw new Error(
      'Quest must still be pending/quarantined at reconciliation version 1',
    );
  }

  const questSnapshotChecksum = legacyManifestResolutionQuestChecksum(quest);
  return {
    quest_id: questId,
    reconciliation_version: 1,
    quest_snapshot_checksum: questSnapshotChecksum,
    quest_config_checksum: questConfigChecksum,
    expected_config_revision: Number(quest.config_revision ?? 0),
    expected_campaign_revision: Number(quest.campaign_revision ?? 0),
    evidence_checksum: evidenceChecksum,
    plan_checksum: checksum({
      quest_config_checksum: questConfigChecksum,
      expected_config_revision: Number(quest.config_revision ?? 0),
      expected_campaign_revision: Number(quest.campaign_revision ?? 0),
      evidence_checksum: evidenceChecksum,
      manifests,
    }),
    manifests,
    already_applied: alreadyApplied,
  };
}
