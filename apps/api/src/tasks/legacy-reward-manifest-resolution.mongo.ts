import { Db, ObjectId } from 'mongodb';
import {
  legacyManifestResolutionCommandKey,
  legacyManifestResolutionQuestChecksum,
  LegacyManifestResolutionPlan,
  LegacyManifestResolutionSnapshot,
  LegacyManifestResolutionStore,
  ResolvedLegacyRewardManifest,
} from './legacy-reward-manifest-resolution';
import { legacyQuestPayoutConfigChecksum } from './legacy-reward-manifest';
import { assertLegacyRewardManifest } from './legacy-reward-manifest';

function toEvidence(value: unknown): unknown {
  if (value instanceof ObjectId) return value.toHexString();
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map(toEvidence);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
        key,
        toEvidence(nested),
      ]),
    );
  }
  return value;
}

function sameManifest(
  current: ResolvedLegacyRewardManifest | undefined,
  planned: ResolvedLegacyRewardManifest,
) {
  if (!current) return false;
  try {
    assertLegacyRewardManifest(
      current,
      planned.quest_id,
      planned.reward_type,
      planned.reconciliation_version,
      planned.quest_config_checksum,
    );
  } catch {
    return false;
  }
  return (
    current.manifest_key === planned.manifest_key &&
    current.manifest_hash === planned.manifest_hash &&
    current.quest_config_checksum === planned.quest_config_checksum &&
    current.resolution_evidence_checksum ===
      planned.resolution_evidence_checksum &&
    current.reviewed_by === planned.reviewed_by &&
    current.review_reference === planned.review_reference &&
    (current.no_recipient_reason ?? '') === (planned.no_recipient_reason ?? '')
  );
}

function sameAppliedManifests(
  current: ResolvedLegacyRewardManifest[],
  planned: ResolvedLegacyRewardManifest[],
) {
  if (current.length !== planned.length) return false;
  const currentByKey = new Map(
    current.map((manifest) => [manifest.manifest_key, manifest]),
  );
  return planned.every((manifest) =>
    sameManifest(currentByKey.get(manifest.manifest_key), manifest),
  );
}

function revisionClause(field: string, expected: number) {
  return expected === 0
    ? { $or: [{ [field]: 0 }, { [field]: { $exists: false } }] }
    : { [field]: expected };
}

export class MongoLegacyManifestResolutionStore implements LegacyManifestResolutionStore {
  constructor(private readonly db: Db) {}

  async readSnapshot(
    questId: string,
  ): Promise<LegacyManifestResolutionSnapshot> {
    const id = new ObjectId(questId);
    const [quest, manifests] = await Promise.all([
      this.db.collection('quests').findOne({ _id: id }),
      this.db
        .collection('legacyrewardmanifests')
        .find({ quest_id: { $in: [id, questId] } })
        .toArray(),
    ]);
    return toEvidence({ quest, manifests }) as LegacyManifestResolutionSnapshot;
  }

  private async ensureIndexes() {
    const manifests = this.db.collection('legacyrewardmanifests');
    const commands = this.db.collection('legacyrewardresolutioncommands');
    await Promise.all([
      manifests.createIndex(
        { manifest_key: 1 },
        { name: 'uniq_legacy_reward_manifest_key', unique: true },
      ),
      manifests.createIndex(
        { quest_id: 1, reward_type: 1 },
        { name: 'uniq_legacy_reward_manifest_quest_type', unique: true },
      ),
      commands.createIndex(
        { command_key: 1 },
        { name: 'uniq_legacy_reward_resolution_command', unique: true },
      ),
    ]);
  }

  async apply(
    plan: LegacyManifestResolutionPlan,
  ): Promise<'inserted' | 'already_applied'> {
    await this.ensureIndexes();
    const questId = new ObjectId(plan.quest_id);
    const commandKey = legacyManifestResolutionCommandKey(plan.quest_id);
    const quests = this.db.collection('quests');
    const manifests = this.db.collection('legacyrewardmanifests');
    const commands = this.db.collection('legacyrewardresolutioncommands');

    const currentQuest = await quests.findOne({ _id: questId });
    if (!currentQuest)
      throw new Error('Quest disappeared before manifest apply');
    const current = toEvidence(
      currentQuest,
    ) as LegacyManifestResolutionSnapshot['quest'];
    if (
      !current ||
      legacyQuestPayoutConfigChecksum(current) !== plan.quest_config_checksum ||
      legacyManifestResolutionQuestChecksum(current) !==
        plan.quest_snapshot_checksum
    ) {
      throw new Error('Quest changed after manifest dry-run');
    }

    const existingCommandKey = String(
      currentQuest.legacy_payout_resolution_command_key ?? '',
    );
    const existingPlanChecksum = String(
      currentQuest.legacy_payout_resolution_plan_checksum ?? '',
    );
    if (
      (existingCommandKey && existingCommandKey !== commandKey) ||
      (existingPlanChecksum && existingPlanChecksum !== plan.plan_checksum)
    ) {
      throw new Error('Quest is frozen by a different resolution command');
    }

    if (!existingCommandKey) {
      const frozen = await quests.updateOne(
        {
          _id: questId,
          $and: [
            revisionClause('config_revision', plan.expected_config_revision),
            revisionClause(
              'campaign_revision',
              plan.expected_campaign_revision,
            ),
            {
              legacy_payout_reconciliation_status: {
                $in: ['pending', 'quarantined'],
              },
            },
            {
              $or: [
                { legacy_payout_resolution_command_key: { $exists: false } },
                { legacy_payout_resolution_command_key: null },
              ],
            },
          ],
        },
        {
          $set: {
            legacy_payout_resolution_command_key: commandKey,
            legacy_payout_resolution_plan_checksum: plan.plan_checksum,
            legacy_payout_config_checksum: plan.quest_config_checksum,
            legacy_payout_resolution_started_at: new Date(),
          },
        },
      );
      if (frozen.modifiedCount !== 1) {
        const winner = await quests.findOne({ _id: questId });
        if (
          winner?.legacy_payout_resolution_command_key !== commandKey ||
          winner?.legacy_payout_resolution_plan_checksum !==
            plan.plan_checksum ||
          winner?.legacy_payout_config_checksum !== plan.quest_config_checksum
        ) {
          throw new Error(
            'Quest changed or left pending/quarantined before freeze',
          );
        }
      }
    } else if (
      String(currentQuest.legacy_payout_config_checksum ?? '') !==
      plan.quest_config_checksum
    ) {
      throw new Error('Quest resolution config checksum conflicts');
    }

    const now = new Date();
    let commandInserted = false;
    try {
      const commandWrite = await commands.updateOne(
        { command_key: commandKey },
        {
          $setOnInsert: {
            command_key: commandKey,
            quest_id: questId,
            reconciliation_version: plan.reconciliation_version,
            status: 'preparing',
            plan_checksum: plan.plan_checksum,
            quest_snapshot_checksum: plan.quest_snapshot_checksum,
            quest_config_checksum: plan.quest_config_checksum,
            evidence_checksum: plan.evidence_checksum,
            expected_manifest_hashes: plan.manifests
              .map((manifest) => manifest.manifest_hash)
              .sort(),
            createdAt: now,
            updatedAt: now,
          },
        },
        { upsert: true },
      );
      commandInserted = commandWrite.upsertedCount === 1;
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
    }
    const command = toEvidence(
      await commands.findOne({ command_key: commandKey }),
    ) as Record<string, unknown> | null;
    const expectedManifestHashes = plan.manifests
      .map((manifest) => manifest.manifest_hash)
      .sort();
    if (
      !command ||
      String(command.quest_id) !== plan.quest_id ||
      command.reconciliation_version !== plan.reconciliation_version ||
      !['preparing', 'complete'].includes(String(command.status)) ||
      command.plan_checksum !== plan.plan_checksum ||
      command.quest_config_checksum !== plan.quest_config_checksum ||
      command.evidence_checksum !== plan.evidence_checksum ||
      JSON.stringify(
        [...((command.expected_manifest_hashes as string[]) ?? [])].sort(),
      ) !== JSON.stringify(expectedManifestHashes) ||
      (command.status === 'preparing' &&
        command.quest_snapshot_checksum !== plan.quest_snapshot_checksum)
    ) {
      throw new Error('Immutable manifest resolution command conflicts');
    }

    for (const manifest of plan.manifests) {
      const document = {
        manifest_key: manifest.manifest_key,
        quest_id: questId,
        reward_type: manifest.reward_type,
        reconciliation_version: manifest.reconciliation_version,
        status: manifest.status,
        manifest_hash: manifest.manifest_hash,
        quest_config_checksum: manifest.quest_config_checksum,
        reviewed_by: manifest.reviewed_by,
        review_reference: manifest.review_reference,
        resolution_evidence_checksum: manifest.resolution_evidence_checksum,
        ...(manifest.no_recipient_reason
          ? { no_recipient_reason: manifest.no_recipient_reason }
          : {}),
        recipients: manifest.recipients.map((recipient) => ({
          ...recipient,
          user_id: new ObjectId(recipient.user_id),
        })),
        createdAt: now,
        updatedAt: now,
      };
      try {
        await manifests.updateOne(
          { manifest_key: manifest.manifest_key },
          { $setOnInsert: document },
          { upsert: true },
        );
      } catch (error) {
        if ((error as { code?: number }).code !== 11000) throw error;
      }
      const persisted = toEvidence(
        await manifests.findOne({ manifest_key: manifest.manifest_key }),
      ) as ResolvedLegacyRewardManifest | undefined;
      if (!sameManifest(persisted, manifest)) {
        throw new Error(
          'Legacy reward manifest CAS conflict: immutable evidence already exists',
        );
      }
    }

    const persistedManifests = toEvidence(
      await manifests
        .find({ quest_id: { $in: [questId, plan.quest_id] } })
        .toArray(),
    ) as ResolvedLegacyRewardManifest[];
    if (!sameAppliedManifests(persistedManifests, plan.manifests)) {
      throw new Error('Manifest resolution is incomplete; readiness withheld');
    }
    const commandCompletion = await commands.updateOne(
      {
        command_key: commandKey,
        plan_checksum: plan.plan_checksum,
        status: { $in: ['preparing', 'complete'] },
      },
      {
        $set: {
          status: 'complete',
          completed_at: now,
          updatedAt: now,
        },
      },
    );
    if (commandCompletion.matchedCount !== 1) {
      throw new Error('Manifest resolution command completion fence was lost');
    }
    return commandInserted ? 'inserted' : 'already_applied';
  }
}
