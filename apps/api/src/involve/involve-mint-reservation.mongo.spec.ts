import axios from 'axios';
import mongoose, { Connection, Model, Types } from 'mongoose';
import {
  AFFILIATE_MINT_RESERVATION_COLLECTION,
  InvolveService,
} from './involve.service';
import { Deeplink, DeeplinkSchema } from './schemas/deeplink.schema';
import {
  AFFILIATE_MINT_RESERVATION_LEGACY_TTL_INDEX,
  AFFILIATE_MINT_RESERVATION_TTL_INDEX,
  AffiliateMintReservation,
} from './schemas/affiliate-mint-reservation.schema';
import {
  localMongoDatabaseUri,
  optionalLocalMongoUri,
} from '../test-support/local-mongo-uri';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const baseMongoUri = optionalLocalMongoUri(process.env.QA_LOCAL_MONGO_URI);
const describeLocalMongo = baseMongoUri ? describe : describe.skip;
const itFastTtl =
  baseMongoUri && process.env.QA_LOCAL_MONGO_TTL_FAST === '1' ? it : it.skip;

describeLocalMongo('Involve distributed mint reservation (local Mongo)', () => {
  const databaseName = `gogocash_involve_reservation_${process.pid}_${Date.now()}`;
  let mongoUri: string;
  let connection: Connection;
  let deeplinkModel: Model<Deeplink>;
  let userId: Types.ObjectId;

  beforeAll(async () => {
    mongoUri = localMongoDatabaseUri(baseMongoUri!, databaseName);
    connection = await mongoose.createConnection(mongoUri).asPromise();
    deeplinkModel = connection.model(
      'InvolveReservationDeeplink',
      DeeplinkSchema,
      'deeplinks',
    );
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await connection.dropDatabase();
    userId = new Types.ObjectId();
  });

  afterAll(async () => {
    await connection.dropDatabase();
    await connection.close();
  });

  function makeService() {
    const cache = {
      get: jest.fn().mockResolvedValue('provider-token'),
      set: jest.fn().mockResolvedValue(undefined),
    };
    const userModel = {
      findOne: jest.fn().mockResolvedValue({ _id: userId }),
    };
    return new InvolveService(
      cache as never,
      {} as never,
      deeplinkModel,
      userModel as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {
        touchAttachInSession: jest.fn().mockResolvedValue({ tracked: false }),
      } as never,
      {
        journalCommandOwnedAssets: jest.fn().mockResolvedValue([]),
        processRequest: jest.fn().mockResolvedValue({ deleted: 0, pending: 0 }),
      } as never,
    );
  }

  it.each([
    ['general', ''],
    ['exact', 'https://merchant.example/coupon/339?code=SAFE'],
  ])(
    'two independent instances produce one %s provider call and one durable cache row',
    async (_label, destination) => {
      let releaseProvider!: () => void;
      const providerGate = new Promise<void>((resolve) => {
        releaseProvider = resolve;
      });
      mockedAxios.post.mockImplementation(async () => {
        await providerGate;
        return {
          data: {
            data: { tracking_link: 'https://track.example/one-provider-call' },
          },
        } as never;
      });
      const firstService = makeService();
      const secondService = makeService();
      const dto = {
        offer_id: 339,
        merchant_id: 7339,
        deeplink: destination,
      };

      const first = firstService.createAffiliate(dto, userId.toHexString());
      const second = secondService.createAffiliate(dto, userId.toHexString());
      for (
        let index = 0;
        index < 200 && mockedAxios.post.mock.calls.length < 1;
        index++
      ) {
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
      const providerCallsBeforeRelease = mockedAxios.post.mock.calls.length;
      releaseProvider();

      expect(providerCallsBeforeRelease).toBe(1);
      await expect(Promise.all([first, second])).resolves.toHaveLength(2);
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      await expect(deeplinkModel.countDocuments()).resolves.toBe(1);
      const reservations = connection.collection<AffiliateMintReservation>(
        AFFILIATE_MINT_RESERVATION_COLLECTION,
      );
      await expect(reservations.countDocuments()).resolves.toBe(1);
      await expect(reservations.findOne({})).resolves.toMatchObject({
        status: 'committed',
        destination_url: destination,
        tracked_deeplink: 'https://track.example/one-provider-call',
      });
    },
  );

  it('reconciles a durable provider result from the exact cache without a provider call', async () => {
    const service = makeService();
    await expect(service.ensureDestinationIdentityIndex()).resolves.toBe(true);
    const dto = {
      offer_id: 439,
      merchant_id: 7439,
      deeplink: 'https://merchant.example/reconcile?coupon=EXACT',
    };
    const identity = (service as any).destinationIdentity(
      dto,
      userId.toHexString(),
    );
    await deeplinkModel.create({
      offer_id: dto.offer_id,
      merchant_id: dto.merchant_id,
      user_id: userId,
      deeplink: 'https://track.example/reconcile',
      source: 'involve',
      destination_url: identity.destination_url,
      destination_hash: identity.destination_hash,
      click_date: [new Date()],
    });
    const reservation = (service as any).newReservation(
      identity,
      'owner',
      'attempt',
    );
    reservation.status = 'provider_succeeded';
    reservation.provider_succeeded_at = new Date();
    reservation.tracked_deeplink = 'https://track.example/reconcile';
    delete reservation.expires_at;
    const reservations = connection.collection<AffiliateMintReservation>(
      AFFILIATE_MINT_RESERVATION_COLLECTION,
    );
    await reservations.insertOne(reservation);

    await expect(
      service.createAffiliate(dto, userId.toHexString()),
    ).resolves.toBeTruthy();

    expect(mockedAxios.post).not.toHaveBeenCalled();
    await expect(
      reservations.findOne({ _id: reservation._id }),
    ).resolves.toMatchObject({
      status: 'committed',
      tracked_deeplink: 'https://track.example/reconcile',
      committed_at: expect.any(Date),
      expires_at: expect.any(Date),
    });
  });

  itFastTtl(
    'Mongo TTL deletes only expired provider-unstarted reservations',
    async () => {
      const service = makeService();
      const reservations = connection.collection<AffiliateMintReservation>(
        AFFILIATE_MINT_RESERVATION_COLLECTION,
      );
      await reservations.createIndex(
        { expires_at: 1 },
        {
          name: AFFILIATE_MINT_RESERVATION_LEGACY_TTL_INDEX,
          expireAfterSeconds: 0,
          partialFilterExpression: {
            status: { $in: ['committed', 'pre_mint_failed'] },
          },
        },
      );
      await expect(service.ensureMintReservationRetentionIndex()).resolves.toBe(
        true,
      );
      const retentionIndexes = await reservations.indexes();
      expect(
        retentionIndexes.find(
          (index) => index.name === AFFILIATE_MINT_RESERVATION_TTL_INDEX,
        ),
      ).toMatchObject({
        key: { expires_at: 1 },
        expireAfterSeconds: 0,
        partialFilterExpression: {
          status: { $in: ['reserved', 'committed', 'pre_mint_failed'] },
        },
      });
      expect(
        retentionIndexes.some(
          (index) => index.name === AFFILIATE_MINT_RESERVATION_LEGACY_TTL_INDEX,
        ),
      ).toBe(false);
      const now = new Date();
      const base = {
        source: 'involve' as const,
        user_id: userId,
        offer_id: 539,
        merchant_id: 7539,
        destination_hash: 'a'.repeat(64),
        destination_url: 'https://merchant.example/ttl',
        owner_token: 'owner',
        attempt_token: 'attempt',
        lease_expires_at: new Date(now.getTime() + 60_000),
        created_at: now,
        updated_at: now,
      };
      await reservations.insertMany([
        {
          ...base,
          _id: '1'.repeat(64),
          status: 'reserved',
          expires_at: new Date(now.getTime() - 60_000),
        },
        {
          ...base,
          _id: '2'.repeat(64),
          status: 'reserved',
          expires_at: new Date(now.getTime() + 60_000),
        },
        {
          ...base,
          _id: '3'.repeat(64),
          status: 'provider_started',
          provider_started_at: now,
          expires_at: new Date(now.getTime() - 60_000),
        },
        {
          ...base,
          _id: '4'.repeat(64),
          status: 'provider_succeeded',
          provider_started_at: now,
          provider_succeeded_at: now,
          tracked_deeplink: 'https://track.example/ttl',
          expires_at: new Date(now.getTime() - 60_000),
        },
      ]);

      const deadline = Date.now() + 15_000;
      while (
        Date.now() < deadline &&
        (await reservations.countDocuments({ _id: '1'.repeat(64) })) > 0
      ) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }

      await expect(
        reservations.countDocuments({ _id: '1'.repeat(64) }),
      ).resolves.toBe(0);
      await expect(
        reservations.countDocuments({
          _id: { $in: ['2'.repeat(64), '3'.repeat(64), '4'.repeat(64)] },
        }),
      ).resolves.toBe(3);
    },
    20_000,
  );
});
