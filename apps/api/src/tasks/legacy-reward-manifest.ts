import { createHash } from 'node:crypto';
import {
  legacyRankPayoutKey,
  legacySpecialPointKey,
} from './legacy-reward-identity';

export type LegacyRewardManifestType = 'rank' | 'special-next-round';

export interface LegacyRewardManifestRecipient {
  user_id: string;
  payout_key: string;
  amount: number;
  rank?: number;
  currency?: string;
  excluded?: boolean;
  exclusion_reason?: string;
}

export interface LegacyRewardManifest {
  _id?: unknown;
  manifest_key: string;
  quest_id: string;
  reward_type: LegacyRewardManifestType;
  reconciliation_version: number;
  status: 'ready' | 'completed' | 'quarantined';
  recipients: LegacyRewardManifestRecipient[];
  manifest_hash: string;
  quest_config_checksum: string;
  completed_at?: Date;
  no_recipient_reason?: string;
}

export interface LegacyQuestPayoutConfig {
  _id: unknown;
  reward_model?: unknown;
  timezone?: unknown;
  audience?: { kind?: unknown; tier_ids?: unknown[] } | null;
  reward_caps?: {
    max_awards_per_user?: unknown;
    max_referrals_per_user?: unknown;
  } | null;
  tasks?: unknown[];
  start_date?: Date | string | null;
  end_date?: Date | string | null;
  reward_distribution_mode?: unknown;
  reward_distribution_delay_days?: unknown;
  reward_distribution_scheduled_at?: Date | string | null;
  rewards?: Array<{ rank?: unknown; reward?: unknown; currency?: unknown }>;
  facebook_page?: unknown;
  facebook_post?: unknown;
  line?: unknown;
}

export interface LegacySocialRewardPair {
  type: 'facebook' | 'line';
  action: 'follow' | 'like' | 'comment' | 'reply' | 'add_friend';
}

function isoDate(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  const date = value instanceof Date ? value : new Date(String(value));
  if (!Number.isFinite(date.getTime()))
    throw new Error('Invalid quest schedule');
  return date.toISOString();
}

function configured(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function objectIdentity(value: unknown): string {
  if (value && typeof value === 'object' && '_id' in value) {
    return String((value as { _id?: unknown })._id ?? '');
  }
  return String(value ?? '');
}

function nullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  return Number(value);
}

function normalizedLegacyTasks(tasks: unknown[] | undefined) {
  return [...(tasks ?? [])]
    .map((value) => {
      const task = (value ?? {}) as Record<string, unknown>;
      return {
        task_key: String(task.task_key ?? ''),
        task_type: String(task.task_type ?? 'brand_purchase'),
        offer: objectIdentity(task.offer),
        offer_id: nullableNumber(task.offer_id),
        merchant_id: nullableNumber(task.merchant_id),
        points: nullableNumber(task.points),
        extra_point: nullableNumber(task.extra_point),
        completion_rule: String(task.completion_rule ?? ''),
        spend_scope: String(task.spend_scope ?? ''),
        target_thb_minor: nullableNumber(task.target_thb_minor),
        enabled: task.enabled !== false,
      };
    })
    .sort((left, right) =>
      JSON.stringify(left).localeCompare(JSON.stringify(right)),
    );
}

/** The only social identities the historical customer client ever emitted. */
export function legacySocialRewardAllowlist(
  quest: Pick<
    LegacyQuestPayoutConfig,
    'facebook_page' | 'facebook_post' | 'line'
  >,
): LegacySocialRewardPair[] {
  const pairs: LegacySocialRewardPair[] = [];
  if (configured(quest.facebook_page)) {
    pairs.push({ type: 'facebook', action: 'follow' });
  }
  if (configured(quest.facebook_post)) {
    pairs.push(
      { type: 'facebook', action: 'like' },
      { type: 'facebook', action: 'comment' },
      { type: 'facebook', action: 'reply' },
    );
  }
  if (configured(quest.line)) {
    pairs.push({ type: 'line', action: 'add_friend' });
  }
  return pairs;
}

export function legacyQuestPayoutConfigChecksum(
  quest: LegacyQuestPayoutConfig,
): string {
  const rewards = [...(quest.rewards ?? [])]
    .map((reward) => ({
      rank: Number(reward.rank),
      reward: Number(reward.reward),
      currency: String(reward.currency || 'THB').toUpperCase(),
    }))
    .sort((left, right) => left.rank - right.rank);
  const audience = quest.audience ?? {};
  const rewardCaps = quest.reward_caps ?? {};
  return createHash('sha256')
    .update(
      JSON.stringify({
        quest_id: String(quest._id),
        reward_model:
          quest.reward_model === undefined || quest.reward_model === null
            ? 'legacy_v1'
            : String(quest.reward_model),
        timezone: String(quest.timezone || 'Asia/Bangkok'),
        audience: {
          kind: String(audience.kind || 'all'),
          tier_ids: [...(audience.tier_ids ?? [])]
            .map((tier) => String(tier))
            .sort(),
        },
        reward_caps: {
          max_awards_per_user: nullableNumber(rewardCaps.max_awards_per_user),
          max_referrals_per_user: nullableNumber(
            rewardCaps.max_referrals_per_user,
          ),
        },
        tasks: normalizedLegacyTasks(quest.tasks),
        start_date: isoDate(quest.start_date),
        end_date: isoDate(quest.end_date),
        reward_distribution_mode: String(
          quest.reward_distribution_mode || 'campaign_end',
        ),
        reward_distribution_delay_days: Number(
          quest.reward_distribution_delay_days || 0,
        ),
        reward_distribution_scheduled_at: isoDate(
          quest.reward_distribution_scheduled_at,
        ),
        rewards,
        facebook_page: String(quest.facebook_page || '').trim(),
        facebook_post: String(quest.facebook_post || '').trim(),
        line: String(quest.line || '').trim(),
      }),
    )
    .digest('hex');
}

export function legacyRewardManifestKey(
  questId: unknown,
  rewardType: LegacyRewardManifestType,
) {
  const id = String(questId ?? '').trim();
  if (!id || id.includes(':')) throw new Error('Invalid quest manifest id');
  return `legacy:quest:${id}:manifest:${rewardType}`;
}

function canonicalRecipients(recipients: LegacyRewardManifestRecipient[]) {
  return recipients.map((recipient) => ({
    user_id: String(recipient.user_id),
    payout_key: String(recipient.payout_key),
    amount: Number(recipient.amount),
    ...(recipient.rank === undefined ? {} : { rank: Number(recipient.rank) }),
    ...(recipient.currency
      ? { currency: String(recipient.currency).toUpperCase() }
      : {}),
    ...(recipient.excluded ? { excluded: true } : {}),
    ...(recipient.exclusion_reason
      ? { exclusion_reason: String(recipient.exclusion_reason) }
      : {}),
  }));
}

export function legacyRewardManifestHash(
  questId: unknown,
  rewardType: LegacyRewardManifestType,
  reconciliationVersion: number,
  recipients: LegacyRewardManifestRecipient[],
  noRecipientReason?: string,
  questConfigChecksum?: string,
) {
  return createHash('sha256')
    .update(
      JSON.stringify({
        quest_id: String(questId),
        reward_type: rewardType,
        reconciliation_version: reconciliationVersion,
        quest_config_checksum: String(questConfigChecksum || ''),
        recipients: canonicalRecipients(recipients),
        ...(noRecipientReason?.trim()
          ? { no_recipient_reason: noRecipientReason.trim() }
          : {}),
      }),
    )
    .digest('hex');
}

export function assertLegacyRewardManifest(
  manifest: LegacyRewardManifest | null | undefined,
  questId: unknown,
  rewardType: LegacyRewardManifestType,
  reconciliationVersion: number,
  expectedQuestConfigChecksum?: string,
): asserts manifest is LegacyRewardManifest {
  if (!manifest) throw new Error('Legacy reward recipient manifest is missing');
  if (
    manifest.manifest_key !== legacyRewardManifestKey(questId, rewardType) ||
    String(manifest.quest_id) !== String(questId) ||
    manifest.reward_type !== rewardType ||
    manifest.reconciliation_version !== reconciliationVersion ||
    !/^[a-f0-9]{64}$/.test(manifest.quest_config_checksum) ||
    (expectedQuestConfigChecksum !== undefined &&
      manifest.quest_config_checksum !== expectedQuestConfigChecksum) ||
    !['ready', 'completed'].includes(manifest.status)
  ) {
    throw new Error('Legacy reward recipient manifest is not ready');
  }
  const identities = new Set<string>();
  const users = new Set<string>();
  const ranks = new Set<number>();
  if (
    manifest.recipients.length === 0 &&
    !manifest.no_recipient_reason?.trim()
  ) {
    throw new Error(
      'Empty legacy recipient manifest requires reviewed no-recipient evidence',
    );
  }
  for (const recipient of manifest.recipients) {
    if (
      !recipient.user_id ||
      !recipient.payout_key ||
      !Number.isFinite(recipient.amount) ||
      recipient.amount < 0 ||
      identities.has(recipient.payout_key) ||
      users.has(String(recipient.user_id))
    ) {
      throw new Error('Legacy reward recipient manifest is invalid');
    }
    if (
      rewardType === 'rank' &&
      (!Number.isSafeInteger(recipient.rank) ||
        Number(recipient.rank) < 1 ||
        !recipient.currency?.trim() ||
        ranks.has(Number(recipient.rank)) ||
        recipient.payout_key !==
          legacyRankPayoutKey(
            questId,
            recipient.user_id,
            Number(recipient.rank),
          ))
    ) {
      throw new Error('Legacy rank manifest is invalid');
    }
    if (
      rewardType === 'special-next-round' &&
      (recipient.rank !== undefined ||
        recipient.currency !== undefined ||
        recipient.payout_key !==
          legacySpecialPointKey(questId, recipient.user_id))
    ) {
      throw new Error('Legacy special-point manifest is invalid');
    }
    if (recipient.excluded && !recipient.exclusion_reason?.trim()) {
      throw new Error('Excluded legacy recipient requires a reason');
    }
    identities.add(recipient.payout_key);
    users.add(String(recipient.user_id));
    if (recipient.rank !== undefined) ranks.add(Number(recipient.rank));
  }
  const expectedHash = legacyRewardManifestHash(
    questId,
    rewardType,
    reconciliationVersion,
    manifest.recipients,
    manifest.no_recipient_reason,
    manifest.quest_config_checksum,
  );
  if (manifest.manifest_hash !== expectedHash) {
    throw new Error('Legacy reward recipient manifest hash mismatch');
  }
}
