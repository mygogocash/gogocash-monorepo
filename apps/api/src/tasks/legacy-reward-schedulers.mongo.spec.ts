import type { Db } from 'mongodb';
import mongoose, { Connection, Model, Types } from 'mongoose';
import { PointService } from 'src/point/point.service';
import { Point, PointSchema } from 'src/point/schemas/point.schema';
import { Quest, QuestSchema } from 'src/point/schemas/quest.schema';
import {
  buildLegacyManifestResolutionPlan,
  LEGACY_MANIFEST_COMPLETENESS_ATTESTATION,
  LegacyManifestResolutionEvidence,
} from './legacy-reward-manifest-resolution';
import { MongoLegacyManifestResolutionStore } from './legacy-reward-manifest-resolution.mongo';
import {
  SocialReward,
  SocialRewardSchema,
} from 'src/point/schemas/social-reward.schema';
import {
  localMongoDatabaseUri,
  optionalLocalMongoUri,
} from 'src/test-support/local-mongo-uri';
import {
  Conversion,
  ConversionSchema,
} from 'src/withdraw/schemas/conversion.schema';
import { WithdrawService } from 'src/withdraw/withdraw.service';
import {
  legacyRankPayoutKey,
  legacySocialPayoutKey,
  legacySpecialPointKey,
} from './legacy-reward-identity';
import {
  legacyQuestPayoutConfigChecksum,
  legacyRewardManifestHash,
  legacyRewardManifestKey,
} from './legacy-reward-manifest';
import {
  LegacyRewardManifestRecord,
  LegacyRewardManifestSchema,
} from './schemas/legacy-reward-manifest.schema';
import { TasksService } from './tasks.service';

const baseMongoUri = optionalLocalMongoUri(process.env.QA_LOCAL_MONGO_URI);
const suite =
  baseMongoUri && process.env.MONGO_REPLICA_SET === '1'
    ? describe
    : describe.skip;

function conversionFixture(conversionId: number) {
  return {
    conversion_id: conversionId,
    offer_id: 0,
    offer_name: 'legacy-unkeyed',
    merchant_id: 0,
    source: 'involve',
    conversion_status: 'approved',
    datetime_conversion: new Date(),
    currency: 'THB',
    sale_amount: 0,
    payout: 1,
  };
}

suite('legacy reward schedulers — real Mongo rs0 concurrency', () => {
  jest.setTimeout(30_000);

  const database = `legacy_reward_race_${process.pid}_${Date.now()}`;
  const mongoUri = baseMongoUri
    ? localMongoDatabaseUri(baseMongoUri, database)
    : '';
  let connection: Connection;
  let pointModel: Model<Point>;
  let questModel: Model<Quest>;
  let socialRewardModel: Model<SocialReward>;
  let conversionModel: Model<Conversion>;
  let manifestModel: Model<LegacyRewardManifestRecord>;

  beforeAll(async () => {
    connection = await mongoose.createConnection(mongoUri).asPromise();
    pointModel = connection.model('LegacyRacePoint', PointSchema, 'points');
    questModel = connection.model('LegacyRaceQuest', QuestSchema, 'quests');
    socialRewardModel = connection.model(
      'LegacyRaceSocialReward',
      SocialRewardSchema,
      'socialrewards',
    );
    conversionModel = connection.model(
      'LegacyRaceConversion',
      ConversionSchema,
      'conversions',
    );
    manifestModel = connection.model(
      'LegacyRaceManifest',
      LegacyRewardManifestSchema,
      'legacyrewardmanifests',
    );
    await Promise.all([
      pointModel.createIndexes(),
      questModel.createIndexes(),
      socialRewardModel.createIndexes(),
      conversionModel.createIndexes(),
      manifestModel.createIndexes(),
    ]);
  });

  afterAll(async () => {
    if (connection) {
      await connection.dropDatabase();
      await connection.close();
    }
  });

  it('keeps historical unkeyed rows legal while every durable payout key rejects duplicates', async () => {
    const users = Array.from({ length: 6 }, () => new Types.ObjectId());
    const questId = new Types.ObjectId();

    await pointModel.collection.insertMany(
      users.slice(0, 3).map((userId, index) => ({
        user_id: userId,
        conversion_id: index,
        point: 10,
        type: 'add',
        action: 'legacy-unkeyed',
      })),
    );
    await socialRewardModel.collection.insertMany(
      users.slice(0, 3).map((userId) => ({
        user_id: userId,
        quest_id: questId,
        reward_status: false,
        type: 'facebook',
        action: 'share',
      })),
    );
    await conversionModel.collection.insertMany(
      [101, 102, 103].map((conversionId) => conversionFixture(conversionId)),
    );

    const pointKey = 'legacy:test:point-key';
    const socialKey = 'legacy:test:social-key';
    const rankKey = 'legacy:test:rank-key';
    await pointModel.collection.insertOne({
      user_id: users[3],
      conversion_id: 0,
      point: 10,
      type: 'add',
      action: 'keyed',
      idempotency_key: pointKey,
    });
    await socialRewardModel.collection.insertOne({
      user_id: users[4],
      quest_id: questId,
      reward_status: false,
      type: 'line',
      action: 'follow',
      legacy_payout_key: socialKey,
    });
    await conversionModel.collection.insertOne({
      ...conversionFixture(104),
      quest_payout_key: rankKey,
    });

    const duplicateCodes: number[] = [];
    for (const write of [
      pointModel.collection.insertOne({
        user_id: users[4],
        conversion_id: 0,
        point: 99,
        type: 'add',
        action: 'duplicate',
        idempotency_key: pointKey,
      }),
      socialRewardModel.collection.insertOne({
        user_id: users[5],
        quest_id: questId,
        reward_status: false,
        type: 'line',
        action: 'follow',
        legacy_payout_key: socialKey,
      }),
      conversionModel.collection.insertOne({
        ...conversionFixture(105),
        quest_payout_key: rankKey,
      }),
    ]) {
      await write.catch((error: { code?: number }) => {
        duplicateCodes.push(Number(error.code));
      });
    }

    const evidence = {
      unkeyed_points: await pointModel.countDocuments({
        idempotency_key: { $exists: false },
      }),
      unkeyed_social_rewards: await socialRewardModel.countDocuments({
        legacy_payout_key: { $exists: false },
      }),
      unkeyed_conversions: await conversionModel.countDocuments({
        quest_payout_key: { $exists: false },
      }),
      duplicate_key_rejections: duplicateCodes,
    };
    process.stdout.write(
      `legacy-reward-rs0-index-evidence ${JSON.stringify(evidence)}\n`,
    );
    expect(evidence).toEqual({
      unkeyed_points: 3,
      unkeyed_social_rewards: 3,
      unkeyed_conversions: 3,
      duplicate_key_rejections: [11000, 11000, 11000],
    });
  });

  it('coalesces simultaneous rank, social, and special-point workers to one effect each', async () => {
    const now = Date.now();
    const questId = new Types.ObjectId();
    const questConfig = {
      _id: questId,
      campaign_revision: 1,
      config_revision: 1,
      reward_model: 'legacy_v1' as const,
      timezone: 'Asia/Bangkok' as const,
      audience: { kind: 'all' as const, tier_ids: [] },
      reward_caps: {
        max_awards_per_user: null,
        max_referrals_per_user: null,
      },
      start_date: new Date(now - 60_000),
      end_date: new Date(now + 60_000),
      status: 'close',
      reward_status: false,
      reward_distribution_mode: 'campaign_end' as const,
      reward_distribution_delay_days: 0,
      rewards: [{ rank: 1, reward: 1200, currency: 'THB' }],
      facebook_post: 'https://facebook.example.test/posts/quest',
      legacy_payout_reconciliation_status: 'ready' as const,
      legacy_payout_reconciliation_version: 1,
    };
    const questConfigChecksum = legacyQuestPayoutConfigChecksum(questConfig);
    const quest = await questModel.create({
      ...questConfig,
      legacy_payout_config_checksum: questConfigChecksum,
    });
    if (!quest) throw new Error('Failed to create concurrency quest');
    const rankUser = new Types.ObjectId();
    const specialUser = new Types.ObjectId();
    const socialUser = new Types.ObjectId();
    const rankRecipients = [
      {
        user_id: rankUser.toHexString(),
        payout_key: legacyRankPayoutKey(quest._id, rankUser, 1),
        amount: 1200,
        rank: 1,
        currency: 'THB',
      },
    ];
    const specialRecipients = [
      {
        user_id: specialUser.toHexString(),
        payout_key: legacySpecialPointKey(quest._id, specialUser),
        amount: 80,
      },
    ];
    await manifestModel.create([
      {
        manifest_key: legacyRewardManifestKey(quest._id, 'rank'),
        quest_id: quest._id,
        reward_type: 'rank',
        reconciliation_version: 1,
        status: 'ready',
        recipients: rankRecipients,
        quest_config_checksum: questConfigChecksum,
        manifest_hash: legacyRewardManifestHash(
          quest._id,
          'rank',
          1,
          rankRecipients,
          undefined,
          questConfigChecksum,
        ),
      },
      {
        manifest_key: legacyRewardManifestKey(quest._id, 'special-next-round'),
        quest_id: quest._id,
        reward_type: 'special-next-round',
        reconciliation_version: 1,
        status: 'ready',
        recipients: specialRecipients,
        quest_config_checksum: questConfigChecksum,
        manifest_hash: legacyRewardManifestHash(
          quest._id,
          'special-next-round',
          1,
          specialRecipients,
          undefined,
          questConfigChecksum,
        ),
      },
    ]);

    const pointService = Object.create(PointService.prototype) as any;
    pointService.pointModel = pointModel;
    pointService.questModel = questModel;
    pointService.socialRewardModel = socialRewardModel;
    const specialService = Object.create(TasksService.prototype) as any;
    specialService.questModel = questModel;
    specialService.pointService = pointService;
    const rankService = Object.create(WithdrawService.prototype) as any;
    rankService.questModel = questModel;
    rankService.conversionModel = conversionModel;

    const workers = 8;
    const rankWorkers = Array.from({ length: workers }, () =>
      rankService.adminAddRewardConversionForQuest(),
    );
    const specialWorkers = Array.from({ length: workers }, () =>
      specialService.getSpacialPointNextRound(),
    );
    const socialWorkers = Array.from({ length: workers }, async () => {
      const socialReward = await pointService.questSocial(
        socialUser.toHexString(),
        'facebook',
        'like',
      );
      return pointService.updateQuestSocial(
        socialUser.toHexString(),
        String(socialReward._id),
      );
    });
    await Promise.all([...rankWorkers, ...specialWorkers, ...socialWorkers]);

    const specialKey = legacySpecialPointKey(quest._id, specialUser);
    const socialKey = legacySocialPayoutKey(
      quest._id,
      socialUser,
      'facebook',
      'like',
    );
    const rankKey = legacyRankPayoutKey(quest._id, rankUser, 1);
    const completedQuest = await questModel.findById(quest._id).lean();
    const evidence = {
      workers_per_reward: workers,
      special_point_effects: await pointModel.countDocuments({
        idempotency_key: specialKey,
      }),
      social_point_effects: await pointModel.countDocuments({
        idempotency_key: socialKey,
      }),
      social_reward_rows: await socialRewardModel.countDocuments({
        legacy_payout_key: socialKey,
      }),
      rank_conversion_effects: await conversionModel.countDocuments({
        quest_payout_key: rankKey,
      }),
      special_completed: Boolean(
        completedQuest?.legacy_special_point_completed_at,
      ),
      rank_completed: Boolean(completedQuest?.legacy_rank_payout_completed_at),
    };
    process.stdout.write(
      `legacy-reward-rs0-worker-evidence ${JSON.stringify(evidence)}\n`,
    );
    expect(evidence).toEqual({
      workers_per_reward: 8,
      special_point_effects: 1,
      social_point_effects: 1,
      social_reward_rows: 1,
      rank_conversion_effects: 1,
      special_completed: true,
      rank_completed: true,
    });
  });

  it('CAS-inserts both reviewed manifests once and makes concurrent resolver retries no-ops', async () => {
    const quest = await questModel.create({
      campaign_revision: 1,
      config_revision: 1,
      reward_model: 'legacy_v1',
      timezone: 'Asia/Bangkok',
      audience: { kind: 'all', tier_ids: [] },
      reward_caps: {
        max_awards_per_user: null,
        max_referrals_per_user: null,
      },
      start_date: new Date('2025-01-01T00:00:00.000Z'),
      end_date: new Date('2025-01-31T23:59:59.999Z'),
      status: 'close',
      reward_status: false,
      reward_distribution_mode: 'campaign_end',
      reward_distribution_delay_days: 0,
      rewards: [],
      legacy_payout_reconciliation_status: 'quarantined',
      legacy_payout_reconciliation_version: 1,
    });
    const reviewedEvidence: LegacyManifestResolutionEvidence = {
      quest_id: quest._id.toString(),
      reconciliation_version: 1,
      reviewed_by: 'finance-operator@example.test',
      review_reference: 'incident/legacy-empty-round-17',
      completeness_attestation: LEGACY_MANIFEST_COMPLETENESS_ATTESTATION,
      manifests: [
        {
          reward_type: 'rank',
          recipients: [],
          no_recipient_reason:
            'Reviewed payout export proves this round had no rank recipients',
        },
        {
          reward_type: 'special-next-round',
          recipients: [],
          no_recipient_reason:
            'Reviewed payout export proves this round had no special recipients',
        },
      ],
    };
    const store = new MongoLegacyManifestResolutionStore(
      connection.db as unknown as Db,
    );
    const plan = buildLegacyManifestResolutionPlan(
      reviewedEvidence,
      await store.readSnapshot(quest._id.toString()),
    );

    const outcomes = await Promise.all(
      Array.from({ length: 6 }, () => store.apply(plan)),
    );
    const manifestCount = await manifestModel.countDocuments({
      quest_id: quest._id,
    });
    const evidence = {
      concurrent_resolvers: outcomes.length,
      inserted: outcomes.filter((outcome) => outcome === 'inserted').length,
      already_applied: outcomes.filter(
        (outcome) => outcome === 'already_applied',
      ).length,
      manifest_rows: manifestCount,
    };
    process.stdout.write(
      `legacy-reward-rs0-manifest-cas-evidence ${JSON.stringify(evidence)}\n`,
    );
    expect(evidence).toEqual({
      concurrent_resolvers: 6,
      inserted: 1,
      already_applied: 5,
      manifest_rows: 2,
    });
  });
});
