import { HttpException, NotFoundException } from '@nestjs/common';
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

describe('InvolveService', () => {
  let service: InvolveService;
  let cache: AnyMockMap;
  let offerModel: AnyMockMap;
  let deeplinkModel: AnyMockMap;
  let userModel: AnyMockMap;
  let categoryModel: AnyMockMap;
  let conversionModel: AnyMockMap;
  let feeRateModel: AnyMockMap;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.INVOLVE_SECRET = 'secret-new';
    process.env.INVOLVE_SECRET_OLD = 'secret-old';

    cache = { get: jest.fn(), set: jest.fn().mockResolvedValue(undefined) };
    offerModel = {
      updateOne: jest.fn().mockResolvedValue({}),
      find: jest.fn(),
      aggregate: jest.fn(),
    };
    deeplinkModel = {
      create: jest.fn(),
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };
    userModel = { findOne: jest.fn() };
    categoryModel = { updateOne: jest.fn().mockResolvedValue({}) };
    conversionModel = { aggregate: jest.fn() };
    feeRateModel = { findOne: jest.fn() };

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
      ],
    }).compile();

    service = moduleRef.get<InvolveService>(InvolveService);
  });

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
      );
      expect(cache.set).toHaveBeenCalledWith(
        'access_token_involve_old',
        'tok-old',
      );
    });
  });

  describe('createDeeplinkMongo', () => {
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

    // A malformed (non-24-hex) id must take the not-found path, not throw a raw
    // BSON cast error — new Types.ObjectId(id) was constructed before the lookup.
    it('createAffiliate > given a malformed (non-24-hex) id > then throws NotFoundException, not a BSON cast error', async () => {
      await expect(
        service.createAffiliate(
          { offer_id: 1, merchant_id: 2, deeplink: '' } as never,
          'not-a-valid-object-id',
        ),
      ).rejects.toThrow(NotFoundException);
      expect(userModel.findOne).not.toHaveBeenCalled();
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

    // An already-generated deeplink must NOT trigger another Involve API call;
    // it should only append a fresh click timestamp (idempotent re-click).
    it('createAffiliate > given an existing deeplink > then appends a click_date and never calls Involve', async () => {
      const user = { _id: new Types.ObjectId() };
      userModel.findOne.mockResolvedValue(user);
      deeplinkModel.findOne.mockResolvedValue({ deeplink: 'https://existing' });
      deeplinkModel.findOneAndUpdate.mockResolvedValue({ _id: 'dl-existing' });

      const result = await service.createAffiliate(
        { offer_id: 7, merchant_id: 8, deeplink: '' } as never,
        user._id.toString(),
      );

      expect(result).toEqual({ _id: 'dl-existing' });
      expect(deeplinkModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
      const [, update, opts] = deeplinkModel.findOneAndUpdate.mock.calls[0];
      expect(update.$push.click_date).toBeInstanceOf(Date);
      expect(opts).toEqual({ upsert: true });
      expect(mockedAxios.post).not.toHaveBeenCalled();
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
    });
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
      const existing = { deeplink: 'https://existing-ai' };
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

      expect(result).toEqual({ data: { tracking_link: 'https://t' } });
      const deeplinkCall = mockedAxios.post.mock.calls[1];
      expect(deeplinkCall[0]).toBe(
        'https://api.involve.asia/api/deeplink/generate',
      );
      expect(deeplinkCall[1]).toEqual({
        offer_id: 5,
        merchant_id: 6,
        aff_sub: 'user_id:u-123',
      });
      expect(deeplinkCall[2]).toEqual({
        headers: { Authorization: 'Bearer fresh-tok' },
      });
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

      expect(result).toEqual({ data: { tracking_link: 'https://retry' } });
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
        expect.arrayContaining([{ $eq: ['$source', '$$src'] }]),
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

    it('findAll > given synced offers > then stale offers are disabled by a single source-scoped updateMany, not per-id $ne updateOne', async () => {
      primeFindAll();

      await service.findAll();

      expect(offerModel.updateMany).toHaveBeenCalledTimes(1);
      expect(offerModel.updateMany).toHaveBeenCalledWith(
        { source: { $in: ['involve', null] }, offer_id: { $nin: [1, 2] } },
        { $set: { type: 'old', disabled: true } },
      );
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
  });
});
