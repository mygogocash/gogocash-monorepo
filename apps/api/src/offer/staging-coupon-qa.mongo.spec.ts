import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { MongoClient, ObjectId } from 'mongodb';
import {
  localMongoDatabaseUri,
  optionalLocalMongoUri,
} from '../test-support/local-mongo-uri';

const helper = require(
  resolve(__dirname, '../../../../scripts/staging-coupon-qa-mongo.cjs'),
) as {
  SENTINEL_COLLECTION: string;
  SENTINEL_ID: string;
  SENTINEL_PURPOSE: string;
  cleanupFixtures(options: Record<string, unknown>): Promise<unknown>;
  prepareFixtures(options: Record<string, unknown>): Promise<unknown>;
};

const baseMongoUri = optionalLocalMongoUri(process.env.QA_LOCAL_MONGO_URI);
const describeLocalMongo = baseMongoUri ? describe : describe.skip;

describeLocalMongo('staging coupon QA local Mongo lifecycle', () => {
  const databaseName = `gogocash_issue339_${process.pid}_${Date.now()}`;
  let mongoUri: string;
  const qaEnv = 'dev';
  let client: MongoClient;
  let sandbox: string;
  let stateFile: string;

  beforeAll(async () => {
    mongoUri = localMongoDatabaseUri(baseMongoUri!, databaseName);
    client = new MongoClient(mongoUri);
    await client.connect();
  });

  beforeEach(async () => {
    await client.db().dropDatabase();
    sandbox = mkdtempSync(join(tmpdir(), 'coupon-qa-mongo-'));
    stateFile = join(sandbox, 'fixture-state.json');
  });

  afterEach(() => rmSync(sandbox, { force: true, recursive: true }));

  afterAll(async () => {
    await client.db().dropDatabase();
    await client.close();
  });

  async function provisionSentinel(environment: string) {
    await client
      .db()
      .collection<{
        _id: string;
        environment: string;
        purpose: string;
        write_enabled: boolean;
      }>(helper.SENTINEL_COLLECTION)
      .insertOne({
        _id: helper.SENTINEL_ID,
        environment,
        purpose: helper.SENTINEL_PURPOSE,
        write_enabled: true,
      });
  }

  function options(markerSuffix: string) {
    return {
      mongoUri,
      qaEnv,
      marker: `QA #339 dev ${markerSuffix}`,
      stateFile,
      now: new Date('2026-07-17T00:00:00.000Z'),
    };
  }

  it('missing sentinel refuses before state persistence or fixture writes', async () => {
    await expect(helper.prepareFixtures(options('missing'))).rejects.toThrow(
      'sentinel',
    );

    expect(existsSync(stateFile)).toBe(false);
    await expect(
      client.db().collection('offers').countDocuments(),
    ).resolves.toBe(0);
    await expect(
      client.db().collection('coupons').countDocuments(),
    ).resolves.toBe(0);
  });

  it.each(['production', 'staging'])(
    'a %s sentinel refuses a dev run before fixture writes',
    async (environment) => {
      await provisionSentinel(environment);

      await expect(
        helper.prepareFixtures(options(`wrong-${environment}`)),
      ).rejects.toThrow('sentinel');
      expect(existsSync(stateFile)).toBe(false);
      await expect(
        client.db().collection('offers').countDocuments(),
      ).resolves.toBe(0);
      await expect(
        client.db().collection('coupons').countDocuments(),
      ).resolves.toBe(0);
    },
  );

  it('records exact IDs before an offer-only partial failure and cleanup removes that partial fixture', async () => {
    await provisionSentinel('dev');
    const runOptions = options('partial');

    await expect(
      helper.prepareFixtures({
        ...runOptions,
        afterOfferInsert: () => {
          throw new Error('injected partial failure');
        },
      }),
    ).rejects.toThrow('injected partial failure');

    const state = JSON.parse(readFileSync(stateFile, 'utf8')) as {
      offerId: string;
      couponIds: string[];
    };
    expect(ObjectId.isValid(state.offerId)).toBe(true);
    expect(state.couponIds).toHaveLength(2);
    await expect(
      client
        .db()
        .collection('offers')
        .countDocuments({ _id: new ObjectId(state.offerId) }),
    ).resolves.toBe(1);
    await expect(
      client.db().collection('coupons').countDocuments(),
    ).resolves.toBe(0);

    await helper.cleanupFixtures(runOptions);

    await expect(
      client
        .db()
        .collection('offers')
        .countDocuments({ _id: new ObjectId(state.offerId) }),
    ).resolves.toBe(0);
    await expect(
      client
        .db()
        .collection('coupons')
        .countDocuments({
          _id: { $in: state.couponIds.map((id) => new ObjectId(id)) },
        }),
    ).resolves.toBe(0);
  });

  it('ownership drift refuses every delete; restored ownership then reaches exact-ID final absence', async () => {
    await provisionSentinel('dev');
    const runOptions = options('ownership');
    await helper.prepareFixtures(runOptions);
    const state = JSON.parse(readFileSync(stateFile, 'utf8')) as {
      marker: string;
      offerId: string;
      couponIds: string[];
    };
    const driftedCouponId = new ObjectId(state.couponIds[0]);
    await client
      .db()
      .collection('coupons')
      .updateOne({ _id: driftedCouponId }, { $set: { qa_marker: 'drifted' } });

    await expect(helper.cleanupFixtures(runOptions)).rejects.toThrow(
      'ownership drift',
    );
    await expect(
      client
        .db()
        .collection('coupons')
        .countDocuments({
          _id: { $in: state.couponIds.map((id) => new ObjectId(id)) },
        }),
    ).resolves.toBe(2);
    await expect(
      client
        .db()
        .collection('offers')
        .countDocuments({ _id: new ObjectId(state.offerId) }),
    ).resolves.toBe(1);

    await client
      .db()
      .collection('coupons')
      .updateOne(
        { _id: driftedCouponId },
        { $set: { qa_marker: state.marker } },
      );
    await helper.cleanupFixtures(runOptions);

    await expect(
      client
        .db()
        .collection('coupons')
        .countDocuments({
          _id: { $in: state.couponIds.map((id) => new ObjectId(id)) },
        }),
    ).resolves.toBe(0);
    await expect(
      client
        .db()
        .collection('offers')
        .countDocuments({ _id: new ObjectId(state.offerId) }),
    ).resolves.toBe(0);
  });
});
