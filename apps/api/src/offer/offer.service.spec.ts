import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { OfferService } from './offer.service';
import { Offer } from './schemas/offer.schema';
import { Category } from './schemas/category.schema';
import { Coupon } from './schemas/coupon.schema';
import { FavoriteOffer } from './schemas/favorite-offer.schema';
import { Banner } from './schemas/banner.schema';
import { TopBrandConfig } from './schemas/top-brand-config.schema';
import { MissionOrder } from './schemas/missing-order.schema';
import { Deeplink } from 'src/involve/schemas/deeplink.schema';
import { User } from 'src/user/schemas/user.schema';
import { StoredMediaService } from 'src/media/stored-media.service';
import { Quest } from 'src/point/schemas/quest.schema';
import { FeaturedSearchTerm } from 'src/admin/search/schemas/featured-term.schema';
import { SearchBoostRule } from 'src/admin/search/schemas/boost-rule.schema';
import { SearchBlacklist } from 'src/admin/search/schemas/blacklist.schema';

/**
 * A chainable Mongoose query stub. Each builder method returns `this` so that
 * `.find().skip().limit().exec()` / `.lean()` / `.sort()` chains resolve to the
 * configured terminal value. `result` is what `exec`/`lean` resolve to.
 */
function makeQuery(result: unknown) {
  const q: Record<string, jest.Mock> = {};
  for (const m of ['find', 'skip', 'limit', 'populate', 'sort', 'select']) {
    q[m] = jest.fn().mockReturnValue(q);
  }
  q.exec = jest.fn().mockResolvedValue(result);
  q.lean = jest.fn().mockResolvedValue(result);
  return q;
}

describe('OfferService', () => {
  let service: OfferService;

  // Mongoose model mocks — partial jest.fn() objects, no real DB.
  let offerModel: any;
  let deeplinkModel: any;
  let userModel: any;
  let categoryModel: any;
  let couponModel: any;
  let favoriteOfferModel: any;
  let bannerModel: any;
  let allBrandBannerModel: any;
  let topBrandConfigModel: any;
  let missionOrderModel: any;
  let questModel: any;
  let featuredSearchModel: any;
  let searchBoostModel: any;
  let searchBlacklistModel: any;
  let storedMediaService: { upload: jest.Mock };

  beforeEach(async () => {
    offerModel = {
      find: jest.fn().mockReturnValue(makeQuery([])),
      findById: jest.fn(),
      findByIdAndDelete: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn().mockResolvedValue({ _id: 'created-offer' }),
      countDocuments: jest.fn().mockResolvedValue(0),
      collection: {
        indexes: jest.fn().mockResolvedValue([]),
        dropIndex: jest.fn().mockResolvedValue(undefined),
      },
    };
    deeplinkModel = { find: jest.fn().mockReturnValue(makeQuery([])) };
    userModel = { findOne: jest.fn() };
    categoryModel = { find: jest.fn().mockReturnValue(makeQuery([])) };
    couponModel = {
      find: jest.fn().mockReturnValue(makeQuery([])),
      countDocuments: jest.fn().mockResolvedValue(0),
      findByIdAndUpdate: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({}),
    };
    favoriteOfferModel = {
      findOne: jest.fn(),
      deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
      find: jest.fn().mockReturnValue(makeQuery([])),
      countDocuments: jest.fn().mockResolvedValue(0),
    };
    bannerModel = { findOne: jest.fn() };
    allBrandBannerModel = { findOne: jest.fn() };
    topBrandConfigModel = {
      findOne: jest.fn(),
      updateOne: jest.fn().mockResolvedValue({ acknowledged: true }),
    };
    // missionOrderModel is used BOTH as a constructor (`new this.missionOrderModel(...)`)
    // and as a static query holder (`this.missionOrderModel.find(...)`), so the
    // mock must be a callable with static query methods attached.
    missionOrderModel = jest.fn();
    missionOrderModel.find = jest.fn().mockReturnValue(makeQuery([]));
    missionOrderModel.countDocuments = jest.fn().mockResolvedValue(0);
    questModel = { findOne: jest.fn().mockReturnValue(makeQuery(null)) };
    featuredSearchModel = {
      find: jest.fn().mockReturnValue({
        sort: jest
          .fn()
          .mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
      }),
    };
    searchBoostModel = {
      find: jest
        .fn()
        .mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    };
    searchBlacklistModel = {
      find: jest
        .fn()
        .mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
    };
    storedMediaService = {
      upload: jest
        .fn()
        .mockResolvedValue(
          'https://storage.googleapis.com/gogocash-catalog-staging/brands/logo.png',
        ),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        OfferService,
        { provide: getModelToken(Offer.name), useValue: offerModel },
        { provide: getModelToken(Deeplink.name), useValue: deeplinkModel },
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: getModelToken(Category.name), useValue: categoryModel },
        { provide: getModelToken(Coupon.name), useValue: couponModel },
        {
          provide: getModelToken(FavoriteOffer.name),
          useValue: favoriteOfferModel,
        },
        { provide: getModelToken(Banner.name), useValue: bannerModel },
        {
          provide: getModelToken('AllBrandBanner'),
          useValue: allBrandBannerModel,
        },
        {
          provide: getModelToken(TopBrandConfig.name),
          useValue: topBrandConfigModel,
        },
        {
          provide: getModelToken(MissionOrder.name),
          useValue: missionOrderModel,
        },
        { provide: getModelToken(Quest.name), useValue: questModel },
        {
          provide: getModelToken(FeaturedSearchTerm.name),
          useValue: featuredSearchModel,
        },
        {
          provide: getModelToken(SearchBoostRule.name),
          useValue: searchBoostModel,
        },
        {
          provide: getModelToken(SearchBlacklist.name),
          useValue: searchBlacklistModel,
        },
        { provide: StoredMediaService, useValue: storedMediaService },
      ],
    }).compile();

    service = moduleRef.get<OfferService>(OfferService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll (public listing)', () => {
    // The customer app must never surface disabled offers or offers still in
    // moderation. This is the core visibility contract for the storefront.
    it('findAll > given a public call > then disabled offers and pending/rejected statuses are filtered out', async () => {
      await service.findAll(1, 10, '', '');

      const filter = offerModel.find.mock.calls[0][0];
      expect(filter.disabled).toEqual({ $ne: true });
      expect(filter.status).toEqual({ $nin: ['pending_review', 'rejected'] });
    });

    it('findAll > given a public call > then raw tracking-period config is excluded from the projection', async () => {
      const query = makeQuery([]);
      offerModel.find.mockReturnValue(query);

      await service.findAll(1, 10, '', '');

      expect(query.select).toHaveBeenCalledWith(
        '-tracking_period_mode -tracking_days -confirm_days -flow_type -tracking_subtitle -confirm_subtitle',
      );
    });

    it('findAll > given search/category/country terms > then they become case-insensitive regex filters', async () => {
      await service.findAll(1, 10, 'shopee', 'fashion', 'Thailand');

      const filter = offerModel.find.mock.calls[0][0];
      expect(filter.$or).toEqual([
        { offer_name: { $regex: 'shopee', $options: 'i' } },
        { offer_name_display: { $regex: 'shopee', $options: 'i' } },
        { categories: { $regex: 'shopee', $options: 'i' } },
        { lookup_value: { $regex: 'shopee', $options: 'i' } },
        { countries: { $regex: 'shopee', $options: 'i' } },
      ]);
      expect(filter.categories).toEqual({ $regex: 'fashion', $options: 'i' });
      // Country becomes a token-anchored alternation (ISO-2 + full names) —
      // assert behaviorally rather than pinning the source string.
      const countryRegex = new RegExp(
        filter.countries.$regex,
        filter.countries.$options,
      );
      expect(countryRegex.test('Thailand')).toBe(true);
      expect(countryRegex.test('Singapore, TH, Vietnam')).toBe(true);
      expect(countryRegex.test('Singapore')).toBe(false);
    });

    it('findAll > given the ISO-2 country the app sends > then matches offers listing the full country name', async () => {
      // Field bug 2026-07-10: the customer app sends `country=MY` but Involve
      // offers store "Australia, Malaysia, Singapore, ..." — the old substring
      // regex matched nothing for MY/SG/JP/VN/TW/CN (only TH/PH by accident).
      await service.findAll(1, 10, '', '', 'MY');

      const filter = offerModel.find.mock.calls[0][0];
      const regex = new RegExp(
        filter.countries.$regex,
        filter.countries.$options,
      );
      expect(
        regex.test(
          'Australia, Malaysia, Singapore, Thailand, United States of America',
        ),
      ).toBe(true);
      expect(regex.test('Thailand')).toBe(false);
      expect(regex.test('Myanmar')).toBe(false);
    });

    it('findAll > given a numeric offer id search > then matches offer_id', async () => {
      await service.findAll(1, 10, '803', '', '', true);

      const filter = offerModel.find.mock.calls[0][0];
      expect(filter.$or).toEqual(expect.arrayContaining([{ offer_id: 803 }]));
    });

    it('findAll > given regex metacharacters in filters > then user input is escaped literally', async () => {
      await service.findAll(1, 10, 'a.*', 'fashion+', 'Thailand?');

      const filter = offerModel.find.mock.calls[0][0];
      expect(filter.$or).toEqual([
        { offer_name: { $regex: 'a\\.\\*', $options: 'i' } },
        { offer_name_display: { $regex: 'a\\.\\*', $options: 'i' } },
        { categories: { $regex: 'a\\.\\*', $options: 'i' } },
        { lookup_value: { $regex: 'a\\.\\*', $options: 'i' } },
        { countries: { $regex: 'a\\.\\*', $options: 'i' } },
      ]);
      expect(filter.categories).toEqual({
        $regex: 'fashion\\+',
        $options: 'i',
      });
      const countryRegex = new RegExp(
        filter.countries.$regex,
        filter.countries.$options,
      );
      expect(countryRegex.test('Thailand?')).toBe(true);
      expect(countryRegex.test('Thailand')).toBe(false);
    });

    it('findAll > given a blacklisted search query > then returns no ranked results', async () => {
      searchBlacklistModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([{ term: 'banned' }]),
      });
      offerModel.find.mockReturnValue(
        makeQuery([
          {
            _id: 'offer-1',
            offer_name: 'Banned Shop',
            offer_name_display: 'Banned Shop',
          },
        ]),
      );

      const result = await service.findAll(1, 10, 'banned shop', '');

      expect(result.data).toEqual([]);
    });

    it('findAll > given boost rules > then boosted offers sort ahead of others', async () => {
      searchBlacklistModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });
      searchBoostModel.find.mockReturnValue({
        lean: jest
          .fn()
          .mockResolvedValue([{ offer_id: 'offer-b', boost_weight: 5 }]),
      });
      featuredSearchModel.find.mockReturnValue({
        sort: jest
          .fn()
          .mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
      });
      offerModel.find.mockReturnValue(
        makeQuery([
          {
            _id: 'offer-a',
            offer_name: 'Alpha Market',
            offer_name_display: 'Alpha Market',
          },
          {
            _id: 'offer-b',
            offer_name: 'Beta Market',
            offer_name_display: 'Beta Market',
          },
        ]),
      );

      const result = await service.findAll(1, 10, 'market', '');

      expect(result.data.map((offer) => String(offer._id))).toEqual([
        'offer-b',
        'offer-a',
      ]);
    });

    it('findAll > given total and limit > then it paginates and computes totalPages', async () => {
      offerModel.find.mockReturnValue(makeQuery([{ _id: 'a' }, { _id: 'b' }]));
      offerModel.countDocuments.mockResolvedValue(25);

      const result = await service.findAll(2, 10, '', '');

      const query = offerModel.find.mock.results[0].value;
      // page 2, limit 10 => skip the first 10 documents.
      expect(query.skip).toHaveBeenCalledWith(10);
      expect(query.limit).toHaveBeenCalledWith(10);
      expect(result.total).toBe(25);
      expect(result.totalPages).toBe(3); // ceil(25/10)
      expect(result.data).toHaveLength(2);
    });
  });

  describe('findAll (admin listing)', () => {
    // Admins curate the full catalogue: the public status/disabled guard must
    // NOT be applied, otherwise pending offers would be invisible to reviewers.
    it('findAll > given admin=true with no filters > then the public visibility guard is not applied', async () => {
      await service.findAll(1, 10, '', '', undefined, true);

      const filter = offerModel.find.mock.calls[0][0];
      expect(filter.disabled).toBeUndefined();
      expect(filter.status).toBeUndefined();
      expect(offerModel.find.mock.results[0].value.sort).toHaveBeenCalledWith({
        datetime_created: -1,
        offer_name_display: 1,
        offer_name: 1,
      });
    });

    it('findAll > given admin filters > then status and source narrow the query', async () => {
      await service.findAll(1, 10, '', '', undefined, true, {
        status: 'pending_review',
        source: 'optimise',
      });

      const filter = offerModel.find.mock.calls[0][0];
      expect(filter.status).toBe('pending_review');
      expect(filter.source).toBe('optimise');
    });
  });

  describe('getCategoryList', () => {
    it('getCategoryList > given regex metacharacters > then search is escaped literally', async () => {
      await service.getCategoryList('food+');

      const filter = categoryModel.find.mock.calls[0][0];
      expect(filter).toEqual({ name: { $regex: 'food\\+', $options: 'i' } });
    });
  });

  describe('getCoupon', () => {
    it('getCoupon > given regex metacharacters > then search is escaped literally', async () => {
      await service.getCoupon(1, 10, 'save.*');

      const filter = couponModel.find.mock.calls[0][0];
      expect(filter).toEqual({
        $or: [
          { name: { $regex: 'save\\.\\*', $options: 'i' } },
          { code: { $regex: 'save\\.\\*', $options: 'i' } },
        ],
      });
    });
  });

  describe('getCouponId (public merchant coupons)', () => {
    it('getCouponId > given an invalid offer id > then rejects before querying Mongo', async () => {
      await expect(
        service.getCouponId('not-an-object-id'),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(couponModel.find).not.toHaveBeenCalled();
    });

    it('getCouponId > given mixed coupon states > then returns only active coupons with remaining inventory', async () => {
      const offerId = new Types.ObjectId().toHexString();
      const query = makeQuery([
        {
          _id: 'love-u',
          name: 'Love U',
          code: '',
          offer_id: { _id: offerId, offer_name: 'GoDaddy - CPS' },
          start_date: '2026-07-10',
          start_time: '09:30',
          end_date: '2026-07-22',
          end_time: '22:15',
          discount: 10,
          discount_type: 'cash',
          discount_currency: 'THB',
          code_enabled: false,
          eligibility: 'members',
          min_spend: '100',
          min_spend_currency: 'THB',
          max_cap: 500,
          max_cap_enabled: true,
          max_cap_currency: 'THB',
          one_time_use_enabled: false,
          usage_per_user: 3,
          terms_and_conditions: 'Valid for members only.',
          quantity: 0,
          quantity_used: null,
          disabled: false,
        },
        {
          _id: 'disabled',
          name: 'Disabled deal',
          start_date: '2026-07-10',
          end_date: '2026-07-22',
          quantity: 0,
          disabled: true,
        },
        {
          _id: 'future',
          name: 'Future deal',
          start_date: '2026-07-16',
          end_date: '2026-07-22',
          quantity: 0,
          disabled: false,
        },
        {
          _id: 'expired',
          name: 'Expired deal',
          start_date: '2026-07-01',
          end_date: '2026-07-14',
          quantity: 0,
          disabled: false,
        },
        {
          _id: 'exhausted',
          name: 'Exhausted deal',
          start_date: '2026-07-01',
          end_date: '2026-07-31',
          quantity: 5,
          quantity_used: 5,
          disabled: false,
        },
        {
          _id: 'remaining',
          name: 'Still available',
          start_date: '2026-07-01',
          end_date: '2026-07-31',
          quantity: 5,
          quantity_used: 4,
          disabled: false,
        },
        {
          _id: 'explicitly-empty-limited',
          name: 'No codes left',
          start_date: '2026-07-01',
          end_date: '2026-07-31',
          quantity: 0,
          quantity_used: 0,
          unlimited_amount_enabled: false,
          disabled: false,
        },
      ]);
      couponModel.find.mockReturnValue(query);

      const result = await service.getCouponId(
        offerId,
        new Date('2026-07-15T12:00:00.000Z'),
      );

      expect(couponModel.find).toHaveBeenCalledWith({
        offer_id: new Types.ObjectId(offerId),
      });
      expect(query.populate).toHaveBeenCalledWith('offer_id', [
        'offer_name',
        'offer_name_display',
      ]);
      expect(result.map((coupon) => coupon._id)).toEqual([
        'love-u',
        'remaining',
      ]);
      expect(result[0]).toEqual(
        expect.objectContaining({
          code: '',
          discount: 10,
          min_spend: '100',
          name: 'Love U',
          code_enabled: false,
          discount_type: 'cash',
          discount_currency: 'THB',
          eligibility: 'members',
          min_spend_currency: 'THB',
          start_time: '09:30',
          end_time: '22:15',
          max_cap: 500,
          one_time_use_enabled: false,
          terms_and_conditions: 'Valid for members only.',
        }),
      );
      expect(result[0]).not.toHaveProperty('disabled');
      expect(result[0]).not.toHaveProperty('quantity_used');
      expect(result[0]).toHaveProperty('remaining_quantity', null);
      expect(result[1]).toHaveProperty('remaining_quantity', 1);
    });

    it('getCouponId > enforces configured start and end times in Bangkok time', async () => {
      const offerId = new Types.ObjectId().toHexString();
      couponModel.find.mockReturnValue(
        makeQuery([
          {
            _id: 'timed-coupon',
            name: 'Timed coupon',
            start_date: '2026-07-15',
            start_time: '22:00',
            end_date: '2026-07-16',
            end_time: '09:30',
            quantity: 0,
            disabled: false,
          },
        ]),
      );

      await expect(
        service.getCouponId(
          offerId,
          new Date('2026-07-15T14:59:59.000Z'), // 21:59:59 Bangkok
        ),
      ).resolves.toEqual([]);
      await expect(
        service.getCouponId(
          offerId,
          new Date('2026-07-15T15:00:00.000Z'), // 22:00 Bangkok
        ),
      ).resolves.toHaveLength(1);
      await expect(
        service.getCouponId(
          offerId,
          new Date('2026-07-16T02:30:00.000Z'), // 09:30 Bangkok
        ),
      ).resolves.toHaveLength(1);
      await expect(
        service.getCouponId(
          offerId,
          new Date('2026-07-16T02:30:01.000Z'), // 09:30:01 Bangkok
        ),
      ).resolves.toEqual([]);
    });

    it('getCouponId > given a hidden legacy code > then it does not expose that code publicly', async () => {
      const offerId = new Types.ObjectId().toHexString();
      couponModel.find.mockReturnValue(
        makeQuery([
          {
            _id: 'hidden-code',
            name: 'Link-only deal',
            code: 'INTERNAL20',
            code_enabled: false,
            offer_id: { _id: offerId, offer_name: 'Merchant' },
            start_date: '2026-07-01',
            end_date: '2026-07-31',
            quantity: 0,
            disabled: false,
          },
        ]),
      );

      const result = await service.getCouponId(
        offerId,
        new Date('2026-07-15T12:00:00.000Z'),
      );

      expect(result[0]).toMatchObject({ code: '', code_enabled: false });
    });
  });

  describe('findOne (public detail)', () => {
    it('findOne > given a live offer id > then it returns customer-safe fields including tracking_link', async () => {
      const offerId = new Types.ObjectId().toHexString();
      const query = makeQuery({
        _id: offerId,
        offer_name: 'Nike',
        tracking_link: 'https://track.example/nike',
        offer_display_tags: {
          brand_category_enabled: true,
          brand_category_label: 'Digital Services',
          extra_cashback_tag: false,
          grab_coupon_tag: false,
          expire_in_days_enabled: false,
          expire_in_days: null,
        },
        reviewed_by: 'admin-1',
        reviewed_at: new Date('2026-01-01T00:00:00.000Z'),
        rejection_reason: 'old reason',
      });
      offerModel.findOne.mockReturnValue(query);

      const result = await service.findOne(offerId);

      expect(offerModel.findOne).toHaveBeenCalledWith({
        _id: offerId,
        disabled: { $ne: true },
        status: { $nin: ['pending_review', 'rejected'] },
      });
      expect(query.select).toHaveBeenCalledWith(
        expect.stringContaining('tracking_link'),
      );
      expect(query.select).toHaveBeenCalledWith(
        expect.stringContaining('offer_display_tags'),
      );
      expect(query.select).toHaveBeenCalledWith(
        expect.stringContaining('note_to_user'),
      );
      expect(result).toEqual(
        expect.objectContaining({
          _id: offerId,
          offer_name: 'Nike',
          tracking_link: 'https://track.example/nike',
          offer_display_tags: {
            brand_category_enabled: true,
            brand_category_label: 'Digital Services',
            extra_cashback_tag: false,
            grab_coupon_tag: false,
            expire_in_days_enabled: false,
            expire_in_days: null,
          },
        }),
      );
      expect(result).not.toHaveProperty('reviewed_by');
      expect(result).not.toHaveProperty('reviewed_at');
      expect(result).not.toHaveProperty('rejection_reason');
    });

    it('findOne > given an invalid offer id > then it returns null without querying Mongo', async () => {
      await expect(service.findOne('not-an-objectid')).resolves.toBeNull();

      expect(offerModel.findOne).not.toHaveBeenCalled();
    });

    it('findOne > given a manual tracking-period offer > then the payload carries derived tracking_period and never the raw fields', async () => {
      const offerId = new Types.ObjectId().toHexString();
      const query = makeQuery({
        _id: offerId,
        offer_name: 'Nike',
        tracking_period_mode: 'manual',
        tracking_days: 7,
        confirm_days: 45,
        validation_terms: 15,
      });
      offerModel.findOne.mockReturnValue(query);

      const result = await service.findOne(offerId);

      expect(result).toEqual(
        expect.objectContaining({
          tracking_period: {
            tracking_days: 7,
            confirm_days: 45,
            source: 'manual',
            flow_type: 'three_step',
            tracking_subtitle: 'from the following month',
            confirm_subtitle: 'after validation',
          },
        }),
      );
      // Raw config/partner fields stay private to admin surfaces.
      expect(result).not.toHaveProperty('tracking_period_mode');
      expect(result).not.toHaveProperty('tracking_days');
      expect(result).not.toHaveProperty('confirm_days');
      expect(result).not.toHaveProperty('validation_terms');
      expect(result).not.toHaveProperty('flow_type');
      expect(result).not.toHaveProperty('tracking_subtitle');
      expect(result).not.toHaveProperty('confirm_subtitle');
    });

    it('findOne > given a stored two_step flow with custom subtitles > then the derived tracking_period carries them', async () => {
      const offerId = new Types.ObjectId().toHexString();
      const query = makeQuery({
        _id: offerId,
        offer_name: 'Nike',
        tracking_period_mode: 'manual',
        tracking_days: 7,
        confirm_days: 45,
        flow_type: 'two_step',
        tracking_subtitle: 'after the return window closes',
        confirm_subtitle: 'once the store approves',
      });
      offerModel.findOne.mockReturnValue(query);

      const result = await service.findOne(offerId);

      expect(query.select).toHaveBeenCalledWith(
        expect.stringContaining('flow_type'),
      );
      expect(result).toEqual(
        expect.objectContaining({
          tracking_period: {
            tracking_days: 7,
            confirm_days: 45,
            source: 'manual',
            flow_type: 'two_step',
            tracking_subtitle: 'after the return window closes',
            confirm_subtitle: 'once the store approves',
          },
        }),
      );
    });

    it('findOne > given an involve offer in auto mode > then tracking_period.confirm_days mirrors validation_terms', async () => {
      const offerId = new Types.ObjectId().toHexString();
      const query = makeQuery({
        _id: offerId,
        offer_name: 'Lazada',
        validation_terms: 60,
      });
      offerModel.findOne.mockReturnValue(query);

      const result = await service.findOne(offerId);

      expect(query.select).toHaveBeenCalledWith(
        expect.stringContaining('validation_terms'),
      );
      expect(result).toEqual(
        expect.objectContaining({
          tracking_period: {
            tracking_days: 30,
            confirm_days: 60,
            source: 'partner',
            flow_type: 'three_step',
            tracking_subtitle: 'from the following month',
            confirm_subtitle: 'after validation',
          },
        }),
      );
    });
  });

  describe('removeOffer', () => {
    it('removeOffer > given a valid id > then permanently deletes the offer', async () => {
      const id = new Types.ObjectId().toHexString();
      const offerDoc = { _id: id };
      offerModel.findById.mockResolvedValue(offerDoc);
      offerModel.findByIdAndDelete.mockResolvedValue(offerDoc);

      await expect(service.removeOffer(id)).resolves.toEqual({
        message: 'Offer deleted successfully',
      });

      expect(offerModel.findById).toHaveBeenCalledWith(id);
      expect(favoriteOfferModel.deleteMany).toHaveBeenCalledWith({
        offer_id: new Types.ObjectId(id),
      });
      expect(topBrandConfigModel.updateOne).toHaveBeenCalledWith(
        {},
        { $pull: { brands: { offerId: id } } },
      );
      expect(searchBoostModel.deleteMany).toHaveBeenCalledWith({
        offer_id: id,
      });
      expect(offerModel.findByIdAndDelete).toHaveBeenCalledWith(id);
    });

    it('removeOffer > given a missing offer > then throws NotFoundException', async () => {
      const id = new Types.ObjectId().toHexString();
      offerModel.findById.mockResolvedValue(null);

      await expect(service.removeOffer(id)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(offerModel.findByIdAndDelete).not.toHaveBeenCalled();
      expect(favoriteOfferModel.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('createAdminOffer', () => {
    it('createAdminOffer > given brand form data > then creates an approved manual offer with tracking_link', async () => {
      const result = await service.createAdminOffer({
        brand_name: 'Orbit Airways',
        affiliate_tracking_link: ' https://track.example/orbit ',
        countries: 'Thailand',
        currency: 'THB',
        disabled: 'false',
        extra_store: 'true',
        commission_store: '7.5',
        max_cap: '500',
        is_global: 'true',
        default_country: 'Thailand',
        note_to_user: '  Book through GoGoCash for eligible cashback.  ',
        policy_category_id: '507f1f77bcf86cd799439011',
        custom_terms: '  New customers only.  ',
        product_types: JSON.stringify([
          {
            name: 'Flights',
            commission_info: '7.5%',
            deeplink: 'https://gogocash.app/open/orbit',
          },
        ]),
      });

      expect(offerModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          offer_name: 'Orbit Airways - CPS',
          offer_name_display: 'Orbit Airways',
          tracking_link: 'https://track.example/orbit',
          preview_url: 'https://track.example/orbit',
          directory_page: 'https://track.example/orbit',
          disabled: false,
          extra_store: true,
          commission_store: 7.5,
          max_cap: 500,
          status: 'approved',
          source: 'manual',
          is_global: true,
          default_country: 'Thailand',
          note_to_user: 'Book through GoGoCash for eligible cashback.',
          policy_category_id: '507f1f77bcf86cd799439011',
          custom_terms: 'New customers only.',
          product_type: [
            {
              name: 'Flights',
              commission_info: '7.5%',
              deeplink: 'https://gogocash.app/open/orbit',
            },
          ],
        }),
      );
      expect(result).toEqual({ _id: 'created-offer' });
    });

    it('createAdminOffer > given custom-writing mode > then persists the sentinel for mode inference', async () => {
      await service.createAdminOffer({
        brand_name: 'Custom Policy Brand',
        affiliate_tracking_link: 'https://track.example/custom-policy',
        policy_category_id: 'custom',
        custom_terms: 'A deliberately authored custom policy.',
      });

      expect(offerModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          policy_category_id: 'custom',
          custom_terms: 'A deliberately authored custom policy.',
        }),
      );
    });

    it.each([
      ['custom_terms', 'x'.repeat(50_001)],
      ['note_to_user', 'x'.repeat(2_001)],
    ])(
      'createAdminOffer > given oversized %s > then rejects before persistence',
      async (field, value) => {
        await expect(
          service.createAdminOffer(
            {
              brand_name: 'Oversized Brand',
              affiliate_tracking_link: 'https://track.example/oversized',
              [field]: value,
            },
            {
              logo_desktop: [
                { originalname: 'logo.png' } as Express.Multer.File,
              ],
            },
          ),
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(storedMediaService.upload).not.toHaveBeenCalled();
        expect(offerModel.create).not.toHaveBeenCalled();
      },
    );

    it('createAdminOffer > given app_deeplink > then persists it on the offer', async () => {
      await service.createAdminOffer({
        brand_name: 'Deeplink Brand',
        affiliate_tracking_link: 'https://track.example/deeplink',
        app_deeplink: 'https://gogocash.app/open/deeplink-brand?bestRate=5',
      });

      expect(offerModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          app_deeplink: 'https://gogocash.app/open/deeplink-brand?bestRate=5',
        }),
      );
    });

    it('createAdminOffer > given a failing media upload > then surfaces a clear asset-specific error', async () => {
      storedMediaService.upload.mockRejectedValueOnce(
        new Error('gcs quota exceeded'),
      );
      await expect(
        service.createAdminOffer(
          {
            brand_name: 'Logo Brand',
            affiliate_tracking_link: 'https://track.example/x',
          },
          { logo_desktop: [{} as any] },
        ),
      ).rejects.toMatchObject({
        status: 500,
        message: expect.stringContaining('Failed to upload logo (desktop)'),
      });
      expect(offerModel.create).not.toHaveBeenCalled();
    });

    it('createAdminOffer > given canonical media > then uploads two files once and aliases their stored references', async () => {
      storedMediaService.upload
        .mockResolvedValueOnce('stored-logo')
        .mockResolvedValueOnce('stored-banner');

      await service.createAdminOffer(
        {
          brand_name: 'Two Asset Brand',
          affiliate_tracking_link: 'https://track.example/two-assets',
        },
        {
          logo_desktop: [{ originalname: 'logo.png' } as Express.Multer.File],
          banner: [{ originalname: 'banner.png' } as Express.Multer.File],
        },
      );

      expect(storedMediaService.upload).toHaveBeenCalledTimes(2);
      expect(offerModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          logo: 'stored-logo',
          logo_desktop: 'stored-logo',
          logo_mobile: 'stored-logo',
          banner: 'stored-banner',
          banner_mobile: 'stored-banner',
          logo_circle: 'stored-banner',
        }),
      );
    });

    it('createAdminOffer > given duplicated legacy media fields > then uploads each physical asset only once', async () => {
      const logo = { originalname: 'logo.png' } as Express.Multer.File;
      const banner = { originalname: 'banner.png' } as Express.Multer.File;

      await service.createAdminOffer(
        {
          brand_name: 'Legacy Media Brand',
          affiliate_tracking_link: 'https://track.example/legacy-media',
        },
        {
          logo_desktop: [logo],
          logo_mobile: [logo],
          banner: [banner],
          banner_mobile: [banner],
          logo_circle: [banner],
        },
      );

      expect(storedMediaService.upload).toHaveBeenCalledTimes(2);
      expect(
        storedMediaService.upload.mock.calls.map(([file]) => file),
      ).toEqual([logo, banner]);
    });

    it('createAdminOffer > given no tracking link > then it rejects without creating an offer', async () => {
      await expect(
        service.createAdminOffer({ brand_name: 'Missing Link' }),
      ).rejects.toMatchObject({ status: 400 });

      expect(offerModel.create).not.toHaveBeenCalled();
    });
  });

  describe('getOfferExtraPoint', () => {
    it('getOfferExtraPoint > given open quest tasks > then it returns enabled approved offers in quest order', async () => {
      const offerA = new Types.ObjectId();
      const offerB = new Types.ObjectId();
      questModel.findOne.mockReturnValue(
        makeQuery({
          _id: new Types.ObjectId(),
          status: 'open',
          tasks: [
            {
              offer: offerB,
              offer_id: 202,
              merchant_id: 2002,
              extra_point: 25,
              sort_order: 1,
              enabled: true,
            },
            {
              offer: offerA,
              offer_id: 101,
              merchant_id: 1001,
              extra_point: 50,
              sort_order: 0,
              enabled: true,
              wording: 'Make an order on A',
            },
            {
              offer: new Types.ObjectId(),
              offer_id: 303,
              merchant_id: 3003,
              extra_point: 75,
              sort_order: 2,
              enabled: false,
            },
          ],
        }),
      );
      offerModel.find.mockReturnValue(
        makeQuery([
          {
            _id: offerB,
            offer_id: 202,
            merchant_id: 2002,
            offer_name: 'B',
            disabled: false,
            status: 'approved',
          },
          {
            _id: offerA,
            offer_id: 101,
            merchant_id: 1001,
            offer_name: 'A',
            disabled: false,
            status: 'approved',
          },
        ]),
      );

      const result = await service.getOfferExtraPoint();

      expect(questModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'open',
          $and: expect.arrayContaining([
            expect.objectContaining({ $or: expect.any(Array) }),
            expect.objectContaining({ $or: expect.any(Array) }),
          ]),
        }),
      );
      expect(offerModel.find).toHaveBeenCalledWith({
        _id: { $in: [offerA, offerB] },
        disabled: { $ne: true },
        status: { $nin: ['pending_review', 'rejected'] },
      });
      expect(result).toEqual([
        expect.objectContaining({
          _id: offerA,
          extra_point: 50,
          quest_task_sort_order: 0,
          quest_task_wording: 'Make an order on A',
        }),
        expect.objectContaining({
          _id: offerB,
          extra_point: 25,
          quest_task_sort_order: 1,
        }),
      ]);
    });

    it('getOfferExtraPoint > given no quest tasks > then it falls back to the legacy extra_point query with active-offer filters', async () => {
      questModel.findOne.mockReturnValue(makeQuery({ _id: 'q1', tasks: [] }));

      await service.getOfferExtraPoint();

      expect(offerModel.find).toHaveBeenCalledWith({
        extra_point: { $gt: 1 },
        disabled: { $ne: true },
        status: { $nin: ['pending_review', 'rejected'] },
      });
    });
  });

  describe('findMyOffer', () => {
    // An invalid/unknown user id must fail loudly rather than silently
    // returning another user's deeplinks.
    it('findMyOffer > given an unknown user > then it throws "User not found"', async () => {
      userModel.findOne.mockResolvedValue(null);

      await expect(
        service.findMyOffer(new Types.ObjectId().toHexString(), {
          page: 1,
          limit: 10,
        }),
      ).rejects.toThrow('User not found');
      expect(deeplinkModel.find).not.toHaveBeenCalled();
    });

    it('findMyOffer > given a known user > then each deeplink is enriched with its offer_name', async () => {
      const userId = new Types.ObjectId();
      userModel.findOne.mockResolvedValue({ _id: userId });
      deeplinkModel.find.mockReturnValue(
        makeQuery([{ offer_id: 'off-1', user_id: userId }]),
      );
      offerModel.findOne.mockResolvedValue({ offer_name: 'Shopee' });

      const result = await service.findMyOffer(userId.toHexString(), {
        page: 1,
        limit: 10,
      });

      expect(result).toEqual([
        { offer_id: 'off-1', user_id: userId, offer_name: 'Shopee' },
      ]);
    });
  });

  describe('favoriteOfferByUser (heart toggle)', () => {
    const idUser = new Types.ObjectId().toHexString();
    const idOffer = new Types.ObjectId().toHexString();

    // Toggling a favourite that already exists must REMOVE it and report the
    // un-favourited state (null) — this is the contract the heart icon relies on.
    it('favoriteOfferByUser > given an existing favorite > then it is deleted and null returned', async () => {
      favoriteOfferModel.findOne.mockResolvedValue({ _id: 'fav-1' });

      const result = await service.favoriteOfferByUser(idUser, idOffer);

      expect(favoriteOfferModel.deleteOne).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
    });

    // Toggling a brand-new favourite must PERSIST it and return the saved doc.
    it('favoriteOfferByUser > given no existing favorite > then a new favorite is saved and returned', async () => {
      favoriteOfferModel.findOne.mockResolvedValue(null);
      const saved = { _id: 'fav-new' };
      const save = jest.fn().mockResolvedValue(saved);
      // The service does `new this.favoriteOfferModel({...})` then `.save()`.
      const ctor: any = jest.fn().mockImplementation(() => ({ save }));
      ctor.findOne = favoriteOfferModel.findOne;
      ctor.deleteOne = favoriteOfferModel.deleteOne;
      (service as any).favoriteOfferModel = ctor;

      const result = await service.favoriteOfferByUser(idUser, idOffer);

      expect(save).toHaveBeenCalledTimes(1);
      expect(ctor.deleteOne).not.toHaveBeenCalled();
      expect(result).toBe(saved);
    });
  });

  describe('updateCoupon', () => {
    const baseBody = (): any => ({
      name: 'TENOFF',
      code: 'TEN',
      offer_id: new Types.ObjectId().toHexString(),
    });

    // Coupon money/quantity arrive as strings from the form; they must be
    // coerced to real numbers (and a missing discount must default to 0, not NaN)
    // before being persisted, or downstream cashback math breaks.
    it('updateCoupon > given numeric strings > then discount/quantity are coerced to numbers', async () => {
      const body = { ...baseBody(), discount: '15', quantity: '100' };

      await service.updateCoupon(body);

      const created = couponModel.create.mock.calls[0][0];
      expect(created.discount).toBe(15);
      expect(created.quantity).toBe(100);
      expect(typeof created.discount).toBe('number');
    });

    it('updateCoupon > given a missing discount > then it defaults to 0 (never NaN)', async () => {
      const body = { ...baseBody() };

      await service.updateCoupon(body);

      const created = couponModel.create.mock.calls[0][0];
      expect(created.discount).toBe(0);
      expect(created.quantity).toBe(0);
    });

    it('updateCoupon > given the string "true" for disabled > then it becomes a real boolean', async () => {
      const enabled = await service.updateCoupon({
        ...baseBody(),
        disabled: 'false',
      });
      void enabled;
      const created1 = couponModel.create.mock.calls[0][0];
      expect(created1.disabled).toBe(false);

      couponModel.create.mockClear();
      await service.updateCoupon({ ...baseBody(), disabled: 'true' });
      const created2 = couponModel.create.mock.calls[0][0];
      expect(created2.disabled).toBe(true);
    });

    // No id => create a new coupon. An id => update in place and never carry a
    // stale `id` field. These are two distinct write paths.
    it('updateCoupon > given no id > then a new coupon is created', async () => {
      await service.updateCoupon(baseBody());

      expect(couponModel.create).toHaveBeenCalledTimes(1);
      expect(couponModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('updateCoupon > given an id > then the existing coupon is updated with new:true', async () => {
      const id = new Types.ObjectId().toHexString();
      await service.updateCoupon({ ...baseBody(), id });

      expect(couponModel.findByIdAndUpdate).toHaveBeenCalledTimes(1);
      expect(couponModel.create).not.toHaveBeenCalled();
      const opts = couponModel.findByIdAndUpdate.mock.calls[0][2];
      expect(opts).toEqual({ new: true });
    });

    it('updateCoupon > given link and eligibility > then they are persisted on create', async () => {
      await service.updateCoupon({
        ...baseBody(),
        link: 'https://example.com/promo',
        eligibility: 'all users',
        min_spend: '500',
      });

      const created = couponModel.create.mock.calls[0][0];
      expect(created.link).toBe('https://example.com/promo');
      expect(created.eligibility).toBe('all users');
      expect(created.min_spend).toBe('500');
    });

    it('updateCoupon > given customer display settings > then they are persisted', async () => {
      await service.updateCoupon({
        ...baseBody(),
        code_enabled: false,
        one_time_use_enabled: false,
        usage_per_user: 3,
        unlimited_amount_enabled: false,
        max_cap: 500,
        max_cap_enabled: true,
        max_cap_currency: 'THB',
        min_spend_currency: 'THB',
        discount_type: 'cash',
        discount_currency: 'THB',
        start_time: '09:30',
        end_time: '22:15',
        terms_and_conditions: 'Valid for members only.',
      });

      expect(couponModel.create.mock.calls[0][0]).toMatchObject({
        code_enabled: false,
        one_time_use_enabled: false,
        usage_per_user: 3,
        unlimited_amount_enabled: false,
        max_cap: 500,
        max_cap_enabled: true,
        max_cap_currency: 'THB',
        min_spend_currency: 'THB',
        discount_type: 'cash',
        discount_currency: 'THB',
        start_time: '09:30',
        end_time: '22:15',
        terms_and_conditions: 'Valid for members only.',
      });
    });
  });

  describe('getMissingOrder', () => {
    // Search text is interpolated into a Mongo $regex. Unescaped regex
    // metacharacters are a ReDoS / injection vector — they MUST be escaped so a
    // payload like ".*" matches literally, not as a wildcard.
    it('getMissingOrder > given regex metacharacters in search > then they are escaped before the $regex query', async () => {
      const userId = new Types.ObjectId().toHexString();

      await service.getMissingOrder(1, 10, '.*(', userId);

      const filter = missionOrderModel.find.mock.calls[0][0];
      expect(filter.$or[0].orderId.$regex).toBe('\\.\\*\\(');
    });

    it('getMissingOrder > given a null search > then it does not throw and queries an empty regex', async () => {
      const userId = new Types.ObjectId().toHexString();

      await service.getMissingOrder(1, 10, null as never, userId);

      const filter = missionOrderModel.find.mock.calls[0][0];
      expect(filter.$or[0].orderId.$regex).toBe('');
    });

    it('getMissingOrder > given a user id > then results are scoped to that user', async () => {
      const userId = new Types.ObjectId();
      missionOrderModel.find.mockReturnValue(makeQuery([{ _id: 'm1' }]));
      missionOrderModel.countDocuments = jest.fn().mockResolvedValue(1);

      const result = await service.getMissingOrder(
        1,
        10,
        '',
        userId.toHexString(),
      );

      const filter = missionOrderModel.find.mock.calls[0][0];
      expect(filter.user_id).toBeInstanceOf(Types.ObjectId);
      expect(filter.user_id.toHexString()).toBe(userId.toHexString());
      expect(result.total).toBe(1);
    });
  });

  describe('getDisplayTopBrands', () => {
    it('getDisplayTopBrands > given no config > then returns an empty list and skips the offer lookup', async () => {
      topBrandConfigModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.getDisplayTopBrands()).resolves.toEqual({
        data: [],
      });
      expect(offerModel.find).not.toHaveBeenCalled();
    });

    it('getDisplayTopBrands > given saved entries > then resolves saved order with live offer cashback', async () => {
      topBrandConfigModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          brands: [
            { offerId: 'id2', cashback: '10.0%' },
            { offerId: 'id1', cashback: '12.5%' },
          ],
        }),
      });
      // Returned out of order on purpose: the admin-saved order must win.
      offerModel.find.mockReturnValue(
        makeQuery([
          {
            _id: 'id1',
            offer_id: 1,
            offer_name: 'Alpha',
            logo: 'a.png',
            commission_store: 12.5,
          },
          {
            _id: 'id2',
            offer_id: 2,
            offer_name: 'Bravo',
            logo: 'b.png',
            commission_store: 10,
          },
        ]),
      );

      const result = await service.getDisplayTopBrands();

      expect(offerModel.find).toHaveBeenCalledWith({
        _id: { $in: ['id2', 'id1'] },
        disabled: { $ne: true },
        status: { $nin: ['pending_review', 'rejected'] },
      });
      expect(result).toEqual({
        data: [
          {
            _id: 'id2',
            offer_id: 2,
            brand: 'Bravo',
            logo: 'b.png',
            cashback: '10%',
          },
          {
            _id: 'id1',
            offer_id: 1,
            brand: 'Alpha',
            logo: 'a.png',
            cashback: '12.5%',
          },
        ],
      });
    });

    it('getDisplayTopBrands > given stale saved cashback > then uses the live offer rate', async () => {
      topBrandConfigModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          brands: [{ offerId: 'id1', cashback: 'Up to 2.02%' }],
        }),
      });
      offerModel.find.mockReturnValue(
        makeQuery([
          {
            _id: 'id1',
            offer_id: 1,
            offer_name: 'Lazada',
            logo: 'a.png',
            commission_store: 2.02,
          },
        ]),
      );

      await expect(service.getDisplayTopBrands()).resolves.toEqual({
        data: [
          {
            _id: 'id1',
            offer_id: 1,
            brand: 'Lazada',
            logo: 'a.png',
            cashback: '2.02%',
          },
        ],
      });
    });

    it('getDisplayTopBrands > given admin desktop logo > then prefers it over circle and legacy logo', async () => {
      topBrandConfigModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          brands: [{ offerId: 'id1', cashback: '5%' }],
        }),
      });
      offerModel.find.mockReturnValue(
        makeQuery([
          {
            _id: 'id1',
            offer_id: 5031,
            offer_name: 'Shopee TH - CPS',
            offer_name_display: 'Shopee',
            logo: 'https://involve/legacy.png',
            logo_desktop: 'https://media-staging.gogocash.co/shopee-square.png',
            logo_circle: 'https://media-staging.gogocash.co/shopee-circle.png',
            commission_store: 5,
          },
        ]),
      );

      const result = await service.getDisplayTopBrands();

      expect(result.data).toEqual([
        {
          _id: 'id1',
          offer_id: 5031,
          brand: 'Shopee',
          logo: 'https://media-staging.gogocash.co/shopee-square.png',
          cashback: '5%',
        },
      ]);
    });

    it('getDisplayTopBrands > given circle logo without desktop > then falls back to circle then legacy', async () => {
      topBrandConfigModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          brands: [{ offerId: 'id1', cashback: '5%' }],
        }),
      });
      offerModel.find.mockReturnValue(
        makeQuery([
          {
            _id: 'id1',
            offer_id: 5031,
            offer_name: 'Shopee TH - CPS',
            offer_name_display: 'Shopee',
            logo: 'https://involve/legacy.png',
            logo_circle: 'https://media-staging.gogocash.co/shopee-circle.png',
            commission_store: 5,
          },
        ]),
      );

      const result = await service.getDisplayTopBrands();

      expect(result.data).toEqual([
        {
          _id: 'id1',
          offer_id: 5031,
          brand: 'Shopee',
          logo: 'https://media-staging.gogocash.co/shopee-circle.png',
          cashback: '5%',
        },
      ]);
    });

    it('getDisplayTopBrands > given a saved id with no matching offer > then drops that entry', async () => {
      topBrandConfigModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          brands: [
            { offerId: 'missing', cashback: '5%' },
            { offerId: 'id1', cashback: '12.5%' },
          ],
        }),
      });
      offerModel.find.mockReturnValue(
        makeQuery([
          {
            _id: 'id1',
            offer_id: 1,
            offer_name: 'Alpha',
            logo: 'a.png',
            commission_store: 12.5,
          },
        ]),
      );

      const result = await service.getDisplayTopBrands();

      expect(result.data).toEqual([
        {
          _id: 'id1',
          offer_id: 1,
          brand: 'Alpha',
          logo: 'a.png',
          cashback: '12.5%',
        },
      ]);
    });
  });

  describe('getBannerHome', () => {
    it('getBannerHome > given a banner doc > then it returns a lean object with per-slot schedule fields', async () => {
      bannerModel.findOne.mockReturnValue(
        makeQuery({
          image_1: 'banner-1',
          link_1: 'https://a.com',
          enabled_1: true,
          start_date_1: '2026-06-01',
          end_date_1: '2026-06-30',
          start_date: '2025-01-01',
          end_date: '2025-12-31',
          start_date_2: '2026-07-01',
          end_date_2: '2026-07-31',
        }),
      );

      const result = await service.getBannerHome();

      expect(bannerModel.findOne).toHaveBeenCalledTimes(1);
      expect(result).toEqual(
        expect.objectContaining({
          image_1: 'banner-1',
          link_1: 'https://a.com',
          enabled_1: true,
          start_date_1: '2026-06-01',
          end_date_1: '2026-06-30',
          start_date: '2025-01-01',
          end_date: '2025-12-31',
          start_date_2: '2026-07-01',
          end_date_2: '2026-07-31',
        }),
      );
    });
  });

  describe('getAllBrandBanner', () => {
    it('getAllBrandBanner > then reads the separate all-brand banner model', async () => {
      const banner = { image_1: 'all-brand.png', link_1: '/brand/promo' };
      allBrandBannerModel.findOne.mockReturnValue(makeQuery(banner));

      await expect(service.getAllBrandBanner()).resolves.toEqual(banner);

      expect(allBrandBannerModel.findOne).toHaveBeenCalledTimes(1);
      expect(bannerModel.findOne).not.toHaveBeenCalled();
    });
  });

  describe('saveMissingOrder', () => {
    const userId = new Types.ObjectId().toHexString();
    const offerId = new Types.ObjectId().toHexString();
    const payload = {
      offer_id: offerId,
      orderId: 'ORD-1',
      purchaseDate: '2026-01-01',
      note: 'missing cashback',
      amount: '1200',
    };

    function wireMissionOrderCtor() {
      const saved = { _id: 'mo-1' };
      const save = jest.fn().mockResolvedValue(saved);
      let captured: any;
      const ctor: any = jest.fn().mockImplementation((doc: any) => {
        captured = doc;
        return { save };
      });
      ctor.find = missionOrderModel.find;
      (service as any).missionOrderModel = ctor;
      return { save, saved, getCaptured: () => captured };
    }

    // A new claim must persist with status 'pending' (never auto-approved) and
    // carry the user's reported amount — this is a money-claim audit record.
    it('saveMissingOrder > given a claim > then it persists with status "pending" and the reported amount', async () => {
      const { save, saved, getCaptured } = wireMissionOrderCtor();

      const result = await service.saveMissingOrder(userId, payload, []);

      expect(save).toHaveBeenCalledTimes(1);
      expect(result).toBe(saved);
      const doc = getCaptured();
      expect(doc.status).toBe('pending');
      expect(doc.amount).toBe('1200');
      expect(doc.orderId).toBe('ORD-1');
      expect(doc.attachments).toEqual([]);
    });

    it('saveMissingOrder > given files > then each is uploaded and only the stored URLs are persisted', async () => {
      const { getCaptured } = wireMissionOrderCtor();
      storedMediaService.upload
        .mockResolvedValueOnce(
          'https://storage.googleapis.com/gogocash-catalog-staging/missing-orders/r1.png',
        )
        .mockResolvedValueOnce(
          'https://storage.googleapis.com/gogocash-catalog-staging/missing-orders/r2.png',
        );
      const files = [
        { originalname: 'r1.png' },
        { originalname: 'r2.png' },
      ] as Express.Multer.File[];

      await service.saveMissingOrder(userId, payload, files);

      expect(storedMediaService.upload).toHaveBeenCalledTimes(2);
      expect(getCaptured().attachments).toEqual([
        'https://storage.googleapis.com/gogocash-catalog-staging/missing-orders/r1.png',
        'https://storage.googleapis.com/gogocash-catalog-staging/missing-orders/r2.png',
      ]);
    });
  });

  describe('onApplicationBootstrap (index migration)', () => {
    const runMigration = () =>
      (
        service as unknown as {
          migrateLegacyOfferIndex: () => Promise<void>;
        }
      ).migrateLegacyOfferIndex();

    // The legacy single-field unique index must be dropped exactly once so
    // Mongoose can build the new compound index. Idempotent thereafter.
    it('onApplicationBootstrap > given the legacy offer_id_1 index exists > then it is dropped', async () => {
      offerModel.collection.indexes.mockResolvedValue([
        { name: 'offer_id_1' },
        { name: '_id_' },
      ]);

      service.onApplicationBootstrap();
      await runMigration();

      expect(offerModel.collection.dropIndex).toHaveBeenCalledWith(
        'offer_id_1',
      );
    });

    it('onApplicationBootstrap > given the legacy index is absent > then it is a no-op', async () => {
      offerModel.collection.indexes.mockResolvedValue([{ name: '_id_' }]);

      service.onApplicationBootstrap();
      await runMigration();

      expect(offerModel.collection.dropIndex).not.toHaveBeenCalled();
    });

    // Bootstrap must never crash app startup if the index check fails.
    it('onApplicationBootstrap > given indexes() rejects > then the error is swallowed (no throw)', async () => {
      offerModel.collection.indexes.mockRejectedValue(new Error('no perms'));

      service.onApplicationBootstrap();
      await expect(runMigration()).resolves.toBeUndefined();
      expect(offerModel.collection.dropIndex).not.toHaveBeenCalled();
    });
  });
});
