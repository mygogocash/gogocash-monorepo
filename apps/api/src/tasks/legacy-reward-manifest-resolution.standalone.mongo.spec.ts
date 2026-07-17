import { MongoClient, ObjectId } from 'mongodb';
import {
  localMongoDatabaseUri,
  optionalLocalMongoUri,
} from 'src/test-support/local-mongo-uri';
import {
  buildLegacyManifestResolutionPlan,
  LEGACY_MANIFEST_COMPLETENESS_ATTESTATION,
  legacyManifestResolutionCommandKey,
  LegacyManifestResolutionEvidence,
  LegacyManifestResolutionPlan,
} from './legacy-reward-manifest-resolution';
import { MongoLegacyManifestResolutionStore } from './legacy-reward-manifest-resolution.mongo';

const baseMongoUri = optionalLocalMongoUri(
  process.env.QA_LOCAL_MONGO_STANDALONE_URI ?? process.env.QA_LOCAL_MONGO_URI,
);
const suite = baseMongoUri ? describe : describe.skip;

function evidenceFor(questId: ObjectId): LegacyManifestResolutionEvidence {
  return {
    quest_id: questId.toHexString(),
    reconciliation_version: 1,
    reviewed_by: 'finance-operator@example.test',
    review_reference: `standalone-proof/${questId.toHexString()}`,
    completeness_attestation: LEGACY_MANIFEST_COMPLETENESS_ATTESTATION,
    manifests: [
      {
        reward_type: 'rank',
        recipients: [],
        no_recipient_reason: 'Reviewed export contains no rank recipients',
      },
      {
        reward_type: 'special-next-round',
        recipients: [],
        no_recipient_reason: 'Reviewed export contains no special recipients',
      },
    ],
  };
}

function questFixture(questId: ObjectId) {
  return {
    _id: questId,
    campaign_revision: 3,
    config_revision: 7,
    reward_model: 'legacy_v1',
    start_date: new Date('2025-01-01T00:00:00.000Z'),
    end_date: new Date('2025-01-31T23:59:59.999Z'),
    status: 'close',
    reward_status: false,
    reward_distribution_mode: 'campaign_end',
    reward_distribution_delay_days: 0,
    rewards: [],
    facebook_page: '',
    facebook_post: '',
    line: '',
    legacy_payout_reconciliation_status: 'quarantined',
    legacy_payout_reconciliation_version: 1,
  };
}

async function seedPartialApply(
  client: MongoClient,
  database: string,
  plan: LegacyManifestResolutionPlan,
) {
  const db = client.db(database);
  const commandKey = legacyManifestResolutionCommandKey(plan.quest_id);
  const now = new Date();
  await db.collection('quests').updateOne(
    { _id: new ObjectId(plan.quest_id) },
    {
      $set: {
        legacy_payout_resolution_command_key: commandKey,
        legacy_payout_resolution_plan_checksum: plan.plan_checksum,
        legacy_payout_config_checksum: plan.quest_config_checksum,
        legacy_payout_resolution_started_at: now,
      },
    },
  );
  await db.collection('legacyrewardresolutioncommands').insertOne({
    command_key: commandKey,
    quest_id: new ObjectId(plan.quest_id),
    reconciliation_version: 1,
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
  });
  const manifest = plan.manifests[0];
  await db.collection('legacyrewardmanifests').insertOne({
    ...manifest,
    _id: new ObjectId(),
    quest_id: new ObjectId(plan.quest_id),
    createdAt: now,
    updatedAt: now,
  });
}

suite('legacy manifest resolution — real standalone Mongo', () => {
  jest.setTimeout(30_000);

  const database = `legacy_manifest_standalone_${process.pid}_${Date.now()}`;
  const mongoUri = baseMongoUri
    ? localMongoDatabaseUri(baseMongoUri, database)
    : '';
  let client: MongoClient;

  beforeAll(async () => {
    client = await MongoClient.connect(mongoUri);
  });

  afterAll(async () => {
    if (client) {
      await client.db(database).dropDatabase();
      await client.close();
    }
  });

  it('coalesces concurrent applies without a transaction and reruns as a no-op', async () => {
    const questId = new ObjectId();
    const db = client.db(database);
    await db.collection('quests').insertOne(questFixture(questId));
    const store = new MongoLegacyManifestResolutionStore(db);
    const plan = buildLegacyManifestResolutionPlan(
      evidenceFor(questId),
      await store.readSnapshot(questId.toHexString()),
    );

    const outcomes = await Promise.all(
      Array.from({ length: 8 }, () => store.apply(plan)),
    );
    const rerunSnapshot = await store.readSnapshot(questId.toHexString());
    const rerunPlan = buildLegacyManifestResolutionPlan(
      evidenceFor(questId),
      rerunSnapshot,
    );
    const rerun = await store.apply(rerunPlan);
    const command = await db
      .collection('legacyrewardresolutioncommands')
      .findOne({
        command_key: legacyManifestResolutionCommandKey(questId.toHexString()),
      });

    expect(outcomes.filter((outcome) => outcome === 'inserted')).toHaveLength(
      1,
    );
    expect(
      outcomes.filter((outcome) => outcome === 'already_applied'),
    ).toHaveLength(7);
    expect(rerun).toBe('already_applied');
    expect(rerunSnapshot.manifests).toHaveLength(2);
    expect(command).toMatchObject({
      status: 'complete',
      plan_checksum: plan.plan_checksum,
      quest_config_checksum: plan.quest_config_checksum,
    });
  });

  it('recovers a frozen command with only one persisted manifest', async () => {
    const questId = new ObjectId();
    const db = client.db(database);
    await db.collection('quests').insertOne(questFixture(questId));
    const store = new MongoLegacyManifestResolutionStore(db);
    const evidence = evidenceFor(questId);
    const plan = buildLegacyManifestResolutionPlan(
      evidence,
      await store.readSnapshot(questId.toHexString()),
    );
    await seedPartialApply(client, database, plan);

    const recoveryPlan = buildLegacyManifestResolutionPlan(
      evidence,
      await store.readSnapshot(questId.toHexString()),
    );
    await expect(store.apply(recoveryPlan)).resolves.toBe('already_applied');

    const manifests = await db
      .collection('legacyrewardmanifests')
      .find({ quest_id: questId })
      .toArray();
    const command = await db
      .collection('legacyrewardresolutioncommands')
      .findOne({
        command_key: legacyManifestResolutionCommandKey(questId.toHexString()),
      });
    expect(manifests).toHaveLength(2);
    expect(command?.status).toBe('complete');
    expect(command?.expected_manifest_hashes).toEqual(
      plan.manifests.map((manifest) => manifest.manifest_hash).sort(),
    );
  });

  it('fails closed on a corrupted preparing command without inserting the missing manifest', async () => {
    const questId = new ObjectId();
    const db = client.db(database);
    await db.collection('quests').insertOne(questFixture(questId));
    const store = new MongoLegacyManifestResolutionStore(db);
    const evidence = evidenceFor(questId);
    const plan = buildLegacyManifestResolutionPlan(
      evidence,
      await store.readSnapshot(questId.toHexString()),
    );
    await seedPartialApply(client, database, plan);
    await db.collection('legacyrewardresolutioncommands').updateOne(
      {
        command_key: legacyManifestResolutionCommandKey(questId.toHexString()),
      },
      { $set: { expected_manifest_hashes: ['tampered'] } },
    );
    const recoveryPlan = buildLegacyManifestResolutionPlan(
      evidence,
      await store.readSnapshot(questId.toHexString()),
    );

    await expect(store.apply(recoveryPlan)).rejects.toThrow(
      /resolution command conflicts/i,
    );
    await expect(
      db
        .collection('legacyrewardmanifests')
        .countDocuments({ quest_id: questId }),
    ).resolves.toBe(1);
  });
});
