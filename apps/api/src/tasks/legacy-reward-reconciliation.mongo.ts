import { Collection, Db, ObjectId } from 'mongodb';
import {
  LegacyRewardBackfillOperation,
  LegacyRewardCollection,
  LegacyRewardReconciliationSnapshot,
  LegacyRewardReconciliationStore,
} from './legacy-reward-reconciliation';

const COLLECTION_NAMES: Record<LegacyRewardCollection, string> = {
  quests: 'quests',
  points: 'points',
  conversions: 'conversions',
  socialrewards: 'socialrewards',
};

function mongoId(value: string): string | ObjectId {
  return ObjectId.isValid(value) ? new ObjectId(value) : value;
}

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

function collection(db: Db, name: LegacyRewardCollection): Collection {
  return db.collection(COLLECTION_NAMES[name]);
}

function mongoFieldValue(
  collectionName: LegacyRewardCollection,
  field: string,
  value: unknown,
) {
  if (
    field === 'user_id' &&
    ['points', 'conversions', 'socialrewards'].includes(collectionName) &&
    typeof value === 'string' &&
    ObjectId.isValid(value)
  ) {
    return new ObjectId(value);
  }
  return value;
}

export class MongoLegacyRewardReconciliationStore implements LegacyRewardReconciliationStore {
  constructor(private readonly db: Db) {}

  async readSnapshot(): Promise<LegacyRewardReconciliationSnapshot> {
    const [
      quests,
      points,
      conversions,
      socialRewards,
      rewardLists,
      manifests,
      resolutionCommands,
    ] = await Promise.all([
      this.db.collection('quests').find({}).toArray(),
      this.db
        .collection('points')
        .find({
          type: 'add',
          $or: [
            { action: 'purchase' },
            { action: 'referral' },
            { action: 'special_point_quest' },
            { action: { $regex: '^reward_quest_social:' } },
          ],
        })
        .toArray(),
      this.db
        .collection('conversions')
        .find({
          $or: [
            { offer_name: 'reward_conversion_quest' },
            { conversion_id: { $exists: true } },
          ],
        })
        .toArray(),
      this.db.collection('socialrewards').find({}).toArray(),
      this.db.collection('rewardlists').find({ name: 'quest' }).toArray(),
      this.db.collection('legacyrewardmanifests').find({}).toArray(),
      this.db.collection('legacyrewardresolutioncommands').find({}).toArray(),
    ]);

    return toEvidence({
      quests,
      points,
      conversions,
      socialRewards,
      rewardLists,
      manifests,
      resolutionCommands,
    }) as LegacyRewardReconciliationSnapshot;
  }

  async compareAndSet(operation: LegacyRewardBackfillOperation) {
    const filter: Record<string, unknown> = { _id: mongoId(operation.id) };
    for (const [field, expected] of Object.entries(operation.expected)) {
      filter[field] =
        expected === undefined
          ? { $exists: false }
          : mongoFieldValue(operation.collection, field, expected);
    }
    const set: Record<string, unknown> = {};
    const unset: Record<string, ''> = {};
    for (const [field, value] of Object.entries(operation.set)) {
      if (value === undefined) unset[field] = '';
      else set[field] = mongoFieldValue(operation.collection, field, value);
    }
    const update: Record<string, unknown> = {};
    if (Object.keys(set).length) update.$set = set;
    if (Object.keys(unset).length) update.$unset = unset;
    const result = await collection(this.db, operation.collection).updateOne(
      filter,
      update,
    );
    return result.modifiedCount === 1;
  }

  async ensureIndexes() {
    return Promise.all([
      this.db.collection('points').createIndex(
        { idempotency_key: 1 },
        {
          name: 'uniq_point_idempotency_key',
          unique: true,
          partialFilterExpression: {
            idempotency_key: { $type: 'string', $gt: '' },
          },
        },
      ),
      this.db.collection('conversions').createIndex(
        { quest_payout_key: 1 },
        {
          name: 'uniq_conversion_quest_payout_key',
          unique: true,
          partialFilterExpression: {
            quest_payout_key: { $type: 'string', $gt: '' },
          },
        },
      ),
      this.db.collection('socialrewards').createIndex(
        { legacy_payout_key: 1 },
        {
          name: 'uniq_social_reward_legacy_payout_key',
          unique: true,
          partialFilterExpression: {
            legacy_payout_key: { $type: 'string', $gt: '' },
          },
        },
      ),
      this.db
        .collection('legacyrewardmanifests')
        .createIndex(
          { manifest_key: 1 },
          { name: 'uniq_legacy_reward_manifest_key', unique: true },
        ),
      this.db.collection('legacyrewardmanifests').createIndex(
        { quest_id: 1, reward_type: 1 },
        {
          name: 'uniq_legacy_reward_manifest_quest_type',
          unique: true,
        },
      ),
      this.db.collection('legacyrewardresolutioncommands').createIndex(
        { command_key: 1 },
        {
          name: 'uniq_legacy_reward_resolution_command',
          unique: true,
        },
      ),
    ]);
  }
}
