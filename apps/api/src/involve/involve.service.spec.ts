import {
  BadRequestException,
  BadGatewayException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Types } from 'mongoose';
import axios from 'axios';
import { InvolveService } from './involve.service';
import { buildUserConversionScopeFilter } from 'src/withdraw/conversion-user-id.util';
import { Offer } from '../offer/schemas/offer.schema';
import { Deeplink } from './schemas/deeplink.schema';
import { User } from '../user/schemas/user.schema';
import { Category } from '../offer/schemas/category.schema';
import { Conversion } from '../withdraw/schemas/conversion.schema';
import { FeeRate } from '../withdraw/schemas/feeRate.schema';
import {
  AFFILIATE_MINT_RESERVATION_RETENTION_MS,
  AFFILIATE_MINT_RESERVATION_LEGACY_TTL_INDEX,
  AFFILIATE_MINT_RESERVATION_TTL_INDEX,
} from './schemas/affiliate-mint-reservation.schema';
import { CategoryIntegrityService } from 'src/policy/category-integrity.service';
import { PolicyMediaAssetRegistryService } from 'src/policy/policy-media-asset-registry.service';
import { PolicyMediaCleanupService } from 'src/policy/policy-media-cleanup.service';

// axios is the involve.asia HTTP seam — never let a test hit the network.
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// convertToUSD / convertToTHB hit a live exchange-rate API via global fetch.
// Mock the wrapper module so currency math is deterministic and offline.
jest.mock('src/utils/helper', () => ({
  convertToUSD: jest.fn(),
  convertToTHB: jest.fn(),
}));
import { convertToUSD, convertToTHB } from 'src/utils/helper';
const mockConvertToUSD = convertToUSD as jest.Mock;
const mockConvertToTHB = convertToTHB as jest.Mock;

type AnyMockMap = Record<string, jest.Mock>;
type DeeplinkModelMock = {
  aggregate: jest.Mock;
  collection: { createIndex: jest.Mock; indexes: jest.Mock };
  db: { collection: jest.Mock };
  create: jest.Mock;
  findOne: jest.Mock;
  findOneAndUpdate: jest.Mock;
};

function query<T>(value: T) {
  const result = {
    session: jest.fn(),
    lean: jest.fn().mockResolvedValue(value),
  };
  result.session.mockReturnValue(result);
  return result;
}

function reservationValueMatches(actual: unknown, expected: unknown): boolean {
  if (expected instanceof Types.ObjectId) {
    return actual instanceof Types.ObjectId && actual.equals(expected);
  }
  if (expected && typeof expected === 'object' && !(expected instanceof Date)) {
    const operators = expected as Record<string, unknown>;
    if ('$exists' in operators) {
      return operators.$exists ? actual !== undefined : actual === undefined;
    }
    if ('$gt' in operators) {
      return Number(actual) > Number(operators.$gt);
    }
    if ('$lte' in operators) {
      return Number(actual) <= Number(operators.$lte);
    }
    if ('$in' in operators) {
      return (operators.$in as unknown[]).includes(actual);
    }
  }
  return actual === expected;
}

function makeReservationCollection(store: Map<string, any>) {
  const matches = (
    doc: Record<string, unknown>,
    filter: Record<string, unknown>,
  ) =>
    Object.entries(filter).every(([key, expected]) =>
      reservationValueMatches(doc[key], expected),
    );
  return {
    createIndex: jest.fn().mockResolvedValue('retention-index'),
    dropIndex: jest.fn().mockResolvedValue(undefined),
    insertOne: jest.fn(async (doc: Record<string, any>) => {
      if (store.has(doc._id)) {
        throw Object.assign(new Error('duplicate reservation'), {
          code: 11000,
        });
      }
      store.set(doc._id, doc);
      return { insertedId: doc._id };
    }),
    findOne: jest.fn(async (filter: Record<string, unknown>) => {
      const doc = store.get(String(filter._id));
      return doc && matches(doc, filter) ? doc : null;
    }),
    findOneAndUpdate: jest.fn(
      async (
        filter: Record<string, unknown>,
        update: {
          $set?: Record<string, unknown>;
          $unset?: Record<string, unknown>;
        },
      ) => {
        const doc = store.get(String(filter._id));
        if (!doc || !matches(doc, filter)) return null;
        Object.assign(doc, update.$set ?? {});
        for (const key of Object.keys(update.$unset ?? {})) delete doc[key];
        return doc;
      },
    ),
    updateOne: jest.fn(
      async (
        filter: Record<string, unknown>,
        update: {
          $set?: Record<string, unknown>;
          $unset?: Record<string, unknown>;
        },
      ) => {
        const doc = store.get(String(filter._id));
        if (!doc || !matches(doc, filter)) return { matchedCount: 0 };
        Object.assign(doc, update.$set ?? {});
        for (const key of Object.keys(update.$unset ?? {})) delete doc[key];
        return { matchedCount: 1 };
      },
    ),
  };
}

const destinationIndex = (overrides: Record<string, unknown> = {}) => ({
  name: 'affiliate_destination_identity_unique_v1',
  unique: true,
  key: {
    source: 1,
    user_id: 1,
    offer_id: 1,
    merchant_id: 1,
    destination_hash: 1,
  },
  partialFilterExpression: {
    source: { $type: 'string' },
    destination_hash: { $type: 'string' },
  },
  ...overrides,
});

describe('InvolveService', () => {
  let service: InvolveService;
  let cache: AnyMockMap;
  let offerModel: AnyMockMap;
  let deeplinkModel: DeeplinkModelMock;
  let userModel: AnyMockMap;
  let categoryModel: AnyMockMap;
  let conversionModel: AnyMockMap;
  let feeRateModel: AnyMockMap;
  let reservationStore: Map<string, any>;
  let reservationCollection: ReturnType<typeof makeReservationCollection>;
  let categoryIntegrity: {
    withNormalWrite: jest.Mock;
    withInvolveCategoryAssignment: jest.Mock;
    withIntegrityMutation: jest.Mock;
  };
  let policyMediaRegistry: { touchAttachInSession: jest.Mock };
  let policyMediaCleanup: {
    journalCommandOwnedAssets: jest.Mock;
    processRequest: jest.Mock;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.INVOLVE_SECRET = 'secret-new';
    process.env.INVOLVE_SECRET_OLD = 'secret-old';

    cache = { get: jest.fn(), set: jest.fn().mockResolvedValue(undefined) };
    offerModel = {
      updateOne: jest.fn().mockResolvedValue({}),
      findOne: jest.fn().mockReturnValue(query(null)),
      find: jest.fn(),
      aggregate: jest.fn(),
    };
    reservationStore = new Map();
    reservationCollection = makeReservationCollection(reservationStore);
    deeplinkModel = {
      aggregate: jest.fn().mockResolvedValue([]),
      collection: {
        createIndex: jest.fn().mockResolvedValue('index-name'),
        indexes: jest.fn().mockResolvedValue([]),
      },
      db: { collection: jest.fn().mockReturnValue(reservationCollection) },
      create: jest.fn(),
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };
    userModel = { findOne: jest.fn() };
    categoryModel = { updateOne: jest.fn().mockResolvedValue({}) };
    conversionModel = { aggregate: jest.fn() };
    feeRateModel = { findOne: jest.fn() };
    categoryIntegrity = {
      withNormalWrite: jest.fn(({ enforced }) => enforced()),
      withInvolveCategoryAssignment: jest.fn((_category, writer) =>
        writer({ categories_normalized: 'test' }, { id: 'session' }),
      ),
      withIntegrityMutation: jest.fn((writer) =>
        writer({ id: 'integrity-session' }),
      ),
    };
    policyMediaRegistry = {
      touchAttachInSession: jest.fn().mockResolvedValue({ tracked: false }),
    };
    policyMediaCleanup = {
      journalCommandOwnedAssets: jest
        .fn()
        .mockResolvedValue([{ _id: 'involve-cleanup' }]),
      processRequest: jest.fn().mockResolvedValue({ deleted: 1, pending: 0 }),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        InvolveService,
        { provide: CACHE_MANAGER, useValue: cache },
        { provide: getModelToken(Offer.name), useValue: offerModel },
        { provide: getModelToken(Deeplink.name), useValue: deeplinkModel },
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: getModelToken(Category.name), useValue: categoryModel },
        { provide: getModelToken(Conversion.name), useValue: conversionModel },
        { provide: getModelToken(FeeRate.name), useValue: feeRateModel },
        {
          provide: CategoryIntegrityService,
          useValue: categoryIntegrity,
        },
        {
          provide: PolicyMediaAssetRegistryService,
          useValue: policyMediaRegistry,
        },
        { provide: PolicyMediaCleanupService, useValue: policyMediaCleanup },
      ],
    }).compile();

    service = moduleRef.get<InvolveService>(InvolveService);
  });

  const constructIndependentService = () =>
    new InvolveService(
      cache as never,
      offerModel as never,
      deeplinkModel as never,
      userModel as never,
      categoryModel as never,
      conversionModel as never,
      feeRateModel as never,
      {} as never,
      {
        touchAttachInSession: jest.fn().mockResolvedValue({ tracked: false }),
      } as never,
      {
        journalCommandOwnedAssets: jest.fn().mockResolvedValue([]),
        processRequest: jest.fn().mockResolvedValue({ deleted: 0, pending: 0 }),
      } as never,
    );

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signIn', () => {
    // The bearer token returned by /authenticate must be cached under the
    // exact key the rest of the service reads, or every downstream call re-auths.
    it('signIn > given valid credentials > then caches the token under access_token_involve', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { data: { token: 'tok-new' } },
      });

      const result = await service.signIn();

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.involve.asia/api/authenticate',
        { secret: 'secret-new', key: 'general' },
        { timeout: 10_000 },
      );
      expect(cache.set).toHaveBeenCalledWith('access_token_involve', 'tok-new');
      expect(result).toEqual({ data: { token: 'tok-new' } });
    });

    // Staging incident 2026-07-10: a rejected INVOLVE_SECRET surfaced as a bare
    // 500 from /gototrack/activate. Auth failures against Involve must map to a
    // 502 with a stable code — and the thrown payload must never carry the
    // secret (the raw axios error embeds the request body).
    it('signIn > given Involve rejects the secret > then throws 502 GOGOSENSE_UPSTREAM_AUTH_FAILED without leaking the secret', async () => {
      const upstreamError = new Error(
        'Request failed with status code 401',
      ) as Error & {
        response?: unknown;
        config?: unknown;
      };
      upstreamError.response = { status: 401, data: { status_code: 401 } };
      upstreamError.config = {
        data: JSON.stringify({ secret: 'secret-new', key: 'general' }),
      };
      mockedAxios.post.mockRejectedValue(upstreamError);

      let caught: unknown;
      try {
        await service.signIn();
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeInstanceOf(HttpException);
      expect((caught as HttpException).getStatus()).toBe(502);
      const body = (caught as HttpException).getResponse();
      expect(body).toMatchObject({
        code: 'GOGOSENSE_UPSTREAM_AUTH_FAILED',
        upstreamStatusCode: 401,
      });
      expect(JSON.stringify(body)).not.toContain('secret-new');
    });

    it('signInOld > given valid credentials > then caches the token under access_token_involve_old', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { data: { token: 'tok-old' } },
      });

      await service.signInOld();

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.involve.asia/api/authenticate',
        { secret: 'secret-old', key: 'general' },
        { timeout: 10_000 },
      );
      expect(cache.set).toHaveBeenCalledWith(
        'access_token_involve_old',
        'tok-old',
      );
    });
  });

  describe('createDeeplinkMongo', () => {
    it('createDeeplinkMongo > given an invalid user_id > then returns an actionable 400 before any write', () => {
      expect(() =>
        service.createDeeplinkMongo({
          offer_id: 10,
          merchant_id: 20,
          deeplink: 'https://track/x',
          user_id: 'not-an-object-id',
        } as never),
      ).toThrow(BadRequestException);
      expect(deeplinkModel.create).not.toHaveBeenCalled();
    });

    // user_id arrives as a string from the request; it must be persisted as an
    // ObjectId so later equality lookups by user actually match.
    it('createDeeplinkMongo > given a string user_id > then persists it as an ObjectId with seeded click_date', () => {
      const created = { _id: 'dl-1' };
      deeplinkModel.create.mockReturnValue(created);
      const userId = new Types.ObjectId().toString();

      const result = service.createDeeplinkMongo({
        offer_id: 10,
        merchant_id: 20,
        deeplink: 'https://track/x',
        user_id: userId,
      } as never);

      expect(result).toBe(created);
      const persisted = deeplinkModel.create.mock.calls[0][0];
      expect(persisted.user_id).toBeInstanceOf(Types.ObjectId);
      expect(persisted.user_id.toString()).toBe(userId);
      expect(persisted.click_date).toHaveLength(1);
      expect(persisted.click_date[0]).toBeInstanceOf(Date);
      expect(persisted).toMatchObject({
        destination_url: '',
        source: 'involve',
      });
      expect(persisted.destination_hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('createAffiliate', () => {
    // A missing user is a client-state problem, not a server fault: it must be
    // a 404 NotFoundException, not a plain Error that Nest renders as a 500.
    it('createAffiliate > given an unknown user id > then throws NotFoundException (404), not a 500', async () => {
      userModel.findOne.mockResolvedValue(null);

      await expect(
        service.createAffiliate(
          { offer_id: 1, merchant_id: 2, deeplink: '' } as never,
          new Types.ObjectId().toString(),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    // A malformed (non-24-hex) id is a validation error, while a well-formed
    // missing id remains a 404. Reject before any Mongo or affiliate call.
    it('createAffiliate > given a malformed (non-24-hex) id > then throws an actionable 400 before any lookup', async () => {
      await expect(
        service.createAffiliate(
          {
            offer_id: 1,
            merchant_id: 2,
            deeplink: 'QA #34 inert deeplink validation-only',
          } as never,
          'not-a-valid-object-id',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(userModel.findOne).not.toHaveBeenCalled();
      expect(deeplinkModel.findOne).not.toHaveBeenCalled();
      expect(deeplinkModel.create).not.toHaveBeenCalled();
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('createAffiliateAi > given an unknown email > then throws NotFoundException (404)', async () => {
      userModel.findOne.mockResolvedValue(null);

      await expect(
        service.createAffiliateAi(
          { offer_id: 1, merchant_id: 2 } as never,
          'nobody@example.com',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('createAffiliate > given the same canonical destination > then reuses only that source-scoped cache entry', async () => {
      const user = { _id: new Types.ObjectId() };
      userModel.findOne.mockResolvedValue(user);
      deeplinkModel.collection.indexes.mockResolvedValue([destinationIndex()]);
      deeplinkModel.findOne.mockResolvedValue({
        deeplink: 'https://existing.example/tracked',
        destination_url: 'https://merchant.example/deal?coupon=1',
        source: 'involve',
      });
      deeplinkModel.findOneAndUpdate.mockResolvedValue({ _id: 'dl-existing' });

      const result = await service.createAffiliate(
        {
          offer_id: 7,
          merchant_id: 8,
          deeplink: ' HTTPS://MERCHANT.EXAMPLE:443/deal?coupon=1 ',
        } as never,
        user._id.toString(),
      );

      expect(result).toEqual({ _id: 'dl-existing' });
      expect(deeplinkModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          destination_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
          merchant_id: 8,
          offer_id: 7,
          source: 'involve',
        }),
      );
      expect(deeplinkModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
      const [, update, opts] = deeplinkModel.findOneAndUpdate.mock.calls[0];
      expect(update.$push.click_date).toBeInstanceOf(Date);
      expect(opts).toEqual({ new: true });
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('createAffiliate > given a hash lookup collision with a different full destination > then fails closed without provider use', async () => {
      const user = { _id: new Types.ObjectId() };
      userModel.findOne.mockResolvedValue(user);
      deeplinkModel.findOne.mockResolvedValueOnce({
        deeplink: 'https://existing.example/wrong',
        destination_url: 'https://merchant.example/a',
        source: 'involve',
      });
      await expect(
        service.createAffiliate(
          {
            offer_id: 7,
            merchant_id: 8,
            deeplink: 'https://merchant.example/b',
          } as never,
          user._id.toString(),
        ),
      ).rejects.toMatchObject({ status: 503 });

      expect(mockedAxios.post).not.toHaveBeenCalled();
      expect(deeplinkModel.findOneAndUpdate).not.toHaveBeenCalled();
      expect(deeplinkModel.create).not.toHaveBeenCalled();
    });

    it('createAffiliate > given a different destination hash > then mints and persists a separate exact target', async () => {
      const user = { _id: new Types.ObjectId() };
      userModel.findOne.mockResolvedValue(user);
      deeplinkModel.findOne.mockResolvedValue(null);
      cache.get.mockResolvedValue('tok');
      mockedAxios.post.mockResolvedValue({
        data: { data: { tracking_link: 'https://tracked.example/b' } },
      });
      deeplinkModel.create.mockResolvedValue({ _id: 'dl-b' });

      await service.createAffiliate(
        {
          offer_id: 7,
          merchant_id: 8,
          deeplink: 'https://merchant.example/b',
        } as never,
        user._id.toString(),
      );

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(deeplinkModel.create.mock.calls[0][0]).toMatchObject({
        destination_url: 'https://merchant.example/b',
      });
    });

    it('createAffiliate > given a nonempty target and only a hashless legacy shop cache > then mints instead of reusing legacy', async () => {
      const user = { _id: new Types.ObjectId() };
      userModel.findOne.mockResolvedValue(user);
      deeplinkModel.findOne.mockResolvedValue(null);
      cache.get.mockResolvedValue('tok');
      mockedAxios.post.mockResolvedValue({
        data: { data: { tracking_link: 'https://tracked.example/coupon' } },
      });
      deeplinkModel.create.mockResolvedValue({ _id: 'dl-coupon' });

      await service.createAffiliate(
        {
          offer_id: 7,
          merchant_id: 8,
          deeplink: 'https://merchant.example/coupon',
        } as never,
        user._id.toString(),
      );

      expect(deeplinkModel.findOne).toHaveBeenCalledTimes(2);
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });

    it('createAffiliate > given an empty general target and a hashless legacy Involve cache > then reuses it read-only', async () => {
      const user = { _id: new Types.ObjectId() };
      userModel.findOne.mockResolvedValue(user);
      deeplinkModel.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({
        deeplink: 'https://existing.example/general',
        source: 'involve',
      });
      deeplinkModel.findOneAndUpdate.mockResolvedValue({ _id: 'legacy' });

      await service.createAffiliate(
        { offer_id: 7, merchant_id: 8, deeplink: '' } as never,
        user._id.toString(),
      );

      expect(deeplinkModel.findOne).toHaveBeenCalledTimes(2);
      expect(deeplinkModel.findOneAndUpdate).not.toHaveBeenCalled();
      expect(reservationCollection.insertOne).not.toHaveBeenCalled();
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('createAffiliate > given an empty target > then only considers hashless rows that are also general destinations', async () => {
      const user = { _id: new Types.ObjectId() };
      userModel.findOne.mockResolvedValue(user);
      deeplinkModel.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({
        deeplink: 'https://existing.example/general',
        source: 'involve',
      });
      deeplinkModel.findOneAndUpdate.mockResolvedValue({ _id: 'legacy' });

      await service.createAffiliate(
        { offer_id: 7, merchant_id: 8, deeplink: '' } as never,
        user._id.toString(),
      );

      expect(deeplinkModel.findOne.mock.calls[1][0]).toEqual(
        expect.objectContaining({
          destination_hash: { $exists: false },
          $and: expect.arrayContaining([
            {
              $or: [
                { destination_url: '' },
                { destination_url: { $exists: false } },
              ],
            },
          ]),
        }),
      );
    });

    it('createAffiliate > given a cache row from another provider source > then never reuses it', async () => {
      const user = { _id: new Types.ObjectId() };
      userModel.findOne.mockResolvedValue(user);
      deeplinkModel.findOne.mockResolvedValue(null);
      cache.get.mockResolvedValue('tok');
      mockedAxios.post.mockResolvedValue({
        data: { data: { tracking_link: 'https://involve.example/tracked' } },
      });
      deeplinkModel.create.mockResolvedValue({ _id: 'involve-row' });

      await service.createAffiliate(
        {
          offer_id: 7,
          merchant_id: 8,
          deeplink: 'https://merchant.example/coupon',
        } as never,
        user._id.toString(),
      );

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(deeplinkModel.findOneAndUpdate).not.toHaveBeenCalled();
      expect(deeplinkModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'involve' }),
      );
    });

    // First-time affiliate: must create the deeplink on Involve, then persist
    // the returned tracking_link locally.
    it('createAffiliate > given no existing deeplink > then generates on Involve and stores the tracking_link', async () => {
      const user = { _id: new Types.ObjectId() };
      userModel.findOne.mockResolvedValue(user);
      deeplinkModel.findOne.mockResolvedValue(null);
      cache.get.mockResolvedValue('tok'); // token already cached
      mockedAxios.post.mockResolvedValue({
        data: { data: { tracking_link: 'https://track/new' } },
      });
      deeplinkModel.create.mockReturnValue({ _id: 'dl-new' });

      const result = await service.createAffiliate(
        { offer_id: 11, merchant_id: 22, deeplink: '' } as never,
        user._id.toString(),
      );

      expect(result).toEqual({ _id: 'dl-new' });
      const persisted = deeplinkModel.create.mock.calls[0][0];
      expect(persisted.deeplink).toBe('https://track/new');
      expect(persisted).toMatchObject({
        destination_url: '',
        source: 'involve',
      });
      expect(persisted.destination_hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('createAffiliate > given two concurrent identical requests > then one provider mint wins and both calls resolve safely', async () => {
      const user = { _id: new Types.ObjectId() };
      userModel.findOne.mockResolvedValue(user);
      deeplinkModel.findOne.mockResolvedValue(null);
      cache.get.mockResolvedValue('tok');
      let releaseProvider!: () => void;
      const providerGate = new Promise<void>((resolve) => {
        releaseProvider = resolve;
      });
      mockedAxios.post.mockImplementation(async () => {
        await providerGate;
        return {
          data: { data: { tracking_link: 'https://track.example/concurrent' } },
        };
      });
      deeplinkModel.create.mockResolvedValue({ _id: 'winner' });
      deeplinkModel.findOneAndUpdate.mockResolvedValue({ _id: 'winner' });
      const input = {
        offer_id: 11,
        merchant_id: 22,
        deeplink: 'https://merchant.example/exact',
      } as never;

      const first = service.createAffiliate(input, user._id.toString());
      const second = service.createAffiliate(input, user._id.toString());
      await Promise.resolve();
      releaseProvider();

      await expect(Promise.all([first, second])).resolves.toHaveLength(2);
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(deeplinkModel.create).toHaveBeenCalledTimes(1);
    });

    it('createAffiliate > given the provider returns a credentialed tracked URL > then rejects it and never persists', async () => {
      const user = { _id: new Types.ObjectId() };
      userModel.findOne.mockResolvedValue(user);
      deeplinkModel.findOne.mockResolvedValue(null);
      cache.get.mockResolvedValue('tok');
      mockedAxios.post.mockResolvedValue({
        data: {
          data: { tracking_link: 'https://user:secret@track.example/x' },
        },
      });

      await expect(
        service.createAffiliate(
          {
            offer_id: 11,
            merchant_id: 22,
            deeplink: 'https://merchant.example/exact',
          } as never,
          user._id.toString(),
        ),
      ).rejects.toBeInstanceOf(BadGatewayException);
      expect(deeplinkModel.create).not.toHaveBeenCalled();
    });
  });

  describe('distributed mint reservations', () => {
    it('creates an absolute TTL index restricted to safe reservation states', async () => {
      await expect(service.ensureMintReservationRetentionIndex()).resolves.toBe(
        true,
      );

      expect(reservationCollection.createIndex).toHaveBeenCalledWith(
        { expires_at: 1 },
        {
          name: AFFILIATE_MINT_RESERVATION_TTL_INDEX,
          expireAfterSeconds: 0,
          partialFilterExpression: {
            status: {
              $in: ['reserved', 'committed', 'pre_mint_failed'],
            },
          },
        },
      );
      expect(reservationCollection.dropIndex).toHaveBeenCalledWith(
        AFFILIATE_MINT_RESERVATION_LEGACY_TTL_INDEX,
      );
      expect(
        reservationCollection.createIndex.mock.invocationCallOrder[0],
      ).toBeLessThan(
        reservationCollection.dropIndex.mock.invocationCallOrder[0],
      );
    });

    it('keeps the legacy TTL index when creating v2 fails', async () => {
      reservationCollection.createIndex.mockRejectedValueOnce(
        Object.assign(new Error('index options conflict'), { code: 86 }),
      );
      const warn = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);

      await expect(service.ensureMintReservationRetentionIndex()).resolves.toBe(
        false,
      );

      expect(reservationCollection.dropIndex).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('retention index is unavailable'),
      );
      warn.mockRestore();
    });

    it('gives each new provider-unstarted reservation an absolute 90-day expiry', () => {
      const now = new Date('2026-07-17T00:00:00.000Z');
      const identity = (service as any).destinationIdentity(
        {
          offer_id: 339,
          merchant_id: 7339,
          deeplink: 'https://merchant.example/reserved-ttl',
        },
        new Types.ObjectId().toString(),
      );

      const reservation = (service as any).newReservation(
        identity,
        'owner',
        'attempt',
        now,
      );

      expect(reservation.status).toBe('reserved');
      expect(reservation.expires_at).toEqual(
        new Date(now.getTime() + AFFILIATE_MINT_RESERVATION_RETENTION_MS),
      );
    });

    it('renews an expired unstarted reservation TTL and atomically removes it before provider start', async () => {
      const identity = (service as any).destinationIdentity(
        {
          offer_id: 339,
          merchant_id: 7339,
          deeplink: 'https://merchant.example/reserved-reclaim',
        },
        new Types.ObjectId().toString(),
      );
      const expired = (service as any).newReservation(
        identity,
        'old-owner',
        'old-attempt',
        new Date(Date.now() - AFFILIATE_MINT_RESERVATION_RETENTION_MS - 1),
      );
      reservationStore.set(expired._id, expired);

      const reclaimed = await (
        service as any
      ).reclaimExpiredUnstartedReservation(
        identity,
        'new-owner',
        'new-attempt',
      );
      expect(reclaimed).toMatchObject({
        status: 'reserved',
        owner_token: 'new-owner',
        attempt_token: 'new-attempt',
      });
      expect(reclaimed.expires_at.getTime()).toBeGreaterThan(Date.now());

      await expect(
        (service as any).markProviderStarted(
          identity,
          'new-owner',
          'new-attempt',
        ),
      ).resolves.toBe(true);
      expect(reservationStore.get(expired._id)).toMatchObject({
        status: 'provider_started',
      });
      expect(reservationStore.get(expired._id)).not.toHaveProperty(
        'expires_at',
      );
    });

    it.each([
      ['the exact partial index', destinationIndex()],
      [
        'a stricter non-partial index',
        destinationIndex({ partialFilterExpression: undefined }),
      ],
    ])('accepts %s as a safe uniqueness gate', async (_label, index) => {
      deeplinkModel.collection.indexes.mockResolvedValue([index]);

      await expect(
        (service as any).hasDestinationIdentityIndex(),
      ).resolves.toBe(true);
    });

    it.each([
      ['a non-unique index', destinationIndex({ unique: false })],
      [
        'an index with an extra key',
        destinationIndex({
          key: {
            source: 1,
            user_id: 1,
            offer_id: 1,
            merchant_id: 1,
            destination_hash: 1,
            unsafe_extra: 1,
          },
        }),
      ],
      [
        'an index with an extra partial predicate',
        destinationIndex({
          partialFilterExpression: {
            source: { $type: 'string' },
            destination_hash: { $type: 'string' },
            environment: 'dev',
          },
        }),
      ],
      [
        'an index whose partial predicate excludes string hashes',
        destinationIndex({
          partialFilterExpression: {
            source: { $type: 'string' },
            destination_hash: { $type: 'number' },
          },
        }),
      ],
    ])('rejects %s as the uniqueness gate', async (_label, index) => {
      deeplinkModel.collection.indexes.mockResolvedValue([index]);

      await expect(
        (service as any).hasDestinationIdentityIndex(),
      ).resolves.toBe(false);
    });

    it.each([
      ['general', ''],
      ['exact', 'https://merchant.example/coupon/339'],
    ])(
      'two independent service instances coalesce one %s provider mint and one cache row',
      async (_label, destination) => {
        const user = { _id: new Types.ObjectId() };
        userModel.findOne.mockResolvedValue(user);
        cache.get.mockResolvedValue('tok');
        let persisted: Record<string, any> | null = null;
        deeplinkModel.findOne.mockImplementation(
          async (filter: Record<string, any>) => {
            if (
              persisted &&
              typeof filter.destination_hash === 'string' &&
              filter.destination_hash === persisted.destination_hash
            ) {
              return persisted;
            }
            return null;
          },
        );
        deeplinkModel.create.mockImplementation(
          async (doc: Record<string, any>) => {
            if (persisted) {
              throw Object.assign(new Error('duplicate cache row'), {
                code: 11000,
              });
            }
            persisted = { _id: 'cache-winner', ...doc };
            return persisted;
          },
        );
        deeplinkModel.findOneAndUpdate.mockImplementation(
          async () => persisted,
        );

        let releaseProvider!: () => void;
        const providerGate = new Promise<void>((resolve) => {
          releaseProvider = resolve;
        });
        mockedAxios.post.mockImplementation(async () => {
          await providerGate;
          return {
            data: { data: { tracking_link: 'https://track.example/winner' } },
          };
        });
        const firstService = constructIndependentService();
        const secondService = constructIndependentService();
        const dto = {
          offer_id: 339,
          merchant_id: 7339,
          deeplink: destination,
        } as never;

        const first = firstService.createAffiliate(dto, user._id.toString());
        const second = secondService.createAffiliate(dto, user._id.toString());
        for (
          let index = 0;
          index < 20 && mockedAxios.post.mock.calls.length < 1;
          index++
        ) {
          await Promise.resolve();
        }
        releaseProvider();

        await expect(Promise.all([first, second])).resolves.toHaveLength(2);
        expect(mockedAxios.post).toHaveBeenCalledTimes(1);
        expect(deeplinkModel.create).toHaveBeenCalledTimes(1);
        expect(persisted).toMatchObject({
          destination_url: destination,
          source: 'involve',
        });
        expect(Array.from(reservationStore.values())).toHaveLength(1);
        expect(Array.from(reservationStore.values())[0]).toMatchObject({
          status: 'committed',
          tracked_deeplink: 'https://track.example/winner',
        });
      },
    );

    it('requires the unique destination index before a new general mint', async () => {
      const user = { _id: new Types.ObjectId() };
      userModel.findOne.mockResolvedValue(user);
      deeplinkModel.findOne.mockResolvedValue(null);
      deeplinkModel.collection.createIndex.mockRejectedValue(
        new Error('index unavailable'),
      );

      await expect(
        service.createAffiliate(
          { offer_id: 339, merchant_id: 7339, deeplink: '' } as never,
          user._id.toString(),
        ),
      ).rejects.toMatchObject({ status: 503 });
      expect(reservationCollection.insertOne).not.toHaveBeenCalled();
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('rechecks unique-index readiness before every new mint after an index is dropped', async () => {
      const user = { _id: new Types.ObjectId() };
      userModel.findOne.mockResolvedValue(user);
      deeplinkModel.findOne.mockResolvedValue(null);
      cache.get.mockResolvedValue('tok');
      mockedAxios.post.mockResolvedValue({
        data: { data: { tracking_link: 'https://track.example/first' } },
      });
      deeplinkModel.create.mockResolvedValue({ _id: 'first-cache' });

      await expect(
        service.createAffiliate(
          {
            offer_id: 339,
            merchant_id: 7339,
            deeplink: 'https://merchant.example/first',
          } as never,
          user._id.toString(),
        ),
      ).resolves.toEqual({ _id: 'first-cache' });
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);

      deeplinkModel.collection.indexes.mockResolvedValue([]);
      deeplinkModel.collection.createIndex.mockRejectedValue(
        new Error('index was dropped and cannot be rebuilt'),
      );

      await expect(
        service.createAffiliate(
          {
            offer_id: 340,
            merchant_id: 7340,
            deeplink: 'https://merchant.example/second',
          } as never,
          user._id.toString(),
        ),
      ).rejects.toMatchObject({ status: 503 });
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });

    it('reclaims an expired reservation only when the provider never started', async () => {
      const user = { _id: new Types.ObjectId() };
      userModel.findOne.mockResolvedValue(user);
      deeplinkModel.findOne.mockResolvedValue(null);
      cache.get.mockResolvedValue('tok');
      mockedAxios.post.mockResolvedValue({
        data: { data: { tracking_link: 'https://track.example/recovered' } },
      });
      deeplinkModel.create.mockResolvedValue({ _id: 'recovered' });
      const dto = {
        offer_id: 340,
        merchant_id: 7340,
        deeplink: 'https://merchant.example/recover',
      } as never;
      const identity = (service as any).destinationIdentity(
        dto,
        user._id.toString(),
      );
      const expired = (service as any).newReservation(
        identity,
        'dead-owner',
        'dead-attempt',
        new Date(Date.now() - 60_000),
      );
      reservationStore.set(expired._id, expired);

      await expect(
        service.createAffiliate(dto, user._id.toString()),
      ).resolves.toEqual({ _id: 'recovered' });
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(reservationStore.get(expired._id)).toMatchObject({
        status: 'committed',
        tracked_deeplink: 'https://track.example/recovered',
      });
      expect(reservationStore.get(expired._id).attempt_token).not.toBe(
        'dead-attempt',
      );
    });

    it('records missing authentication token as a safe pre-mint failure and retries without a duplicate provider call', async () => {
      const user = { _id: new Types.ObjectId() };
      userModel.findOne.mockResolvedValue(user);
      deeplinkModel.findOne.mockResolvedValue(null);
      cache.get.mockResolvedValue(undefined);
      mockedAxios.post.mockResolvedValueOnce({ data: { data: {} } });
      const dto = {
        offer_id: 344,
        merchant_id: 7344,
        deeplink: 'https://merchant.example/auth-retry?coupon=EXACT',
      } as never;

      await expect(
        service.createAffiliate(dto, user._id.toString()),
      ).rejects.toMatchObject({ status: 502 });
      const failed = Array.from(reservationStore.values())[0];
      expect(failed).toMatchObject({
        status: 'pre_mint_failed',
        failure_code: 'upstream_auth_failed',
      });
      expect(failed).not.toHaveProperty('provider_started_at');
      expect(failed.expires_at.getTime()).toBeGreaterThanOrEqual(
        failed.pre_mint_failed_at.getTime() +
          AFFILIATE_MINT_RESERVATION_RETENTION_MS -
          5,
      );
      expect(deeplinkModel.create).not.toHaveBeenCalled();

      mockedAxios.post
        .mockResolvedValueOnce({ data: { data: { token: 'fresh-token' } } })
        .mockResolvedValueOnce({
          data: { data: { tracking_link: 'https://track.example/auth-retry' } },
        });
      deeplinkModel.create.mockResolvedValue({ _id: 'auth-retry-cache' });

      await expect(
        service.createAffiliate(dto, user._id.toString()),
      ).resolves.toEqual({ _id: 'auth-retry-cache' });
      expect(mockedAxios.post).toHaveBeenCalledTimes(3);
      expect(Array.from(reservationStore.values())[0]).toMatchObject({
        status: 'committed',
        tracked_deeplink: 'https://track.example/auth-retry',
      });
    });

    it('records an authentication request failure before provider start', async () => {
      const user = { _id: new Types.ObjectId() };
      userModel.findOne.mockResolvedValue(user);
      deeplinkModel.findOne.mockResolvedValue(null);
      cache.get.mockResolvedValue(undefined);
      mockedAxios.post.mockRejectedValueOnce(
        Object.assign(new Error('auth rejected'), {
          response: { status: 401, data: { status_code: 401 } },
        }),
      );

      await expect(
        service.createAffiliate(
          {
            offer_id: 345,
            merchant_id: 7345,
            deeplink: 'https://merchant.example/auth-failed',
          } as never,
          user._id.toString(),
        ),
      ).rejects.toMatchObject({ status: 502 });

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(Array.from(reservationStore.values())[0]).toMatchObject({
        status: 'pre_mint_failed',
      });
      expect(Array.from(reservationStore.values())[0]).not.toHaveProperty(
        'provider_started_at',
      );
    });

    it('does not let a stale owner mark a replacement reservation as pre-mint failed', async () => {
      const userId = new Types.ObjectId().toString();
      const dto = {
        offer_id: 346,
        merchant_id: 7346,
        deeplink: 'https://merchant.example/new-owner',
      } as never;
      const identity = (service as any).destinationIdentity(dto, userId);
      const reservation = (service as any).newReservation(
        identity,
        'current-owner',
        'current-attempt',
      );
      reservationStore.set(reservation._id, reservation);

      await expect(
        (service as any).markPreMintFailed(
          identity,
          'stale-owner',
          'stale-attempt',
        ),
      ).resolves.toBe(false);
      expect(reservationStore.get(reservation._id)).toMatchObject({
        status: 'reserved',
        owner_token: 'current-owner',
        attempt_token: 'current-attempt',
      });
    });

    it('keeps provider_started uncertain when the 401 refresh fails and never remints', async () => {
      const user = { _id: new Types.ObjectId() };
      userModel.findOne.mockResolvedValue(user);
      deeplinkModel.findOne.mockResolvedValue(null);
      cache.get.mockResolvedValue('stale-token');
      const unauthorized = Object.assign(new Error('unauthorized'), {
        response: { data: { status_code: 401 } },
      });
      mockedAxios.post
        .mockRejectedValueOnce(unauthorized)
        .mockRejectedValueOnce(
          Object.assign(new Error('refresh rejected'), {
            response: { status: 401, data: { status_code: 401 } },
          }),
        );
      const dto = {
        offer_id: 347,
        merchant_id: 7347,
        deeplink: 'https://merchant.example/uncertain-401',
      } as never;

      await expect(
        service.createAffiliate(dto, user._id.toString()),
      ).rejects.toMatchObject({ status: 502 });
      const uncertain = Array.from(reservationStore.values())[0];
      expect(uncertain).toMatchObject({ status: 'provider_started' });
      expect(uncertain).not.toHaveProperty('expires_at');
      uncertain.lease_expires_at = new Date(Date.now() - 1);
      mockedAxios.post.mockClear();

      await expect(
        service.createAffiliate(dto, user._id.toString()),
      ).rejects.toMatchObject({ status: 503 });
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('keeps both provider requests fenced as provider_started across one 401 refresh', async () => {
      const user = { _id: new Types.ObjectId() };
      userModel.findOne.mockResolvedValue(user);
      deeplinkModel.findOne.mockResolvedValue(null);
      cache.get.mockResolvedValue('stale-token');
      deeplinkModel.create.mockResolvedValue({ _id: 'refreshed-cache' });
      const providerStates: string[] = [];
      let providerCalls = 0;
      mockedAxios.post.mockImplementation(async (url) => {
        if (String(url).endsWith('/authenticate')) {
          return { data: { data: { token: 'fresh-token' } } } as never;
        }
        providerCalls += 1;
        providerStates.push(Array.from(reservationStore.values())[0]?.status);
        if (providerCalls === 1) {
          throw Object.assign(new Error('unauthorized'), {
            response: { data: { status_code: 401 } },
          });
        }
        return {
          data: { data: { tracking_link: 'https://track.example/refreshed' } },
        } as never;
      });

      await expect(
        service.createAffiliate(
          {
            offer_id: 348,
            merchant_id: 7348,
            deeplink: 'https://merchant.example/refreshed?coupon=A%20B',
          } as never,
          user._id.toString(),
        ),
      ).resolves.toEqual({ _id: 'refreshed-cache' });

      expect(providerCalls).toBe(2);
      expect(providerStates).toEqual(['provider_started', 'provider_started']);
      expect(mockedAxios.post).toHaveBeenCalledTimes(3);
      const committed = Array.from(reservationStore.values())[0];
      expect(committed.status).toBe('committed');
      expect(committed.expires_at).toBeInstanceOf(Date);
    });

    it('reconciles a provider_succeeded reservation from an exact cache hit after the post-cache commit write failed', async () => {
      const user = { _id: new Types.ObjectId() };
      userModel.findOne.mockResolvedValue(user);
      deeplinkModel.collection.indexes.mockResolvedValue([destinationIndex()]);
      cache.get.mockResolvedValue('provider-token');
      const dto = {
        offer_id: 349,
        merchant_id: 7349,
        deeplink: 'https://merchant.example/reconcile?coupon=EXACT',
      } as never;
      let durableCache: Record<string, unknown> | null = null;
      deeplinkModel.findOne.mockImplementation(
        async (filter: Record<string, unknown>) =>
          durableCache && typeof filter.destination_hash === 'string'
            ? durableCache
            : null,
      );
      deeplinkModel.create.mockImplementation(async (row) => {
        durableCache = { _id: 'durable-cache', ...row };
        return durableCache;
      });
      deeplinkModel.findOneAndUpdate.mockImplementation(
        async () => durableCache,
      );
      mockedAxios.post.mockResolvedValue({
        data: { data: { tracking_link: 'https://track.example/reconcile' } },
      });
      const updateReservation =
        reservationCollection.updateOne.getMockImplementation()!;
      let failPostCacheCommit = true;
      reservationCollection.updateOne.mockImplementation(
        async (filter: Record<string, any>, update: Record<string, any>) => {
          if (failPostCacheCommit && filter.status?.$in) {
            failPostCacheCommit = false;
            throw new Error('one-time commit write failure');
          }
          return updateReservation(filter, update);
        },
      );

      await expect(
        service.createAffiliate(dto, user._id.toString()),
      ).resolves.toMatchObject({ _id: 'durable-cache' });
      const reservation = Array.from(reservationStore.values())[0];
      expect(reservation.status).toBe('provider_succeeded');
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      mockedAxios.post.mockClear();

      await expect(
        service.createAffiliate(dto, user._id.toString()),
      ).resolves.toMatchObject({ _id: 'durable-cache' });
      expect(mockedAxios.post).not.toHaveBeenCalled();
      expect(reservation).toMatchObject({
        status: 'committed',
        tracked_deeplink: 'https://track.example/reconcile',
      });
      expect(reservation.committed_at).toBeInstanceOf(Date);
      expect(reservation.expires_at).toBeInstanceOf(Date);
    });

    it('never reconciles a provider_succeeded reservation whose tracked link differs from the exact cache', async () => {
      const user = { _id: new Types.ObjectId() };
      userModel.findOne.mockResolvedValue(user);
      deeplinkModel.collection.indexes.mockResolvedValue([destinationIndex()]);
      const dto = {
        offer_id: 350,
        merchant_id: 7350,
        deeplink: 'https://merchant.example/reconcile-mismatch',
      } as never;
      const identity = (service as any).destinationIdentity(
        dto,
        user._id.toString(),
      );
      const reservation = (service as any).newReservation(
        identity,
        'owner',
        'attempt',
      );
      reservation.status = 'provider_succeeded';
      reservation.tracked_deeplink = 'https://track.example/reservation';
      reservation.provider_succeeded_at = new Date();
      delete reservation.expires_at;
      reservationStore.set(reservation._id, reservation);
      const cached = {
        _id: 'cache',
        source: 'involve',
        destination_url: identity.destination_url,
        destination_hash: identity.destination_hash,
        deeplink: 'https://track.example/different-cache',
      };
      deeplinkModel.findOne.mockResolvedValue(cached);
      deeplinkModel.findOneAndUpdate.mockResolvedValue(cached);

      await expect(
        service.createAffiliate(dto, user._id.toString()),
      ).resolves.toBe(cached);
      expect(mockedAxios.post).not.toHaveBeenCalled();
      expect(reservation.status).toBe('provider_succeeded');
      expect(reservation).not.toHaveProperty('committed_at');
      expect(reservation).not.toHaveProperty('expires_at');
    });

    it('never reconciles an exact cache row after the destination identity index is dropped', async () => {
      const user = { _id: new Types.ObjectId() };
      userModel.findOne.mockResolvedValue(user);
      const dto = {
        offer_id: 352,
        merchant_id: 7352,
        deeplink: 'https://merchant.example/reconcile-no-index',
      } as never;
      const identity = (service as any).destinationIdentity(
        dto,
        user._id.toString(),
      );
      const reservation = (service as any).newReservation(
        identity,
        'owner',
        'attempt',
      );
      reservation.status = 'provider_succeeded';
      reservation.tracked_deeplink = 'https://track.example/no-index';
      reservation.provider_succeeded_at = new Date();
      delete reservation.expires_at;
      reservationStore.set(reservation._id, reservation);
      const cached = {
        _id: 'cache',
        source: 'involve',
        destination_url: identity.destination_url,
        destination_hash: identity.destination_hash,
        deeplink: reservation.tracked_deeplink,
      };
      deeplinkModel.findOne.mockResolvedValue(cached);
      deeplinkModel.findOneAndUpdate.mockResolvedValue(cached);
      deeplinkModel.collection.indexes.mockResolvedValue([]);
      const warn = jest
        .spyOn((service as any).logger, 'warn')
        .mockImplementation(() => undefined);

      await expect(
        service.createAffiliate(dto, user._id.toString()),
      ).resolves.toBe(cached);

      expect(reservation.status).toBe('provider_succeeded');
      expect(reservationCollection.updateOne).not.toHaveBeenCalled();
      expect(deeplinkModel.findOneAndUpdate).not.toHaveBeenCalled();
      expect(mockedAxios.post).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('exact destination index is unavailable'),
      );
    });

    it('logs and retries a cache reconciliation write failure without breaking either valid cache response', async () => {
      const user = { _id: new Types.ObjectId() };
      userModel.findOne.mockResolvedValue(user);
      deeplinkModel.collection.indexes.mockResolvedValue([destinationIndex()]);
      const dto = {
        offer_id: 351,
        merchant_id: 7351,
        deeplink: 'https://merchant.example/reconcile-retry',
      } as never;
      const identity = (service as any).destinationIdentity(
        dto,
        user._id.toString(),
      );
      const reservation = (service as any).newReservation(
        identity,
        'owner',
        'attempt',
      );
      reservation.status = 'provider_succeeded';
      reservation.tracked_deeplink = 'https://track.example/retry';
      reservation.provider_succeeded_at = new Date();
      delete reservation.expires_at;
      reservationStore.set(reservation._id, reservation);
      const cached = {
        _id: 'cache',
        source: 'involve',
        destination_url: identity.destination_url,
        destination_hash: identity.destination_hash,
        deeplink: reservation.tracked_deeplink,
      };
      deeplinkModel.findOne.mockResolvedValue(cached);
      deeplinkModel.findOneAndUpdate.mockResolvedValue(cached);
      const updateReservation =
        reservationCollection.updateOne.getMockImplementation()!;
      reservationCollection.updateOne
        .mockRejectedValueOnce(new Error('transient reconciliation failure'))
        .mockImplementation(updateReservation);
      const warn = jest
        .spyOn((service as any).logger, 'warn')
        .mockImplementation(() => undefined);

      await expect(
        service.createAffiliate(dto, user._id.toString()),
      ).resolves.toBe(cached);
      expect(reservation.status).toBe('provider_succeeded');
      expect(warn).toHaveBeenCalledTimes(1);

      await expect(
        service.createAffiliate(dto, user._id.toString()),
      ).resolves.toBe(cached);
      expect(reservation.status).toBe('committed');
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('never remints an expired provider-started reservation with no durable result', async () => {
      const user = { _id: new Types.ObjectId() };
      userModel.findOne.mockResolvedValue(user);
      deeplinkModel.findOne.mockResolvedValue(null);
      const dto = {
        offer_id: 341,
        merchant_id: 7341,
        deeplink: 'https://merchant.example/uncertain',
      } as never;
      const identity = (service as any).destinationIdentity(
        dto,
        user._id.toString(),
      );
      const uncertain = (service as any).newReservation(
        identity,
        'lost-owner',
        'lost-attempt',
        new Date(Date.now() - 60_000),
      );
      uncertain.status = 'provider_started';
      uncertain.provider_started_at = new Date(Date.now() - 60_000);
      reservationStore.set(uncertain._id, uncertain);

      await expect(
        service.createAffiliate(dto, user._id.toString()),
      ).rejects.toMatchObject({ status: 503 });
      expect(mockedAxios.post).not.toHaveBeenCalled();
      expect(deeplinkModel.create).not.toHaveBeenCalled();
    });

    it('a stale owner/attempt token cannot durably record or commit its provider result', async () => {
      const userId = new Types.ObjectId().toString();
      const dto = {
        offer_id: 342,
        merchant_id: 7342,
        deeplink: 'https://merchant.example/fenced',
      } as never;
      const identity = (service as any).destinationIdentity(dto, userId);
      const reservation = (service as any).newReservation(
        identity,
        'new-owner',
        'new-attempt',
      );
      reservation.status = 'provider_started';
      reservation.provider_started_at = new Date();
      reservationStore.set(reservation._id, reservation);

      await expect(
        (service as any).persistProviderResult(
          identity,
          'stale-owner',
          'stale-attempt',
          'https://track.example/stale',
        ),
      ).rejects.toMatchObject({ status: 503 });
      expect(reservationStore.get(reservation._id)).not.toHaveProperty(
        'tracked_deeplink',
      );

      reservation.status = 'provider_succeeded';
      reservation.tracked_deeplink = 'https://track.example/current';
      const staleResult = {
        ...reservation,
        owner_token: 'stale-owner',
        attempt_token: 'stale-attempt',
      };
      await expect(
        (service as any).finalizePersistedProviderResult(
          dto,
          userId,
          identity,
          staleResult,
          {
            ownerToken: 'stale-owner',
            attemptToken: 'stale-attempt',
          },
        ),
      ).rejects.toMatchObject({ status: 503 });
      expect(deeplinkModel.create).not.toHaveBeenCalled();
    });

    it.each(['provider_succeeded', 'committed'])(
      'replays a durable %s provider result without another provider call',
      async (status) => {
        const user = { _id: new Types.ObjectId() };
        userModel.findOne.mockResolvedValue(user);
        deeplinkModel.findOne.mockResolvedValue(null);
        deeplinkModel.create.mockResolvedValue({ _id: 'completed-cache' });
        const dto = {
          offer_id: 343,
          merchant_id: 7343,
          deeplink: 'https://merchant.example/durable',
        } as never;
        const identity = (service as any).destinationIdentity(
          dto,
          user._id.toString(),
        );
        const reservation = (service as any).newReservation(
          identity,
          'owner',
          'attempt',
        );
        reservation.status = status;
        reservation.tracked_deeplink = 'https://track.example/durable';
        reservation.provider_succeeded_at = new Date();
        reservationStore.set(reservation._id, reservation);

        await expect(
          service.createAffiliate(dto, user._id.toString()),
        ).resolves.toEqual({ _id: 'completed-cache' });
        expect(mockedAxios.post).not.toHaveBeenCalled();
        expect(deeplinkModel.create).toHaveBeenCalledTimes(1);
        expect(reservationStore.get(reservation._id).status).toBe('committed');
      },
    );
  });

  describe('createAffiliateAi', () => {
    it('createAffiliateAi > given an unknown email > then throws User not found', async () => {
      userModel.findOne.mockResolvedValue(null);

      await expect(
        service.createAffiliateAi(
          { offer_id: 1, merchant_id: 2, email: 'nobody@x.co' } as never,
          'nobody@x.co',
        ),
      ).rejects.toThrow('User not found');
    });

    it('createAffiliateAi > given an existing deeplink > then returns it without calling Involve', async () => {
      userModel.findOne.mockResolvedValue({ _id: new Types.ObjectId() });
      const existing = {
        deeplink: 'https://existing-ai.example/tracked',
        destination_url: '',
        source: 'involve',
      };
      deeplinkModel.findOne.mockResolvedValue(existing);

      const result = await service.createAffiliateAi(
        { offer_id: 3, merchant_id: 4, email: 'a@x.co' } as never,
        'a@x.co',
      );

      expect(result).toBe(existing);
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });

  describe('createDeeplinkInvolve', () => {
    // When no token is cached, the service must authenticate first, then call
    // the deeplink endpoint with a Bearer token and the user-scoped aff_sub.
    it('createDeeplinkInvolve > given no cached token > then signs in then posts with Bearer auth and aff_sub', async () => {
      cache.get
        .mockResolvedValueOnce(undefined) // first read: empty
        .mockResolvedValueOnce('fresh-tok'); // after signIn
      mockedAxios.post
        .mockResolvedValueOnce({ data: { data: { token: 'fresh-tok' } } }) // authenticate
        .mockResolvedValueOnce({
          data: { data: { tracking_link: 'https://t' } },
        }); // deeplink

      const result = await service.createDeeplinkInvolve({
        offer_id: 5,
        merchant_id: 6,
        deeplink: '',
        user_id: 'u-123',
      } as never);

      expect(result).toEqual({ data: { tracking_link: 'https://t/' } });
      const deeplinkCall = mockedAxios.post.mock.calls[1];
      expect(deeplinkCall[0]).toBe(
        'https://api.involve.asia/api/deeplink/generate',
      );
      expect(deeplinkCall[1]).toEqual({
        offer_id: 5,
        merchant_id: 6,
        aff_sub: 'user_id:u-123',
        deeplink: '',
      });
      expect(deeplinkCall[2]).toEqual({
        headers: { Authorization: 'Bearer fresh-tok' },
        timeout: 10_000,
      });
    });

    it('createDeeplinkInvolve > passes the exact canonical coupon destination to the provider payload', async () => {
      cache.get.mockResolvedValue('tok');
      mockedAxios.post.mockResolvedValue({
        data: { data: { tracking_link: 'https://track.example/exact' } },
      });

      await service.createDeeplinkInvolve({
        offer_id: 5,
        merchant_id: 6,
        deeplink: 'https://merchant.example/exact?coupon=339',
        user_id: 'u-123',
      } as never);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.involve.asia/api/deeplink/generate',
        {
          offer_id: 5,
          merchant_id: 6,
          aff_sub: 'user_id:u-123',
          deeplink: 'https://merchant.example/exact?coupon=339',
        },
        { headers: { Authorization: 'Bearer tok' }, timeout: 10_000 },
      );
    });

    // A 401 means the cached token expired; the service must re-authenticate
    // and retry exactly once, then succeed — not bubble the 401 up.
    it('createDeeplinkInvolve > given a 401 response > then re-auths and retries successfully', async () => {
      cache.get.mockResolvedValue('stale-tok');
      const err: any = new Error('unauthorized');
      err.response = { data: { status_code: 401 } };
      mockedAxios.post
        .mockRejectedValueOnce(err) // first deeplink attempt -> 401
        .mockResolvedValueOnce({ data: { data: { token: 't2' } } }) // signIn
        .mockResolvedValueOnce({
          data: { data: { tracking_link: 'https://retry' } },
        }); // retry

      const result = await service.createDeeplinkInvolve({
        offer_id: 9,
        merchant_id: 9,
        deeplink: '',
        user_id: 'u-9',
      } as never);

      expect(result).toEqual({ data: { tracking_link: 'https://retry/' } });
    });

    it('createDeeplinkInvolve > given a non-401 error > then throws without retrying', async () => {
      cache.get.mockResolvedValue('tok');
      const err: any = new Error('boom');
      err.response = { data: { status_code: 500 } };
      mockedAxios.post.mockRejectedValueOnce(err);

      await expect(
        service.createDeeplinkInvolve({
          offer_id: 1,
          merchant_id: 1,
          deeplink: '',
          user_id: 'u',
        } as never),
      ).rejects.toMatchObject({
        message: 'boom',
        response: { data: { status_code: 500 } },
      });
      // one deeplink attempt only; no signIn + retry pair
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });
  });

  describe('destination identity index rollout', () => {
    it('skips unique-index creation when the duplicate preflight finds rows', async () => {
      deeplinkModel.aggregate.mockResolvedValue([{ count: 2 }]);

      await service.ensureDestinationIdentityIndex();

      expect(deeplinkModel.collection.createIndex).not.toHaveBeenCalled();
    });

    it('creates the partial collision-safe unique index only after a clean preflight', async () => {
      deeplinkModel.aggregate.mockResolvedValue([]);

      await service.ensureDestinationIdentityIndex();

      expect(deeplinkModel.collection.createIndex).toHaveBeenCalledWith(
        {
          source: 1,
          user_id: 1,
          offer_id: 1,
          merchant_id: 1,
          destination_hash: 1,
        },
        expect.objectContaining({
          name: 'affiliate_destination_identity_unique_v1',
          unique: true,
          partialFilterExpression: expect.objectContaining({
            destination_hash: { $type: 'string' },
          }),
        }),
      );
    });

    it('swallows index creation races so application bootstrap cannot fail', async () => {
      deeplinkModel.aggregate.mockResolvedValue([]);
      deeplinkModel.collection.createIndex.mockRejectedValue(
        new Error('legacy duplicate race'),
      );

      await expect(service.ensureDestinationIdentityIndex()).resolves.toBe(
        false,
      );
    });

    it('blocks a nonempty mint with 503 when the destination identity index is unavailable', async () => {
      const user = { _id: new Types.ObjectId() };
      userModel.findOne.mockResolvedValue(user);
      deeplinkModel.findOne.mockResolvedValue(null);
      deeplinkModel.aggregate.mockResolvedValue([]);
      deeplinkModel.collection.createIndex.mockRejectedValue(
        new Error('index unavailable'),
      );

      await expect(
        service.createAffiliate(
          {
            offer_id: 7,
            merchant_id: 8,
            deeplink: 'https://merchant.example/exact',
          } as never,
          user._id.toString(),
        ),
      ).rejects.toMatchObject({ status: 503 });
      expect(mockedAxios.post).not.toHaveBeenCalled();
      expect(deeplinkModel.create).not.toHaveBeenCalled();
    });
  });

  describe('getOfferAll', () => {
    // The catalog sync must only ever request Approved + Active + cps offers;
    // a regression here would silently pull blocked/paused inventory.
    it('getOfferAll > given a cached token > then requests only Approved/Active/cps offers', async () => {
      cache.get.mockResolvedValue('tok');
      mockedAxios.post.mockResolvedValue({ data: { data: { data: [] } } });

      await service.getOfferAll({ page: 2, limit: 50 });

      const [url, body, config] = mockedAxios.post.mock.calls[0];
      expect(url).toBe('https://api.involve.asia/api/offers/all');
      expect(body).toEqual({
        page: 2,
        limit: 50,
        filter: {
          application_status: 'Approved',
          offer_status: 'Active',
          offer_type: 'cps',
        },
      });
      expect(config).toEqual({ headers: { Authorization: 'Bearer tok' } });
    });

    it('getOfferAll > given no page filter > then defaults to page 1 limit 100', async () => {
      cache.get.mockResolvedValue('tok');
      mockedAxios.post.mockResolvedValue({ data: { data: { data: [] } } });

      await service.getOfferAll();

      const body = mockedAxios.post.mock.calls[0][1] as {
        page: number;
        limit: number;
      };
      expect(body.page).toBe(1);
      expect(body.limit).toBe(100);
    });
  });

  describe('getConversion', () => {
    it('getConversion > given an unknown user id > then throws User not found', async () => {
      userModel.findOne.mockResolvedValue(null);

      await expect(
        service.getConversion(
          '100',
          { page: 1, limit: 10 } as never,
          new Types.ObjectId().toString(),
        ),
      ).rejects.toThrow('User not found');
    });

    // A malformed (non-24-hex) id must take the not-found path, not throw a raw
    // BSON cast error — new Types.ObjectId(id) was constructed before the lookup.
    it('getConversion > given a malformed (non-24-hex) id > then throws User not found, not a BSON cast error', async () => {
      await expect(
        service.getConversion(
          '100',
          { page: 1, limit: 10 } as never,
          'not-a-valid-object-id',
        ),
      ).rejects.toThrow('User not found');
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    // Involve returns conversions for ALL affiliates on an offer; the service
    // must return only rows whose aff_sub1 belongs to THIS user, and recount.
    it('getConversion > given mixed-affiliate rows > then keeps only this user and rewrites count', async () => {
      const user = { _id: new Types.ObjectId() };
      userModel.findOne.mockResolvedValue(user);
      cache.get.mockResolvedValue('tok');
      const mine = { aff_sub1: `user_id:${user._id.toString()}` };
      const theirs = { aff_sub1: 'user_id:someone-else' };
      mockedAxios.post.mockResolvedValue({
        data: { data: { count: 2, data: [mine, theirs] } },
      });

      const result = await service.getConversion(
        '100',
        { page: 1, limit: 10 } as never,
        user._id.toString(),
      );

      expect(result.data.data).toEqual([mine]);
      expect(result.data.count).toBe(1);
    });
  });

  describe('getConversationAllPage', () => {
    function makeConversion(over: Record<string, unknown>) {
      return {
        conversion_status: 'approved',
        currency: 'USD',
        payoutNew: 0,
        ...over,
      };
    }

    it('getConversationAllPage > given an unknown user id > then throws User not found', async () => {
      userModel.findOne.mockResolvedValue(null);

      await expect(
        service.getConversationAllPage(
          { page: 1, limit: 10 } as never,
          new Types.ObjectId().toString(),
        ),
      ).rejects.toThrow('User not found');
    });

    // A malformed (non-24-hex) id must take the not-found path, not throw a raw
    // BSON cast error — new Types.ObjectId(id) was constructed before the lookup.
    it('getConversationAllPage > given a malformed (non-24-hex) id > then throws User not found, not a BSON cast error', async () => {
      await expect(
        service.getConversationAllPage(
          { page: 1, limit: 10 } as never,
          'not-a-valid-object-id',
        ),
      ).rejects.toThrow('User not found');
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    // Without a fee-rate config the payout cap is undefined; the service must
    // refuse the request rather than compute wrong money.
    it('getConversationAllPage > given no fee rate configured > then throws a 400 HttpException', async () => {
      userModel.findOne.mockResolvedValue({ _id: new Types.ObjectId() });
      feeRateModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.getConversationAllPage(
          { page: 1, limit: 10 } as never,
          new Types.ObjectId().toString(),
        ),
      ).rejects.toBeInstanceOf(HttpException);
    });

    // Money totals: approved vs pending must be bucketed by status, and
    // non-USD/non-THB rows converted via the (mocked) FX wrapper before summing.
    it('getConversationAllPage > given USD and EUR rows > then totals are bucketed by status and currency-converted', async () => {
      const user = { _id: new Types.ObjectId() };
      userModel.findOne.mockResolvedValue(user);
      feeRateModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ system: 30, max_cap: 1000 }),
      });

      const rows = [
        makeConversion({
          conversion_status: 'approved',
          currency: 'USD',
          payoutNew: 100,
        }),
        makeConversion({
          conversion_status: 'pending',
          currency: 'USD',
          payoutNew: 50,
        }),
        makeConversion({
          conversion_status: 'approved',
          currency: 'EUR',
          payoutNew: 10,
        }),
      ];
      conversionModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(rows),
      });
      // EUR -> USD doubles, EUR -> THB x40 (deterministic stub rates)
      mockConvertToUSD.mockResolvedValue({ usdAmount: 20 });
      mockConvertToTHB.mockResolvedValue({ amount: 400 });

      const result = await service.getConversationAllPage(
        { page: 1, limit: 10 } as never,
        user._id.toString(),
      );

      // approved USD 100 + approved EUR converted to USD 20 = 120
      expect(result.totalUSD.approved).toBe(120);
      // pending USD 50, no pending non-USD rows
      expect(result.totalUSD.pending).toBe(50);
      // THB totals treat ANY non-THB currency (incl. USD) as needing conversion,
      // so each contributing row adds the stubbed 400 THB:
      // approved: USD row + EUR row = 800; pending: the single USD row = 400.
      expect(result.totalTHB.approved).toBe(800);
      expect(result.totalTHB.pending).toBe(400);
      expect(result.pagination).toEqual({
        total: 3,
        limit: 10,
        page: 1,
        totalPages: 1,
      });
      expect(result.data).toBe(rows);
    });

    it('getConversationAllPage > given a user > then aggregate $match uses indexed scope filter (no $regex)', async () => {
      const user = { _id: new Types.ObjectId() };
      userModel.findOne.mockResolvedValue(user);
      feeRateModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ system: 30, max_cap: 1000 }),
      });
      conversionModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });

      await service.getConversationAllPage(
        { page: 1, limit: 10 } as never,
        user._id.toString(),
      );

      const matchStage = conversionModel.aggregate.mock.calls[0][0][0].$match;
      expect(matchStage).toEqual(buildUserConversionScopeFilter(user._id));
      expect(JSON.stringify(matchStage)).not.toContain('$regex');
    });

    // The legacy frontend wraps the payload as { data: {...} }; the service must
    // unwrap it so pagination reflects the inner page/limit, not the envelope.
    it('getConversationAllPage > given the legacy { data } envelope > then unwraps it for pagination', async () => {
      const user = { _id: new Types.ObjectId() };
      userModel.findOne.mockResolvedValue(user);
      feeRateModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ system: 30, max_cap: 1000 }),
      });
      conversionModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });

      const result = await service.getConversationAllPage(
        { data: { page: 3, limit: 5 } } as never,
        user._id.toString(),
      );

      expect(result.pagination.page).toBe(3);
      expect(result.pagination.limit).toBe(5);
    });

    // offer_id is only unique WITHIN a source. The offers $lookup must pin
    // offer.source to the CONVERSION's source (defaulted to 'involve' for legacy
    // rows that predate the schema field), not a hardcoded 'involve'. For all
    // Involve-only data $$src === 'involve', so the result is byte-identical.
    it('getConversationAllPage > given the offers join > then it pins offer.source to the conversion source ($$src), not a hardcoded literal', async () => {
      const user = { _id: new Types.ObjectId() };
      userModel.findOne.mockResolvedValue(user);
      feeRateModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ system: 30, max_cap: 1000 }),
      });
      conversionModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });

      await service.getConversationAllPage(
        { page: 1, limit: 10 } as never,
        user._id.toString(),
      );

      const pipeline = conversionModel.aggregate.mock.calls[0][0] as Array<
        Record<string, any>
      >;
      const lookup = pipeline.find(
        (s) => s.$lookup && s.$lookup.from === 'offers',
      )?.$lookup as Record<string, any>;
      expect(lookup.let).toMatchObject({
        oid: '$offer_id',
        src: { $ifNull: ['$source', 'involve'] },
      });
      const andClauses = (lookup.pipeline as Array<Record<string, any>>).find(
        (s) => s.$match,
      )?.$match.$expr.$and;
      expect(andClauses).toEqual(
        expect.arrayContaining([
          { $eq: [{ $ifNull: ['$source', 'involve'] }, '$$src'] },
        ]),
      );
      // The old hardcoded literal must be gone.
      expect(JSON.stringify(andClauses)).not.toContain(
        JSON.stringify({ $eq: ['$source', 'involve'] }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // findAll — Involve catalog sync (H2). Two latent hazards:
  //  a) the per-offer upsert filtered on offer_id alone, so an Optimise/manual
  //     doc sharing a numeric offer_id could be clobbered; it must be scoped to
  //     source and stamp source:'involve' on write.
  //  b) the stale-disable loop ran one updateOne({ offer_id: { $ne } }) PER id,
  //     each disabling ONE ARBITRARY non-matching doc — a pre-existing bug that
  //     could disable live/in-sync offers. It must be a single updateMany scoped
  //     to source with offer_id $nin ids.
  // ---------------------------------------------------------------------------
  describe('findAll (Involve catalog sync, H2)', () => {
    function primeFindAll() {
      offerModel.updateMany = jest.fn().mockResolvedValue({});
      offerModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      });
      jest.spyOn(service, 'getOfferAll').mockResolvedValue({
        data: {
          data: [
            { offer_id: 1, offer_name: 'a' },
            { offer_id: 2, offer_name: 'b' },
          ],
          nextPage: null,
        },
      } as never);
    }

    it('findAll > before activation > preserves the standalone legacy sync before integrity fences', async () => {
      primeFindAll();
      categoryIntegrity.withNormalWrite.mockImplementation(({ legacy }) =>
        legacy(),
      );
      jest.spyOn(service, 'getOfferAll').mockResolvedValue({
        data: {
          data: [
            { offer_id: 1, offer_name: 'a', categories: 'Travel' },
            { offer_id: 2, offer_name: 'b', categories: 'Shopping' },
          ],
          nextPage: null,
        },
      } as never);
      offerModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest
            .fn()
            .mockResolvedValue([
              { categories: 'Travel' },
              { categories: 'Shopping' },
            ]),
        }),
      });

      await expect(service.findAll()).resolves.toHaveLength(2);

      expect(
        categoryIntegrity.withInvolveCategoryAssignment,
      ).not.toHaveBeenCalled();
      expect(offerModel.updateOne).toHaveBeenCalledWith(
        { source: { $in: ['involve', null] }, offer_id: 1 },
        {
          $set: expect.objectContaining({
            offer_id: 1,
            categories: 'Travel',
            source: 'involve',
            type: 'new',
            disabled: false,
          }),
        },
        { upsert: true },
      );
      expect(categoryModel.updateOne).toHaveBeenCalledWith(
        { name: 'Travel' },
        { $set: { name: 'Travel' } },
        { upsert: true },
      );
      expect(policyMediaRegistry.touchAttachInSession).not.toHaveBeenCalled();
    });

    it('findAll > given synced offers > then every upsert is scoped to source {$in:[involve,null]} and stamps source:involve', async () => {
      primeFindAll();

      await service.findAll();

      const upsertCalls = offerModel.updateOne.mock.calls.filter(
        (call) => call[2] && call[2].upsert === true,
      );
      expect(upsertCalls).toHaveLength(2);
      for (const [filter, update] of upsertCalls) {
        expect(filter.source).toEqual({ $in: ['involve', null] });
        expect(filter.offer_id).toBeDefined();
        expect(update.$set.source).toBe('involve');
      }
    });

    it('findAll > replaces tracked media by journaling and clearing structured proof in the same session', async () => {
      primeFindAll();
      const asset = {
        provider: 'r2',
        ownership: 'command-owned',
        owner_key: 'involve-displaced-logo',
        owner_attempt_token: 'involve-displaced-attempt',
        url: 'https://media.example/old-tracked-logo.png',
        bucket: 'media',
        object_key: `brands/involve-displaced-logo/involve-displaced-attempt/${'a'.repeat(64)}.png`,
        sha256: 'a'.repeat(64),
        original_name: 'old-tracked-logo.png',
        content_type: 'image/png',
      };
      offerModel.findOne.mockReturnValue(
        query({
          _id: new Types.ObjectId(),
          offer_id: 1,
          source: 'involve',
          logo: asset.url,
          logo_desktop: asset.url,
          logo_mobile: asset.url,
          logo_circle: asset.url,
          logo_asset: asset,
        }),
      );
      jest.spyOn(service, 'getOfferAll').mockResolvedValue({
        data: {
          data: [
            {
              offer_id: 1,
              offer_name: 'provider replacement',
              logo: 'https://provider.example/new-logo.png',
            },
          ],
          nextPage: null,
        },
      } as never);

      await service.findAll();

      expect(offerModel.findOne).toHaveBeenCalledWith({
        source: { $in: ['involve', null] },
        offer_id: 1,
      });
      expect(policyMediaCleanup.journalCommandOwnedAssets).toHaveBeenCalledWith(
        expect.objectContaining({
          owner_type: 'offer',
          owner_id: expect.any(Types.ObjectId),
          request_key: expect.stringMatching(/^involve-media-sync:1:/),
          reason: 'replaced-after-commit',
          assets: [asset],
        }),
        { id: 'session' },
      );
      const replacement = offerModel.updateOne.mock.calls.find(
        (call) => call[2]?.upsert === true,
      )?.[1];
      expect(replacement).toMatchObject({
        $set: {
          logo: 'https://provider.example/new-logo.png',
          source: 'involve',
        },
        $unset: {
          logo_asset: 1,
          logo_desktop: 1,
          logo_mobile: 1,
          logo_circle: 1,
        },
      });
      expect(
        policyMediaCleanup.journalCommandOwnedAssets.mock
          .invocationCallOrder[0],
      ).toBeLessThan(offerModel.updateOne.mock.invocationCallOrder[0]);
      expect(offerModel.updateOne.mock.invocationCallOrder[0]).toBeLessThan(
        policyMediaCleanup.processRequest.mock.invocationCallOrder[0],
      );
    });

    it('findAll > committed provider replacement leaves cleanup pending > logs the durable request without failing the sync', async () => {
      primeFindAll();
      offerModel.findOne.mockReturnValue(
        query({
          _id: new Types.ObjectId(),
          offer_id: 1,
          source: 'involve',
          logo: 'https://media.example/old-logo.png',
        }),
      );
      policyMediaCleanup.processRequest.mockResolvedValue({
        deleted: 0,
        pending: 1,
      });
      const warn = jest
        .spyOn((service as any).logger, 'warn')
        .mockImplementation(() => undefined);

      await expect(service.findAll()).resolves.toHaveLength(2);
      expect(warn).toHaveBeenCalledWith(
        expect.stringMatching(
          /cleanup pending.*involve-media-sync:1:v1.*pending=1/i,
        ),
      );
    });

    it('findAll > cleanup worker throws after the raw offer commit > logs the durable debt and preserves sync success', async () => {
      primeFindAll();
      offerModel.findOne.mockReturnValue(
        query({
          _id: new Types.ObjectId(),
          offer_id: 1,
          source: 'involve',
          logo: 'https://media.example/old-logo.png',
        }),
      );
      policyMediaCleanup.processRequest.mockRejectedValue(
        new Error('cleanup worker unavailable'),
      );
      const error = jest
        .spyOn((service as any).logger, 'error')
        .mockImplementation(() => undefined);

      await expect(service.findAll()).resolves.toHaveLength(2);
      expect(error).toHaveBeenCalledWith(
        expect.stringMatching(
          /cleanup pending.*involve-media-sync:1:v1.*cleanup worker unavailable/i,
        ),
      );
    });

    it('findAll > given synced offers > then stale offers are disabled by a single source-scoped updateMany, not per-id $ne updateOne', async () => {
      primeFindAll();

      await service.findAll();

      expect(offerModel.updateMany).toHaveBeenCalledTimes(1);
      expect(offerModel.updateMany).toHaveBeenCalledWith(
        { source: { $in: ['involve', null] }, offer_id: { $nin: [1, 2] } },
        { $set: { type: 'old', disabled: true } },
        { session: { id: 'integrity-session' } },
      );
      expect(categoryIntegrity.withIntegrityMutation).toHaveBeenCalledTimes(1);
      // The pre-existing arbitrary-doc-disable bug used offer_id: { $ne } in a
      // per-id updateOne — none of those must survive.
      const neDisableCalls = offerModel.updateOne.mock.calls.filter(
        (call) =>
          call[0]?.offer_id &&
          typeof call[0].offer_id === 'object' &&
          '$ne' in call[0].offer_id,
      );
      expect(neDisableCalls).toHaveLength(0);
    });

    // CRITICAL guard: `{ $nin: [] }` matches EVERY document, so a sync that
    // returns zero offers (a transient upstream hiccup or a filter momentarily
    // matching nothing) must NOT run the disable pass — otherwise it would flip
    // the entire live catalog to disabled:true in one write. The old per-id loop
    // was a no-op when ids was empty; this preserves that.
    it('findAll > given the sync returns no offers > then the disable updateMany never runs (no $nin:[] catalog wipe)', async () => {
      offerModel.updateMany = jest.fn().mockResolvedValue({});
      offerModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      });
      jest.spyOn(service, 'getOfferAll').mockResolvedValue({
        data: { data: [], nextPage: null },
      } as never);

      await service.findAll();

      expect(offerModel.updateMany).not.toHaveBeenCalled();
    });
  });
});
