import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { OfferService } from './offer.service';
import { Offer } from './schemas/offer.schema';
import { Category } from './schemas/category.schema';
import { Coupon } from './schemas/coupon.schema';
import { FavoriteOffer } from './schemas/favorite-offer.schema';
import { Banner } from './schemas/banner.schema';
import { MissionOrder } from './schemas/missing-order.schema';
import { Deeplink } from 'src/involve/schemas/deeplink.schema';
import { User } from 'src/user/schemas/user.schema';
import { GoogleDriveService } from 'src/google-drive/google-drive.service';

/**
 * A chainable Mongoose query stub. Each builder method returns `this` so that
 * `.find().skip().limit().exec()` / `.lean()` / `.sort()` chains resolve to the
 * configured terminal value. `result` is what `exec`/`lean` resolve to.
 */
function makeQuery(result: unknown) {
  const q: Record<string, jest.Mock> = {};
  for (const m of ['find', 'skip', 'limit', 'populate', 'sort']) {
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
  let missionOrderModel: any;
  let googleDriveService: { uploadFile: jest.Mock };

  beforeEach(async () => {
    offerModel = {
      find: jest.fn().mockReturnValue(makeQuery([])),
      findById: jest.fn(),
      findOne: jest.fn(),
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
      find: jest.fn().mockReturnValue(makeQuery([])),
      countDocuments: jest.fn().mockResolvedValue(0),
    };
    bannerModel = { findOne: jest.fn() };
    // missionOrderModel is used BOTH as a constructor (`new this.missionOrderModel(...)`)
    // and as a static query holder (`this.missionOrderModel.find(...)`), so the
    // mock must be a callable with static query methods attached.
    missionOrderModel = jest.fn();
    missionOrderModel.find = jest.fn().mockReturnValue(makeQuery([]));
    missionOrderModel.countDocuments = jest.fn().mockResolvedValue(0);
    googleDriveService = { uploadFile: jest.fn() };

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
          provide: getModelToken(MissionOrder.name),
          useValue: missionOrderModel,
        },
        { provide: GoogleDriveService, useValue: googleDriveService },
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

    it('findAll > given search/category/country terms > then they become case-insensitive regex filters', async () => {
      await service.findAll(1, 10, 'shopee', 'fashion', 'Thailand');

      const filter = offerModel.find.mock.calls[0][0];
      expect(filter.offer_name).toEqual({ $regex: 'shopee', $options: 'i' });
      expect(filter.categories).toEqual({ $regex: 'fashion', $options: 'i' });
      expect(filter.countries).toEqual({ $regex: 'Thailand', $options: 'i' });
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

    // Each uploaded receipt is pushed to Drive and only the returned file ids
    // are stored — raw buffers never hit the DB.
    it('saveMissingOrder > given files > then each is uploaded and only the drive ids are stored', async () => {
      const { getCaptured } = wireMissionOrderCtor();
      googleDriveService.uploadFile
        .mockResolvedValueOnce({ id: 'drive-a' })
        .mockResolvedValueOnce({ id: 'drive-b' });
      const files = [
        { originalname: 'r1.png' },
        { originalname: 'r2.png' },
      ] as Express.Multer.File[];

      await service.saveMissingOrder(userId, payload, files);

      expect(googleDriveService.uploadFile).toHaveBeenCalledTimes(2);
      expect(getCaptured().attachments).toEqual(['drive-a', 'drive-b']);
    });
  });

  describe('onApplicationBootstrap (index migration)', () => {
    // The legacy single-field unique index must be dropped exactly once so
    // Mongoose can build the new compound index. Idempotent thereafter.
    it('onApplicationBootstrap > given the legacy offer_id_1 index exists > then it is dropped', async () => {
      offerModel.collection.indexes.mockResolvedValue([
        { name: 'offer_id_1' },
        { name: '_id_' },
      ]);

      await service.onApplicationBootstrap();

      expect(offerModel.collection.dropIndex).toHaveBeenCalledWith(
        'offer_id_1',
      );
    });

    it('onApplicationBootstrap > given the legacy index is absent > then it is a no-op', async () => {
      offerModel.collection.indexes.mockResolvedValue([{ name: '_id_' }]);

      await service.onApplicationBootstrap();

      expect(offerModel.collection.dropIndex).not.toHaveBeenCalled();
    });

    // Bootstrap must never crash app startup if the index check fails.
    it('onApplicationBootstrap > given indexes() rejects > then the error is swallowed (no throw)', async () => {
      offerModel.collection.indexes.mockRejectedValue(new Error('no perms'));

      await expect(service.onApplicationBootstrap()).resolves.toBeUndefined();
      expect(offerModel.collection.dropIndex).not.toHaveBeenCalled();
    });
  });
});
