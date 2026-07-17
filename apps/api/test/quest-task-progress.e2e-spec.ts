import { spawn, ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { INestApplication } from '@nestjs/common';
import {
  getConnectionToken,
  getModelToken,
  MongooseModule,
} from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Db, MongoClient } from 'mongodb';
import { Connection, Model, Types } from 'mongoose';

import { AccountRegistrationService } from '../src/quest-task-engine/account-registration.service';
import { QuestConversionLifecycleService } from '../src/quest-task-engine/conversion-lifecycle.service';
import {
  QuestEngineFailureInjectionHook,
  QuestEngineFailureStage,
} from '../src/quest-task-engine/quest-engine-failure-injection.hook';
import {
  QUEST_FX_RATE_PROVIDER,
  QuestFxRateProvider,
} from '../src/quest-task-engine/quest-fx-rate.provider';
import { QuestOutboxConsumerService } from '../src/quest-task-engine/quest-outbox-consumer.service';
import { QuestRevisionFenceService } from '../src/quest-task-engine/quest-revision-fence.service';
import { QuestTaskProgressService } from '../src/quest-task-engine/quest-task-progress.service';
import { QuestTaskStateInspectorService } from '../src/quest-task-engine/quest-task-state-inspector.service';
import { migrateQuestTaskIndexes } from '../src/quest-task-engine/quest-task-index.migration';
import { QuestTaskTransactionService } from '../src/quest-task-engine/quest-task-transaction.service';
import {
  QuestAccountTransition,
  QuestAccountTransitionSchema,
} from '../src/quest-task-engine/schemas/quest-account-transition.schema';
import {
  QuestContribution,
  QuestContributionSchema,
} from '../src/quest-task-engine/schemas/quest-contribution.schema';
import {
  QuestConversionQuarantine,
  QuestConversionQuarantineSchema,
} from '../src/quest-task-engine/schemas/quest-conversion-quarantine.schema';
import {
  QuestConversionState,
  QuestConversionStateSchema,
} from '../src/quest-task-engine/schemas/quest-conversion-state.schema';
import {
  QuestConversionTransition,
  QuestConversionTransitionSchema,
} from '../src/quest-task-engine/schemas/quest-conversion-transition.schema';
import {
  QuestEventIngestion,
  QuestEventIngestionSchema,
} from '../src/quest-task-engine/schemas/quest-event-ingestion.schema';
import {
  QuestOutbox,
  QuestOutboxDocument,
  QuestOutboxSchema,
} from '../src/quest-task-engine/schemas/quest-outbox.schema';
import {
  QuestTaskProgress,
  QuestTaskProgressSchema,
} from '../src/quest-task-engine/schemas/quest-task-progress.schema';
import {
  QuestSourceConfigFence,
  QuestSourceConfigFenceSchema,
} from '../src/quest-task-engine/schemas/quest-source-config-fence.schema';
import { Point, PointSchema } from '../src/point/schemas/point.schema';
import { Quest, QuestSchema } from '../src/point/schemas/quest.schema';
import { Offer, OfferSchema } from '../src/offer/schemas/offer.schema';
import {
  localMongoDatabaseUri,
  optionalLocalMongoUri,
} from '../src/test-support/local-mongo-uri';
import { User, UserSchema } from '../src/user/schemas/user.schema';
import {
  Conversion,
  ConversionSchema,
} from '../src/withdraw/schemas/conversion.schema';
import {
  Membership,
  MembershipSchema,
} from '../src/admin/membership/schemas/membership.schema';
import {
  MembershipTier,
  MembershipTierSchema,
} from '../src/admin/membership/schemas/membership-tier.schema';
import { MembershipService } from '../src/admin/membership/membership.service';

jest.setTimeout(120_000);

const DEFAULT_MONGOD =
  '/Users/kunanonjarat/.cache/mongodb-binaries/mongod-arm64-darwin-8.2.6';
const MONGOD_BINARY = process.env.MONGOD_BINARY ?? DEFAULT_MONGOD;
const EXTERNAL_RS_REQUESTED = process.env.MONGO_REPLICA_SET === '1';
const EXTERNAL_MONGO_URI = optionalLocalMongoUri(
  process.env.QA_LOCAL_MONGO_URI ?? process.env.MONGO_URI,
);
const suite =
  EXTERNAL_RS_REQUESTED || existsSync(MONGOD_BINARY) ? describe : describe.skip;

class OneShotFailureHook extends QuestEngineFailureInjectionHook {
  stage?: QuestEngineFailureStage;

  override async afterStage(stage: QuestEngineFailureStage): Promise<void> {
    if (this.stage !== stage) return;
    this.stage = undefined;
    throw new Error(`Injected quest failure at ${stage}`);
  }
}

class TestFxProvider implements QuestFxRateProvider {
  unavailable = new Set<string>();
  calls: Array<{ currency: string; at: Date }> = [];

  async quoteToThb(currency: string, at: Date) {
    this.calls.push({ currency, at });
    if (this.unavailable.has(currency)) return null;
    return { rate: currency === 'USD' ? 35 : 1, as_of: at, source: 'e2e' };
  }
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function freePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return port;
}

async function waitForMongo(uri: string): Promise<MongoClient> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const client = new MongoClient(uri, {
      directConnection: true,
      serverSelectionTimeoutMS: 500,
    });
    try {
      await client.connect();
      return client;
    } catch (error) {
      lastError = error;
      await client.close().catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw lastError;
}

async function waitForPrimary(uri: string): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const client = new MongoClient(uri, {
      directConnection: true,
      serverSelectionTimeoutMS: 1_000,
    });
    try {
      await client.connect();
      const hello = await client.db('admin').command({ hello: 1 });
      if (hello.isWritablePrimary === true) return;
    } catch {
      // Election is still converging.
    } finally {
      await client.close().catch(() => undefined);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('MongoDB rs0 did not elect a primary.');
}

async function waitForProcessExit(
  childProcess: ChildProcess,
  timeoutMs: number,
): Promise<boolean> {
  if (childProcess.exitCode !== null || childProcess.signalCode !== null) {
    return true;
  }
  return new Promise<boolean>((resolve) => {
    let settled = false;
    let timer: NodeJS.Timeout | undefined;
    const finish = (exited: boolean) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      childProcess.off('exit', onExit);
      resolve(exited);
    };
    const onExit = () => finish(true);
    childProcess.once('exit', onExit);
    timer = setTimeout(() => finish(false), timeoutMs);
    if (childProcess.exitCode !== null || childProcess.signalCode !== null) {
      finish(true);
    }
  });
}

async function stopMongoProcess(childProcess: ChildProcess): Promise<void> {
  if (childProcess.exitCode !== null || childProcess.signalCode !== null)
    return;
  const gracefulExit = waitForProcessExit(childProcess, 30_000);
  childProcess.kill('SIGTERM');
  if (await gracefulExit) return;

  const forcedExit = waitForProcessExit(childProcess, 5_000);
  childProcess.kill('SIGKILL');
  if (!(await forcedExit)) {
    throw new Error('MongoDB test process did not exit after SIGKILL.');
  }
}

suite('Quest task-v2 — real MongoDB 8 rs0', () => {
  let app: INestApplication;
  let connection: Connection;
  let mongoProcess: ChildProcess;
  let mongoDir: string;
  let mongoLog = '';
  let registration: AccountRegistrationService;
  let lifecycle: QuestConversionLifecycleService;
  let consumer: QuestOutboxConsumerService;
  let progress: QuestTaskProgressService;
  let membershipService: MembershipService;
  let stateInspector: QuestTaskStateInspectorService;
  let revisionFence: QuestRevisionFenceService;
  let failureHook: OneShotFailureHook;
  let fx: TestFxProvider;
  let userModel: Model<User>;
  let membershipModel: Model<Membership>;
  let membershipTierModel: Model<MembershipTier>;
  let pointModel: Model<Point>;
  let questModel: Model<Quest>;
  let outboxModel: Model<QuestOutboxDocument>;
  let ingestionModel: Model<QuestEventIngestion>;
  let progressModel: Model<QuestTaskProgress>;
  let contributionModel: Model<QuestContribution>;
  let conversionStateModel: Model<QuestConversionState>;
  let conversionModel: Model<Conversion>;
  let sourceConfigFenceModel: Model<QuestSourceConfigFence>;

  async function processEvent(sourceEventId: string) {
    const session = await connection.startSession();
    try {
      await session.withTransaction(async () => {
        const outbox = await outboxModel.findOne(
          { source_event_id: sourceEventId },
          null,
          { session },
        );
        if (!outbox) throw new Error(`Missing outbox ${sourceEventId}`);
        await progress.applyOutboxInSession(outbox, session);
        await outboxModel.updateOne(
          { _id: outbox._id },
          { $set: { status: 'completed', completed_at: new Date() } },
          { session },
        );
      });
    } finally {
      await session.endSession();
    }
  }

  async function prepareTaskV2Database() {
    const database = connection.db as unknown as Db;
    const report = await migrateQuestTaskIndexes(database, {
      apply: true,
    });
    expect(report).toMatchObject({
      task_v2_indexes_ready: true,
      canonical_fence_ready: true,
      missing_task_v2_indexes: [],
    });
  }

  async function createQuest(
    tasks: Array<Record<string, unknown>>,
    options: {
      start?: Date;
      end?: Date;
      caps?: Record<string, number | null>;
      audience?: { kind: 'all' | 'membership_tiers'; tier_ids: string[] };
    } = {},
  ) {
    return questModel.create({
      campaign_revision: 0,
      config_revision: 0,
      reward_model: 'task_v2',
      timezone: 'Asia/Bangkok',
      audience: options.audience ?? { kind: 'all', tier_ids: [] },
      reward_caps: {
        max_awards_per_user: null,
        max_referrals_per_user: null,
        ...options.caps,
      },
      start_date: options.start ?? new Date('2026-07-01T00:00:00.000Z'),
      end_date: options.end ?? new Date('2026-07-31T16:59:59.999Z'),
      status: 'open',
      reward_status: false,
      tasks,
    });
  }

  function referralTask(
    taskKey: string,
    completionRule: 'account_created' | 'first_earning_conversion',
    points = 100,
  ) {
    return {
      task_key: taskKey,
      task_type: 'friend_referral',
      completion_rule: completionRule,
      points,
      sort_order: 0,
      enabled: true,
      wording: 'Refer a friend',
      wording_en: 'Refer a friend',
      wording_th: 'ชวนเพื่อน',
      notes: '',
    };
  }

  function spendTask(taskKey: string, points = 65) {
    return {
      task_key: taskKey,
      task_type: 'spend_target',
      spend_scope: 'any_shop_via_ggc',
      target_thb_minor: 10_000,
      points,
      sort_order: 0,
      enabled: true,
      wording: 'Spend',
      wording_en: 'Spend',
      wording_th: 'ใช้จ่าย',
      notes: '',
    };
  }

  function conversionInput(
    userId: Types.ObjectId,
    conversionId: number,
    status: string,
    overrides: Record<string, unknown> = {},
  ) {
    return {
      conversion_id: conversionId,
      provider_conversion_id: String(conversionId),
      source: 'involve',
      provider_account: 'e2e',
      offer_id: 10,
      offer_name: 'E2E Shop',
      merchant_id: 20,
      user_id: userId,
      aff_sub1: `user_id:${userId.toHexString()}`,
      conversion_status: status,
      datetime_conversion: new Date('2026-07-17T01:00:00.000Z'),
      currency: 'THB',
      sale_amount: 100,
      payout: 5,
      ...overrides,
    };
  }

  beforeAll(async () => {
    process.env.QUEST_TASK_V2_ENABLED = 'true';
    const database = `quest_task_v2_${process.pid}_${Date.now()}`;
    let uri: string;
    if (EXTERNAL_RS_REQUESTED) {
      if (!EXTERNAL_MONGO_URI) {
        throw new Error(
          'MONGO_REPLICA_SET=1 requires a loopback QA_LOCAL_MONGO_URI or MONGO_URI; refusing to skip required rs0 proof.',
        );
      }
      const bootstrap = new MongoClient(EXTERNAL_MONGO_URI, {
        serverSelectionTimeoutMS: 5_000,
      });
      await bootstrap.connect();
      try {
        const hello = await bootstrap.db('admin').command({ hello: 1 });
        expect(hello.setName).toBe('rs0');
        const buildInfo = await bootstrap.db('admin').command({ buildInfo: 1 });
        expect(String(buildInfo.version)).toMatch(/^8\./);
      } finally {
        await bootstrap.close();
      }
      uri = localMongoDatabaseUri(EXTERNAL_MONGO_URI, database);
    } else {
      const port = await freePort();
      mongoDir = await mkdtemp(join(tmpdir(), 'gogocash-quest-rs0-'));
      mongoProcess = spawn(MONGOD_BINARY, [
        '--dbpath',
        mongoDir,
        '--port',
        String(port),
        '--bind_ip',
        '127.0.0.1',
        '--replSet',
        'rs0',
        '--oplogSize',
        '128',
        '--quiet',
      ]);
      mongoProcess.stdout?.on('data', (chunk) => {
        mongoLog += String(chunk);
      });
      mongoProcess.stderr?.on('data', (chunk) => {
        mongoLog += String(chunk);
      });
      const directUri = `mongodb://127.0.0.1:${port}/admin`;
      const bootstrap = await waitForMongo(directUri);
      try {
        const buildInfo = await bootstrap.db('admin').command({ buildInfo: 1 });
        expect(buildInfo.version).toBe('8.2.6');
        await bootstrap.db('admin').command({
          replSetInitiate: {
            _id: 'rs0',
            members: [{ _id: 0, host: `127.0.0.1:${port}` }],
          },
        });
      } finally {
        await bootstrap.close();
      }
      await waitForPrimary(directUri);
      uri = `mongodb://127.0.0.1:${port}/${database}?replicaSet=rs0`;
    }
    failureHook = new OneShotFailureHook();
    fx = new TestFxProvider();
    const moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri, { autoIndex: true }),
        MongooseModule.forFeature([
          { name: User.name, schema: UserSchema },
          { name: Membership.name, schema: MembershipSchema },
          { name: MembershipTier.name, schema: MembershipTierSchema },
          { name: Point.name, schema: PointSchema },
          { name: Quest.name, schema: QuestSchema },
          { name: Offer.name, schema: OfferSchema },
          { name: Conversion.name, schema: ConversionSchema },
          {
            name: QuestAccountTransition.name,
            schema: QuestAccountTransitionSchema,
          },
          {
            name: QuestConversionTransition.name,
            schema: QuestConversionTransitionSchema,
          },
          {
            name: QuestConversionQuarantine.name,
            schema: QuestConversionQuarantineSchema,
          },
          { name: QuestOutbox.name, schema: QuestOutboxSchema },
          { name: QuestEventIngestion.name, schema: QuestEventIngestionSchema },
          { name: QuestTaskProgress.name, schema: QuestTaskProgressSchema },
          { name: QuestContribution.name, schema: QuestContributionSchema },
          {
            name: QuestConversionState.name,
            schema: QuestConversionStateSchema,
          },
          {
            name: QuestSourceConfigFence.name,
            schema: QuestSourceConfigFenceSchema,
          },
        ]),
      ],
      providers: [
        QuestTaskTransactionService,
        QuestRevisionFenceService,
        AccountRegistrationService,
        QuestConversionLifecycleService,
        QuestOutboxConsumerService,
        QuestTaskProgressService,
        QuestTaskStateInspectorService,
        MembershipService,
        { provide: QuestEngineFailureInjectionHook, useValue: failureHook },
        { provide: QUEST_FX_RATE_PROVIDER, useValue: fx },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    connection = moduleRef.get(getConnectionToken());
    registration = moduleRef.get(AccountRegistrationService);
    lifecycle = moduleRef.get(QuestConversionLifecycleService);
    consumer = moduleRef.get(QuestOutboxConsumerService);
    progress = moduleRef.get(QuestTaskProgressService);
    membershipService = moduleRef.get(MembershipService);
    stateInspector = moduleRef.get(QuestTaskStateInspectorService);
    revisionFence = moduleRef.get(QuestRevisionFenceService);
    userModel = moduleRef.get(getModelToken(User.name));
    membershipModel = moduleRef.get(getModelToken(Membership.name));
    membershipTierModel = moduleRef.get(getModelToken(MembershipTier.name));
    pointModel = moduleRef.get(getModelToken(Point.name));
    questModel = moduleRef.get(getModelToken(Quest.name));
    outboxModel = moduleRef.get(getModelToken(QuestOutbox.name));
    ingestionModel = moduleRef.get(getModelToken(QuestEventIngestion.name));
    progressModel = moduleRef.get(getModelToken(QuestTaskProgress.name));
    contributionModel = moduleRef.get(getModelToken(QuestContribution.name));
    conversionStateModel = moduleRef.get(
      getModelToken(QuestConversionState.name),
    );
    conversionModel = moduleRef.get(getModelToken(Conversion.name));
    sourceConfigFenceModel = moduleRef.get(
      getModelToken(QuestSourceConfigFence.name),
    );
  });

  beforeEach(async () => {
    jest.restoreAllMocks();
    failureHook.stage = undefined;
    fx.unavailable.clear();
    fx.calls = [];
    await connection.db!.dropDatabase();
    await Promise.all([
      userModel.syncIndexes(),
      membershipModel.syncIndexes(),
      membershipTierModel.syncIndexes(),
      questModel.syncIndexes(),
    ]);
    await prepareTaskV2Database();
  });

  afterAll(async () => {
    if (connection?.db)
      await connection.db.dropDatabase().catch(() => undefined);
    if (app) await app.close();
    if (mongoProcess) await stopMongoProcess(mongoProcess);
    if (mongoDir) await rm(mongoDir, { recursive: true, force: true });
  });

  it('keeps flag-off Involve ingestion on the legacy raw conversion identity', async () => {
    // Simulate an untouched database: before the controlled task-v2 migration,
    // flag-off traffic must retain the legacy source path.
    await connection.db!.dropDatabase();
    const user = await userModel.create({ id_firebase: 'legacy-flag-off' });
    await conversionModel.create(
      conversionInput(user._id, 7001, 'pending', {
        provider_conversion_id: undefined,
        provider_account: undefined,
      }),
    );
    process.env.QUEST_TASK_V2_ENABLED = 'false';
    try {
      await expect(
        lifecycle.ingest(
          conversionInput(user._id, 7001, 'approved', {
            provider_account: undefined,
            network_account: 'publisher-th',
          }),
        ),
      ).resolves.toEqual({ outcome: 'legacy_applied' });
    } finally {
      process.env.QUEST_TASK_V2_ENABLED = 'true';
    }

    expect(await conversionModel.countDocuments({ conversion_id: 7001 })).toBe(
      1,
    );
    expect(
      await conversionModel.findOne({ conversion_id: 7001 }),
    ).toMatchObject({
      conversion_status: 'approved',
      provider_account: 'publisher-th',
      provider_conversion_id: '7001',
    });
  });

  it('uses a partial Point key index and atomically emits base + quest referral once', async () => {
    const referrer = await userModel.create({ id_firebase: 'referrer' });
    await pointModel.create([
      {
        user_id: referrer._id,
        conversion_id: 0,
        point: 1,
        type: 'add',
        action: 'legacy',
      },
      {
        user_id: referrer._id,
        conversion_id: 0,
        point: 1,
        type: 'add',
        action: 'legacy',
      },
    ]);
    await pointModel.create({
      user_id: referrer._id,
      conversion_id: 0,
      point: 1,
      type: 'add',
      action: 'keyed',
      idempotency_key: 'e2e:keyed',
    });
    await expect(
      pointModel.create({
        user_id: referrer._id,
        conversion_id: 0,
        point: 2,
        type: 'add',
        action: 'different',
        idempotency_key: 'e2e:keyed',
      }),
    ).rejects.toMatchObject({ code: 11000 });

    const activeQuest = await createQuest([
      referralTask('account-created', 'account_created'),
    ]);
    const futureQuest = await createQuest(
      [referralTask('future', 'account_created')],
      {
        start: new Date('2026-08-01T00:00:00.000Z'),
        end: new Date('2026-08-31T16:59:59.999Z'),
      },
    );
    const result = await registration.registerVerified({
      source: 'firebase:google.com',
      user: { id_firebase: 'new-referee' },
      referral_id: String(referrer._id),
      occurred_at: new Date('2026-07-17T02:00:00.000Z'),
    });
    expect(result.created).toBe(true);
    expect(
      (await questModel.findById(activeQuest._id))?.task_v2_state_frozen_at,
    ).toBeInstanceOf(Date);
    expect(
      (await questModel.findById(futureQuest._id))?.task_v2_state_frozen_at,
    ).toBeUndefined();

    await processEvent(result.source_event_id!);
    await processEvent(result.source_event_id!);
    const refereeId = (result.user as { _id: Types.ObjectId })._id;
    expect(
      await pointModel.countDocuments({
        user_id: referrer._id,
        referral_id: refereeId,
        action: { $in: ['referral', 'quest_task_v2'] },
      }),
    ).toBe(2);
    expect(
      await pointModel.countDocuments({
        user_id: referrer._id,
        referral_id: refereeId,
        action: 'referral',
        point: 50,
      }),
    ).toBe(1);
    expect(
      await pointModel.countDocuments({
        user_id: referrer._id,
        referral_id: refereeId,
        action: 'quest_task_v2',
        point: 100,
      }),
    ).toBe(1);
    expect(
      await progressModel.countDocuments({ quest_id: activeQuest._id }),
    ).toBe(1);
  });

  it('leases one outbox event to exactly one simultaneous consumer', async () => {
    const referrer = await userModel.create({
      id_firebase: 'lease-race-referrer',
    });
    const quest = await createQuest([
      referralTask('lease-race-task', 'account_created', 80),
    ]);
    const result = await registration.registerVerified({
      source: 'firebase:google.com',
      user: { id_firebase: 'lease-race-referee' },
      referral_id: String(referrer._id),
      occurred_at: new Date('2026-07-17T02:30:00.000Z'),
    });
    const refereeId = (result.user as { _id: Types.ObjectId })._id;
    const entered = deferred();
    const release = deferred();
    const applyOutboxInSession = progress.applyOutboxInSession.bind(progress);
    jest
      .spyOn(progress, 'applyOutboxInSession')
      .mockImplementationOnce(async (...args) => {
        entered.resolve();
        await release.promise;
        return applyOutboxInSession(...args);
      });

    const now = new Date('2026-07-17T02:31:00.000Z');
    const first = consumer.drainOne(now);
    await entered.promise;
    const second = await consumer.drainOne(now);
    expect(second).toBe(false);
    release.resolve();
    await expect(first).resolves.toBe(true);

    expect(
      await pointModel.countDocuments({
        user_id: referrer._id,
        referral_id: refereeId,
        action: 'quest_task_v2',
        point: 80,
      }),
    ).toBe(1);
    expect(
      await contributionModel.countDocuments({ quest_id: quest._id }),
    ).toBe(1);
    expect(await progressModel.countDocuments({ quest_id: quest._id })).toBe(1);
    expect(
      await ingestionModel.countDocuments({
        source_event_id: result.source_event_id,
        status: 'completed',
      }),
    ).toBe(1);
    expect(
      await outboxModel.findOne({ source_event_id: result.source_event_id }),
    ).toMatchObject({ status: 'completed', attempts: 1 });
  });

  it('rolls back every effect after an injected award crash and converges on retry', async () => {
    const referrer = await userModel.create({ id_firebase: 'fault-referrer' });
    const quest = await createQuest([
      referralTask('fault-task', 'account_created', 75),
    ]);
    const result = await registration.registerVerified({
      source: 'line',
      user: { id_firebase: 'line_fault' },
      referral_id: String(referrer._id),
      occurred_at: new Date('2026-07-17T03:00:00.000Z'),
    });
    failureHook.stage = 'after_award';

    await expect(processEvent(result.source_event_id!)).rejects.toThrow(
      'Injected quest failure',
    );
    expect(await pointModel.countDocuments({ action: 'quest_task_v2' })).toBe(
      0,
    );
    expect(await progressModel.countDocuments({ quest_id: quest._id })).toBe(0);
    expect(
      await contributionModel.countDocuments({ quest_id: quest._id }),
    ).toBe(0);
    expect(await ingestionModel.countDocuments({})).toBe(0);

    await processEvent(result.source_event_id!);
    expect(
      await pointModel.countDocuments({ action: 'quest_task_v2', point: 75 }),
    ).toBe(1);
    expect(await progressModel.countDocuments({ quest_id: quest._id })).toBe(1);
  });

  it('repairs a transiently missed base +50 before bonus completion with crash-safe retry', async () => {
    const referrer = await userModel.create({ id_firebase: 'repair-referrer' });
    const refereeId = new Types.ObjectId();
    await createQuest([referralTask('repair-task', 'account_created', 90)]);
    jest
      .spyOn(pointModel, 'updateOne')
      .mockRejectedValueOnce(new Error('transient base point failure'));

    const result = await registration.registerVerified({
      source: 'firebase:phone',
      user: { _id: refereeId, id_firebase: 'repair-referee' },
      referral_id: String(referrer._id),
      occurred_at: new Date('2026-07-17T03:30:00.000Z'),
    });
    expect(result.referral_reconciliation_required).toBe(true);
    expect(
      await pointModel.countDocuments({
        user_id: referrer._id,
        referral_id: refereeId,
      }),
    ).toBe(0);

    failureHook.stage = 'after_base_referral_reconciliation';
    await expect(processEvent(result.source_event_id!)).rejects.toThrow(
      'Injected quest failure',
    );
    expect(
      await pointModel.countDocuments({
        user_id: referrer._id,
        referral_id: refereeId,
      }),
    ).toBe(0);

    await processEvent(result.source_event_id!);
    expect(
      await pointModel
        .find({ user_id: referrer._id, referral_id: refereeId })
        .sort({ point: 1 })
        .select('point action'),
    ).toMatchObject([
      { point: 50, action: 'referral' },
      { point: 90, action: 'quest_task_v2' },
    ]);
  });

  it('awards late approval, compensates after end, and blocks after-end requalification', async () => {
    const user = await userModel.create({ id_firebase: 'conversion-user' });
    const quest = await createQuest(
      [
        {
          task_key: 'brand-task',
          task_type: 'brand_purchase',
          offer: new Types.ObjectId(),
          offer_id: 10,
          merchant_id: 20,
          extra_point: 40,
          points: 40,
          sort_order: 0,
          enabled: true,
          wording: 'Buy',
          wording_en: 'Buy',
          wording_th: 'ซื้อ',
          notes: '',
        },
      ],
      { end: new Date('2026-07-18T16:59:59.999Z') },
    );
    const pending = await lifecycle.ingest(
      conversionInput(user._id, 7001, 'pending'),
      {
        provider_transition_version: 1,
        occurred_at: new Date('2026-07-17T01:00:00.000Z'),
      },
    );
    await processEvent(pending.source_event_id!);
    const approved = await lifecycle.ingest(
      conversionInput(user._id, 7001, 'approved'),
      {
        provider_transition_version: 2,
        occurred_at: new Date('2026-07-20T01:00:00.000Z'),
      },
    );
    await processEvent(approved.source_event_id!);
    expect(
      await progressModel.findOne({ quest_id: quest._id, active_award: false }),
    ).toMatchObject({ completed: true, current_value: 1 });
    // Brand purchase is progress-only; legacy extra-point ownership remains
    // outside task-v2 and no duplicate Point row is emitted here.
    expect(await pointModel.countDocuments({ action: 'quest_task_v2' })).toBe(
      0,
    );

    const reversed = await lifecycle.ingest(
      conversionInput(user._id, 7001, 'rejected'),
      {
        provider_transition_version: 3,
        occurred_at: new Date('2026-07-21T01:00:00.000Z'),
      },
    );
    await processEvent(reversed.source_event_id!);
    expect(await progressModel.findOne({ quest_id: quest._id })).toMatchObject({
      completed: false,
      current_value: 0,
    });

    const requalified = await lifecycle.ingest(
      conversionInput(user._id, 7001, 'approved'),
      {
        provider_transition_version: 4,
        occurred_at: new Date('2026-07-22T01:00:00.000Z'),
      },
    );
    await processEvent(requalified.source_event_id!);
    expect(await progressModel.findOne({ quest_id: quest._id })).toMatchObject({
      completed: false,
      current_value: 0,
    });
  });

  it('keeps first-earning qualified while any eligible conversion remains and enforces quest-wide referral cap', async () => {
    const referrer = await userModel.create({
      id_firebase: 'earning-referrer',
    });
    const referee = await userModel.create({
      id_firebase: 'earning-referee',
      referred_by: String(referrer._id),
    });
    const quest = await createQuest(
      [
        referralTask('first-earning-a', 'first_earning_conversion', 30),
        referralTask('first-earning-b', 'first_earning_conversion', 40),
      ],
      { caps: { max_referrals_per_user: 1 } },
    );

    for (const conversionId of [8001, 8002]) {
      const approved = await lifecycle.ingest(
        conversionInput(referee._id, conversionId, 'approved'),
        {
          provider_transition_version: 1,
          occurred_at: new Date('2026-07-17T04:00:00.000Z'),
        },
      );
      await processEvent(approved.source_event_id!);
    }
    const rows = await progressModel
      .find({ quest_id: quest._id, beneficiary_user_id: referrer._id })
      .sort({ task_key: 1 });
    expect(rows).toHaveLength(2);
    expect(rows.filter((row) => row.active_award)).toHaveLength(1);
    expect(rows.filter((row) => row.cap_reached)).toHaveLength(1);
    expect(rows.find((row) => row.cap_reached)?.cap_reason).toBe(
      'max_referrals_per_user',
    );
    expect(
      await pointModel.countDocuments({
        user_id: referrer._id,
        action: 'quest_task_v2',
        type: 'add',
      }),
    ).toBe(1);

    const reversed = await lifecycle.ingest(
      conversionInput(referee._id, 8001, 'rejected'),
      {
        provider_transition_version: 2,
        occurred_at: new Date('2026-07-18T04:00:00.000Z'),
      },
    );
    await processEvent(reversed.source_event_id!);
    const awardedRow = await progressModel.findOne({
      quest_id: quest._id,
      active_award: true,
    });
    expect(awardedRow?.current_value).toBe(1);
    expect(
      await pointModel.countDocuments({
        user_id: referrer._id,
        action: 'quest_task_v2',
        type: 'remove',
      }),
    ).toBe(0);
  });

  it('aborts award and compensation when a ledger key is rebound to different semantics', async () => {
    const referrer = await userModel.create({
      id_firebase: 'collision-referrer',
    });
    const referee = await userModel.create({
      id_firebase: 'collision-referee',
      referred_by: String(referrer._id),
    });
    const quest = await createQuest([
      referralTask('collision-task', 'first_earning_conversion', 30),
    ]);
    const awardKey = `quest:${String(quest._id)}:task:collision-task:referrer:${String(referrer._id)}:referee:${String(referee._id)}:epoch:0`;
    const approved = await lifecycle.ingest(
      conversionInput(referee._id, 9001, 'approved'),
      {
        provider_transition_version: 1,
        occurred_at: new Date('2026-07-17T05:00:00.000Z'),
      },
    );
    await pointModel.create({
      user_id: referrer._id,
      referral_id: referee._id,
      conversion_id: 0,
      point: 999,
      type: 'add',
      action: 'quest_task_v2',
      idempotency_key: awardKey,
    });
    await expect(processEvent(approved.source_event_id!)).rejects.toMatchObject(
      {
        status: 409,
      },
    );
    expect(await progressModel.countDocuments({ quest_id: quest._id })).toBe(0);
    expect(
      await contributionModel.countDocuments({ quest_id: quest._id }),
    ).toBe(0);

    await pointModel.deleteOne({ idempotency_key: awardKey });
    await processEvent(approved.source_event_id!);
    const compensationKey = `${awardKey}:compensation`;
    const reversed = await lifecycle.ingest(
      conversionInput(referee._id, 9001, 'rejected'),
      {
        provider_transition_version: 2,
        occurred_at: new Date('2026-07-18T05:00:00.000Z'),
      },
    );
    await pointModel.create({
      user_id: referrer._id,
      referral_id: referee._id,
      conversion_id: 0,
      point: 999,
      type: 'remove',
      action: 'quest_task_v2',
      idempotency_key: compensationKey,
    });
    await expect(processEvent(reversed.source_event_id!)).rejects.toMatchObject(
      {
        status: 409,
      },
    );
    expect(await progressModel.findOne({ quest_id: quest._id })).toMatchObject({
      active_award: true,
      current_value: 1,
      award_epoch: 0,
    });
    expect(
      await conversionStateModel.findOne({ quest_id: quest._id }),
    ).toMatchObject({ high_water_version: 1, active_value: 1 });
  });

  it('stores immutable FX evidence, compensates a correction, and retries missing FX without partial state', async () => {
    const user = await userModel.create({ id_firebase: 'fx-user' });
    const quest = await createQuest([
      {
        task_key: 'spend-task',
        task_type: 'spend_target',
        spend_scope: 'any_shop_via_ggc',
        target_thb_minor: 10_000,
        points: 55,
        sort_order: 0,
        enabled: true,
        wording: 'Spend',
        wording_en: 'Spend',
        wording_th: 'ใช้จ่าย',
        notes: '',
      },
    ]);
    const fxAt = new Date('2026-07-20T06:00:00.000Z');
    const approved = await lifecycle.ingest(
      conversionInput(user._id, 9101, 'approved', {
        currency: 'USD',
        sale_amount: 4,
      }),
      { provider_transition_version: 1, occurred_at: fxAt },
    );
    await processEvent(approved.source_event_id!);
    expect(
      await contributionModel.findOne({
        quest_id: quest._id,
        source_event_id: approved.source_event_id,
      }),
    ).toMatchObject({
      original_amount_minor: 400,
      original_currency: 'USD',
      fx_rate_to_thb: 35,
      fx_as_of: fxAt,
      normalized_thb_minor: 14_000,
      delta_value: 14_000,
    });
    expect(await progressModel.findOne({ quest_id: quest._id })).toMatchObject({
      current_value: 14_000,
      active_award: true,
    });

    const corrected = await lifecycle.ingest(
      conversionInput(user._id, 9101, 'approved', {
        currency: 'USD',
        sale_amount: 2,
      }),
      {
        provider_transition_version: 2,
        occurred_at: new Date('2026-07-21T06:00:00.000Z'),
      },
    );
    await processEvent(corrected.source_event_id!);
    expect(await progressModel.findOne({ quest_id: quest._id })).toMatchObject({
      current_value: 7_000,
      active_award: false,
      award_epoch: 1,
    });
    expect(
      await pointModel.countDocuments({
        user_id: user._id,
        action: 'quest_task_v2',
        type: 'remove',
      }),
    ).toBe(1);

    fx.unavailable.add('JPY');
    const missingFx = await lifecycle.ingest(
      conversionInput(user._id, 9102, 'approved', {
        currency: 'JPY',
        sale_amount: 1_000,
      }),
      {
        provider_transition_version: 1,
        occurred_at: new Date('2026-07-22T06:00:00.000Z'),
      },
    );
    await expect(processEvent(missingFx.source_event_id!)).rejects.toThrow(
      'No immutable THB FX quote',
    );
    expect(
      await contributionModel.countDocuments({
        quest_id: quest._id,
        source_event_id: missingFx.source_event_id,
      }),
    ).toBe(0);
    expect(
      await conversionStateModel.countDocuments({
        quest_id: quest._id,
        high_water_event_id: missingFx.source_event_id,
      }),
    ).toBe(0);
    expect(
      await ingestionModel.countDocuments({
        source_event_id: missingFx.source_event_id,
      }),
    ).toBe(0);
  });

  it('compensates an active tier-gated award after the beneficiary leaves the audience', async () => {
    const user = await userModel.create({
      id_firebase: 'audience-reversal-user',
      privilege: 'spoofed-user-field-must-not-drive-audience',
    });
    const tier = await membershipTierModel.create({
      name: 'GoGoPass reversal tier',
      is_active: true,
    });
    await membershipModel.create({
      user_id: user._id,
      tier_id: tier._id,
      status: 'active',
      start_date: new Date('2026-07-01T00:00:00.000Z'),
      tier_assignment_started_at: new Date('2026-07-01T00:00:00.000Z'),
      end_date: new Date('2026-07-31T16:59:59.999Z'),
    });
    const quest = await createQuest([spendTask('audience-spend-task')], {
      audience: {
        kind: 'membership_tiers',
        tier_ids: [tier._id.toHexString()],
      },
    });
    const approved = await lifecycle.ingest(
      conversionInput(user._id, 9150, 'approved'),
      {
        provider_transition_version: 1,
        occurred_at: new Date('2026-07-17T07:00:00.000Z'),
      },
    );
    await processEvent(approved.source_event_id!);
    expect(await progressModel.findOne({ quest_id: quest._id })).toMatchObject({
      current_value: 10_000,
      completed: true,
      active_award: true,
      award_epoch: 0,
    });
    expect(
      await pointModel.countDocuments({
        user_id: user._id,
        action: 'quest_task_v2',
        type: 'add',
        point: 65,
      }),
    ).toBe(1);

    await membershipModel.updateOne(
      { user_id: user._id },
      {
        $set: {
          status: 'cancelled',
          cancelled_at: new Date('2026-07-18T06:00:00.000Z'),
        },
      },
    );
    await expect(
      progress.getCustomerProgress(
        user._id.toHexString(),
        new Date('2026-07-17T07:00:00.000Z'),
      ),
    ).resolves.toEqual([
      expect.objectContaining({ quest_id: quest._id.toHexString() }),
    ]);
    await expect(
      progress.getCustomerProgress(
        user._id.toHexString(),
        new Date('2026-07-18T07:00:00.000Z'),
      ),
    ).resolves.toEqual([]);
    const reversed = await lifecycle.ingest(
      conversionInput(user._id, 9150, 'rejected'),
      {
        provider_transition_version: 2,
        occurred_at: new Date('2026-07-18T07:00:00.000Z'),
      },
    );
    await processEvent(reversed.source_event_id!);
    await processEvent(reversed.source_event_id!);

    expect(
      await progressModel.findOne({ quest_id: quest._id }).lean(),
    ).toMatchObject({
      current_value: 0,
      completed: false,
      active_award: false,
      award_epoch: 1,
    });
    expect(
      await conversionStateModel.findOne({
        quest_id: quest._id,
        task_key: 'audience-spend-task',
      }),
    ).toMatchObject({
      high_water_version: 2,
      active_value: 0,
      active_thb_minor: 0,
      ever_audience_qualified: true,
    });
    expect(
      await pointModel.countDocuments({
        user_id: user._id,
        action: 'quest_task_v2',
        type: 'remove',
        point: 65,
      }),
    ).toBe(1);
  });

  it('atomically fences historical tier-B replay across concurrent A-to-B assignment and preserves same-tier boundaries', async () => {
    const user = await userModel.create({
      id_firebase: 'audience-tier-assignment-history-user',
    });
    const [tierA, tierB] = await membershipTierModel.create([
      { name: 'Historical tier A', is_active: true },
      { name: 'Historical tier B', is_active: true },
    ]);
    const billingStart = new Date('2026-07-01T00:00:00.000Z');
    await membershipModel.create({
      user_id: user._id,
      tier_id: tierA._id,
      status: 'active',
      start_date: billingStart,
      tier_assignment_started_at: billingStart,
      end_date: new Date('2026-07-31T16:59:59.999Z'),
    });

    const concurrentResults = await Promise.all(
      Array.from({ length: 6 }, () =>
        membershipService.changeTier(
          user._id.toHexString(),
          tierB._id.toHexString(),
        ),
      ),
    );
    const assignmentTimes = concurrentResults.map((result) =>
      new Date(result.tier_assignment_started_at).getTime(),
    );
    expect(new Set(assignmentTimes).size).toBe(1);
    expect(
      concurrentResults.every(
        (result) =>
          String((result.tier_id as unknown as { _id: Types.ObjectId })._id) ===
          tierB._id.toHexString(),
      ),
    ).toBe(true);
    const assignmentStartedAt = new Date(assignmentTimes[0]!);
    expect(assignmentStartedAt.getTime()).toBeGreaterThan(
      billingStart.getTime(),
    );

    const sameTierResult = await membershipService.changeTier(
      user._id.toHexString(),
      tierB._id.toHexString(),
    );
    expect(sameTierResult.tier_assignment_started_at).toEqual(
      assignmentStartedAt,
    );

    const legacySameTierUser = await userModel.create({
      id_firebase: 'audience-same-tier-missing-boundary-user',
    });
    await membershipModel.collection.insertOne({
      user_id: legacySameTierUser._id,
      tier_id: tierB._id,
      status: 'active',
      start_date: billingStart,
      end_date: new Date('2026-07-31T16:59:59.999Z'),
    });
    const legacySameTierResult = await membershipService.changeTier(
      legacySameTierUser._id.toHexString(),
      tierB._id.toHexString(),
    );
    expect(legacySameTierResult.tier_assignment_started_at).toBeUndefined();
    const storedLegacySameTier = await membershipModel.collection.findOne({
      user_id: legacySameTierUser._id,
    });
    expect(
      Object.prototype.hasOwnProperty.call(
        storedLegacySameTier,
        'tier_assignment_started_at',
      ),
    ).toBe(false);

    const beforeAssignment = new Date(assignmentStartedAt.getTime() - 1_000);
    const afterAssignment = new Date(assignmentStartedAt.getTime() + 1_000);
    const quest = await createQuest([spendTask('tier-history-spend')], {
      start: new Date(assignmentStartedAt.getTime() - 24 * 60 * 60 * 1_000),
      end: new Date(assignmentStartedAt.getTime() + 24 * 60 * 60 * 1_000),
      audience: {
        kind: 'membership_tiers',
        tier_ids: [tierB._id.toHexString()],
      },
    });

    const historicalReplay = await lifecycle.ingest(
      conversionInput(user._id, 9155, 'approved', {
        datetime_conversion: beforeAssignment,
      }),
      { provider_transition_version: 1, occurred_at: beforeAssignment },
    );
    await processEvent(historicalReplay.source_event_id!);
    expect(await progressModel.countDocuments({ quest_id: quest._id })).toBe(0);
    expect(
      await pointModel.countDocuments({
        user_id: user._id,
        action: 'quest_task_v2',
      }),
    ).toBe(0);

    const postSwitch = await lifecycle.ingest(
      conversionInput(user._id, 9156, 'approved', {
        datetime_conversion: afterAssignment,
      }),
      { provider_transition_version: 1, occurred_at: afterAssignment },
    );
    await processEvent(postSwitch.source_event_id!);
    expect(await progressModel.findOne({ quest_id: quest._id })).toMatchObject({
      current_value: 10_000,
      completed: true,
      active_award: true,
    });
    expect(
      await pointModel.countDocuments({
        user_id: user._id,
        action: 'quest_task_v2',
        type: 'add',
        point: 65,
      }),
    ).toBe(1);
  });

  it('requalifies stored eligible lineage after tier loss but ignores duplicate and older transitions', async () => {
    const user = await userModel.create({
      id_firebase: 'audience-requalification-user',
    });
    const tier = await membershipTierModel.create({
      name: 'GoGoPass lineage tier',
      is_active: true,
    });
    const replacementTier = await membershipTierModel.create({
      name: 'Replacement tier',
      is_active: true,
    });
    await membershipModel.create({
      user_id: user._id,
      tier_id: tier._id,
      status: 'active',
      start_date: new Date('2026-07-01T00:00:00.000Z'),
      tier_assignment_started_at: new Date('2026-07-01T00:00:00.000Z'),
      end_date: new Date('2026-07-31T16:59:59.999Z'),
    });
    const quest = await createQuest(
      [spendTask('audience-requalification-task', 70)],
      {
        audience: {
          kind: 'membership_tiers',
          tier_ids: [tier._id.toHexString()],
        },
      },
    );
    const approved = await lifecycle.ingest(
      conversionInput(user._id, 9151, 'approved'),
      {
        provider_transition_version: 1,
        occurred_at: new Date('2026-07-17T08:00:00.000Z'),
      },
    );
    await processEvent(approved.source_event_id!);
    const reversed = await lifecycle.ingest(
      conversionInput(user._id, 9151, 'rejected'),
      {
        provider_transition_version: 2,
        occurred_at: new Date('2026-07-18T08:00:00.000Z'),
      },
    );
    await processEvent(reversed.source_event_id!);
    expect(
      await progressModel.findOne({ quest_id: quest._id }).lean(),
    ).toMatchObject({
      current_value: 0,
      active_award: false,
      award_epoch: 1,
    });
    const reversedState = await conversionStateModel
      .findOne({ quest_id: quest._id })
      .lean();
    expect(reversedState).toMatchObject({ ever_audience_qualified: true });
    // Simulate an inactive state written before the lineage field existed.
    // The immutable positive contribution must recover and persist eligibility.
    await conversionStateModel.collection.updateOne(
      { _id: reversedState!._id },
      { $unset: { ever_audience_qualified: '' } },
    );

    await membershipModel.updateOne(
      { user_id: user._id },
      { $set: { tier_id: replacementTier._id } },
    );
    const requalified = await lifecycle.ingest(
      conversionInput(user._id, 9151, 'approved'),
      {
        provider_transition_version: 3,
        occurred_at: new Date('2026-07-19T08:00:00.000Z'),
      },
    );
    expect(requalified).toMatchObject({
      outcome: 'applied',
      event_type: 'requalified',
      transition_version: 3,
    });
    await processEvent(requalified.source_event_id!);
    await processEvent(requalified.source_event_id!);

    expect(
      await progressModel.findOne({ quest_id: quest._id }).lean(),
    ).toMatchObject({
      current_value: 10_000,
      completed: true,
      active_award: true,
      award_epoch: 1,
    });
    expect(
      await conversionStateModel.findOne({ quest_id: quest._id }).lean(),
    ).toMatchObject({
      high_water_version: 3,
      active_thb_minor: 10_000,
      ever_audience_qualified: true,
    });
    expect(
      await pointModel.countDocuments({
        user_id: user._id,
        action: 'quest_task_v2',
        type: 'add',
        point: 70,
      }),
    ).toBe(2);
    expect(
      await pointModel.countDocuments({
        user_id: user._id,
        action: 'quest_task_v2',
        type: 'remove',
        point: 70,
      }),
    ).toBe(1);

    await expect(
      lifecycle.ingest(conversionInput(user._id, 9151, 'rejected'), {
        provider_transition_version: 2,
        occurred_at: new Date('2026-07-18T08:00:00.000Z'),
      }),
    ).resolves.toMatchObject({ outcome: 'stale', high_water_version: 3 });
    expect(
      await pointModel.countDocuments({
        user_id: user._id,
        action: 'quest_task_v2',
      }),
    ).toBe(3);
  });

  it('does not grandfather an ineligible conversion into a later positive award', async () => {
    const tier = await membershipTierModel.create({
      name: 'GoGoPass no-grandfather tier',
      is_active: true,
    });
    const user = await userModel.create({
      id_firebase: 'audience-never-qualified-user',
      privilege: tier._id.toHexString(),
    });
    await membershipModel.create({
      user_id: user._id,
      tier_id: tier._id,
      status: 'pending',
      start_date: new Date('2026-07-01T00:00:00.000Z'),
      tier_assignment_started_at: new Date('2026-07-01T00:00:00.000Z'),
      end_date: new Date('2026-07-31T16:59:59.999Z'),
    });
    const quest = await createQuest(
      [spendTask('audience-never-qualified-task', 75)],
      {
        audience: {
          kind: 'membership_tiers',
          tier_ids: [tier._id.toHexString()],
        },
      },
    );
    for (const [version, status, occurredAt] of [
      [1, 'approved', '2026-07-17T09:00:00.000Z'],
      [2, 'rejected', '2026-07-18T09:00:00.000Z'],
      [3, 'approved', '2026-07-19T09:00:00.000Z'],
    ] as const) {
      const transition = await lifecycle.ingest(
        conversionInput(user._id, 9152, status),
        {
          provider_transition_version: version,
          occurred_at: new Date(occurredAt),
        },
      );
      await processEvent(transition.source_event_id!);
    }

    expect(await progressModel.countDocuments({ quest_id: quest._id })).toBe(0);
    expect(
      await pointModel.countDocuments({
        user_id: user._id,
        action: 'quest_task_v2',
      }),
    ).toBe(0);
    expect(
      await conversionStateModel.findOne({ quest_id: quest._id }).lean(),
    ).toMatchObject({
      high_water_version: 3,
      active_value: 0,
      active_thb_minor: 0,
      ever_audience_qualified: false,
    });
    expect(
      await contributionModel.countDocuments({
        quest_id: quest._id,
        delta_value: { $ne: 0 },
      }),
    ).toBe(0);
  });

  it('fails closed for cancelled, expired, mismatched, paused, missing memberships and spoofed User privilege', async () => {
    const targetTier = await membershipTierModel.create({
      name: 'GoGoPass audience target',
      is_active: true,
    });
    const otherTier = await membershipTierModel.create({
      name: 'Other membership tier',
      is_active: true,
    });
    const quest = await createQuest([spendTask('audience-denial-matrix')], {
      audience: {
        kind: 'membership_tiers',
        tier_ids: [targetTier._id.toHexString()],
      },
    });
    const occurredAt = new Date('2026-07-17T12:00:00.000Z');
    const cases: Array<{
      label: string;
      membership?: Record<string, unknown>;
      raw?: boolean;
    }> = [
      {
        label: 'cancelled-before-event',
        membership: {
          tier_id: targetTier._id,
          status: 'cancelled',
          start_date: new Date('2026-07-01T00:00:00.000Z'),
          tier_assignment_started_at: new Date('2026-07-01T00:00:00.000Z'),
          end_date: new Date('2026-07-31T16:59:59.999Z'),
          cancelled_at: new Date('2026-07-17T11:59:59.999Z'),
        },
      },
      {
        label: 'expired-before-event',
        membership: {
          tier_id: targetTier._id,
          status: 'expired',
          start_date: new Date('2026-07-01T00:00:00.000Z'),
          tier_assignment_started_at: new Date('2026-07-01T00:00:00.000Z'),
          end_date: new Date('2026-07-17T11:59:59.999Z'),
        },
      },
      {
        label: 'mismatched-tier',
        membership: {
          tier_id: otherTier._id,
          status: 'active',
          start_date: new Date('2026-07-01T00:00:00.000Z'),
          tier_assignment_started_at: new Date('2026-07-01T00:00:00.000Z'),
          end_date: new Date('2026-07-31T16:59:59.999Z'),
        },
      },
      {
        label: 'paused-membership',
        membership: {
          tier_id: targetTier._id,
          status: 'paused',
          start_date: new Date('2026-07-01T00:00:00.000Z'),
          tier_assignment_started_at: new Date('2026-07-01T00:00:00.000Z'),
          end_date: new Date('2026-07-31T16:59:59.999Z'),
        },
      },
      {
        label: 'missing-assignment-boundary',
        raw: true,
        membership: {
          tier_id: targetTier._id,
          status: 'active',
          start_date: new Date('2026-07-01T00:00:00.000Z'),
          end_date: new Date('2026-07-31T16:59:59.999Z'),
        },
      },
      {
        label: 'malformed-assignment-boundary',
        raw: true,
        membership: {
          tier_id: targetTier._id,
          status: 'active',
          start_date: new Date('2026-07-01T00:00:00.000Z'),
          tier_assignment_started_at: 'not-a-date',
          end_date: new Date('2026-07-31T16:59:59.999Z'),
        },
      },
      { label: 'missing-membership' },
    ];

    for (const [index, testCase] of cases.entries()) {
      const user = await userModel.create({
        id_firebase: `audience-denial-${testCase.label}`,
        privilege: targetTier._id.toHexString(),
      });
      if (testCase.membership) {
        const document = { user_id: user._id, ...testCase.membership };
        if (testCase.raw) {
          await membershipModel.collection.insertOne(document as never);
        } else {
          await membershipModel.create(document);
        }
      }
      const transition = await lifecycle.ingest(
        conversionInput(user._id, 9160 + index, 'approved'),
        { provider_transition_version: 1, occurred_at: occurredAt },
      );
      await processEvent(transition.source_event_id!);

      expect(
        await pointModel.countDocuments({
          user_id: user._id,
          action: 'quest_task_v2',
        }),
      ).toBe(0);
      await expect(
        progress.getCustomerProgress(user._id.toHexString(), occurredAt),
      ).resolves.toEqual([]);
    }
    expect(await progressModel.countDocuments({ quest_id: quest._id })).toBe(0);
  });

  it('shares one immutable FX quote across two spend tasks for the same event', async () => {
    const user = await userModel.create({ id_firebase: 'fx-cache-user' });
    const spendTask = (taskKey: string) => ({
      task_key: taskKey,
      task_type: 'spend_target',
      spend_scope: 'any_shop_via_ggc',
      target_thb_minor: 100_000,
      points: 25,
      sort_order: 0,
      enabled: true,
      wording: 'Spend',
      wording_en: 'Spend',
      wording_th: 'ใช้จ่าย',
      notes: '',
    });
    const quest = await createQuest([
      spendTask('spend-cache-a'),
      spendTask('spend-cache-b'),
    ]);
    const approved = await lifecycle.ingest(
      conversionInput(user._id, 9199, 'approved', {
        currency: 'USD',
        sale_amount: 4,
      }),
      {
        provider_transition_version: 1,
        occurred_at: new Date('2026-07-20T06:00:00.000Z'),
      },
    );

    await processEvent(approved.source_event_id!);

    expect(fx.calls).toEqual([
      {
        currency: 'USD',
        at: new Date('2026-07-20T06:00:00.000Z'),
      },
    ]);
    const contributions = await contributionModel
      .find({ quest_id: quest._id, source_event_id: approved.source_event_id })
      .sort({ task_key: 1 })
      .lean();
    expect(contributions).toHaveLength(2);
    expect(contributions[0]?.snapshot).toEqual(contributions[1]?.snapshot);
    expect(contributions[0]?.snapshot).toMatchObject({
      original_currency: 'USD',
      fx_rate_to_thb: 35,
      normalized_thb_minor: 14_000,
    });
  });

  it('serializes an included-to-excluded config commit before a racing source event', async () => {
    const now = Date.now();
    const sourceAt = new Date(now + 2 * 24 * 60 * 60 * 1_000);
    const included = {
      start: new Date(now + 24 * 60 * 60 * 1_000),
      end: new Date(now + 3 * 24 * 60 * 60 * 1_000),
    };
    const excluded = {
      start_at: new Date(now + 10 * 24 * 60 * 60 * 1_000),
      end_at: new Date(now + 12 * 24 * 60 * 60 * 1_000),
    };
    const quest = await createQuest(
      [referralTask('task_config_first', 'account_created')],
      {
        start: included.start,
        end: included.end,
      },
    );
    const configEntered = deferred();
    const releaseConfig = deferred();
    const sourceReachedFence = deferred();
    const originalTouch =
      revisionFence.touchSourceConfigFenceInSession.bind(revisionFence);
    let touches = 0;
    jest
      .spyOn(revisionFence, 'touchSourceConfigFenceInSession')
      .mockImplementation(async (session) => {
        touches += 1;
        if (touches === 2) sourceReachedFence.resolve();
        return originalTouch(session);
      });

    const config = stateInspector.withTaskConfigEditFence(
      String(quest._id),
      async (state, session) => {
        expect(state.has_outbox).toBe(false);
        configEntered.resolve();
        await releaseConfig.promise;
        await questModel.updateOne(
          { _id: quest._id },
          {
            $set: {
              start_date: excluded.start_at,
              end_date: excluded.end_at,
            },
          },
          { session },
        );
        return 'saved';
      },
      excluded,
    );
    await configEntered.promise;
    const source = registration.registerVerified({
      source: 'firebase:google.com',
      user: { id_firebase: 'race-config-first' },
      occurred_at: sourceAt,
    });
    await sourceReachedFence.promise;
    releaseConfig.resolve();

    await expect(config).resolves.toBe('saved');
    await expect(source).resolves.toMatchObject({ created: true });
    expect(await questModel.findById(quest._id)).toMatchObject({
      start_date: excluded.start_at,
      end_date: excluded.end_at,
      task_v2_state_frozen_at: undefined,
    });
    expect(
      await sourceConfigFenceModel.findOne({
        fence_key: 'task-v2-source-config-v1',
      }),
    ).toMatchObject({ revision: 2 });
  });

  it('blocks an excluded-to-included config race after the source commits without freezing the unrelated quest', async () => {
    const now = Date.now();
    const sourceAt = new Date(now + 2 * 24 * 60 * 60 * 1_000);
    const excluded = {
      start: new Date(now + 10 * 24 * 60 * 60 * 1_000),
      end: new Date(now + 12 * 24 * 60 * 60 * 1_000),
    };
    const included = {
      start_at: new Date(now + 24 * 60 * 60 * 1_000),
      end_at: new Date(now + 3 * 24 * 60 * 60 * 1_000),
    };
    const quest = await createQuest(
      [referralTask('task_source_first', 'account_created')],
      {
        start: excluded.start,
        end: excluded.end,
      },
    );
    const sourceTouchedFence = deferred();
    const releaseSource = deferred();
    const configReachedFence = deferred();
    const originalTouch =
      revisionFence.touchSourceConfigFenceInSession.bind(revisionFence);
    let touches = 0;
    jest
      .spyOn(revisionFence, 'touchSourceConfigFenceInSession')
      .mockImplementation(async (session) => {
        touches += 1;
        if (touches === 1) {
          await originalTouch(session);
          sourceTouchedFence.resolve();
          await releaseSource.promise;
          return;
        }
        if (touches === 2) configReachedFence.resolve();
        return originalTouch(session);
      });

    const source = registration.registerVerified({
      source: 'firebase:google.com',
      user: { id_firebase: 'race-source-first' },
      occurred_at: sourceAt,
    });
    await sourceTouchedFence.promise;
    const config = stateInspector.withTaskConfigEditFence(
      String(quest._id),
      async (state, session) => {
        if (state.has_outbox) throw new Error('candidate window has source');
        await questModel.updateOne(
          { _id: quest._id },
          {
            $set: {
              start_date: included.start_at,
              end_date: included.end_at,
            },
          },
          { session },
        );
        return 'saved';
      },
      included,
    );
    await configReachedFence.promise;
    releaseSource.resolve();

    await expect(source).resolves.toMatchObject({ created: true });
    await expect(config).rejects.toThrow('candidate window has source');
    expect(await questModel.findById(quest._id)).toMatchObject({
      start_date: excluded.start,
      end_date: excluded.end,
      task_v2_state_frozen_at: undefined,
    });
    expect(
      await sourceConfigFenceModel.findOne({
        fence_key: 'task-v2-source-config-v1',
      }),
    ).toMatchObject({ revision: 1 });
  });
});
