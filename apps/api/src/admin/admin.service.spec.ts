import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { HttpException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AdminService } from './admin.service';
import { UserAdmin } from './user-admin/schemas/user-admin.schema';
import { Withdraw } from 'src/withdraw/schemas/withdraw.schema';
import { User } from 'src/user/schemas/user.schema';
import { FeeRate } from 'src/withdraw/schemas/feeRate.schema';
import { Offer } from 'src/offer/schemas/offer.schema';
import { Category } from 'src/offer/schemas/category.schema';
import { Conversion } from 'src/withdraw/schemas/conversion.schema';
import { UserMyCashback } from 'src/user/schemas/user-my-cashback.schema';
import { Banner } from 'src/offer/schemas/banner.schema';
import { TopBrandConfig } from 'src/offer/schemas/top-brand-config.schema';
import { Deeplink } from 'src/involve/schemas/deeplink.schema';
import { GoogleDriveService } from 'src/google-drive/google-drive.service';
import { InvolveService } from 'src/involve/involve.service';
import { UserService } from 'src/user/user.service';
import { JobService } from 'src/withdraw/cronjob/job.service';

/** A chainable Mongoose query stub whose terminal `.exec()` resolves to `value`. */
function makeQuery<T>(value: T) {
  const query: Record<string, jest.Mock> = {};
  for (const method of [
    'find',
    'findById',
    'findOne',
    'findByIdAndUpdate',
    'findOneAndUpdate',
    'skip',
    'limit',
    'select',
    'sort',
    'populate',
  ]) {
    query[method] = jest.fn().mockReturnValue(query);
  }
  query.exec = jest.fn().mockResolvedValue(value);
  query.lean = jest.fn().mockResolvedValue(value);
  return query;
}

describe('AdminService', () => {
  let service: AdminService;

  // Model + injected-service mocks, recreated per test for isolation.
  let userAdminModel: any;
  let withdrawModel: any;
  let userModel: any;
  let feeRateModel: any;
  let offerModel: any;
  let categoryModel: any;
  let conversionModel: any;
  let userMyCashbackModel: any;
  let bannerModel: any;
  let topBrandConfigModel: any;
  let deeplinkModel: any;
  let googleDriveService: { uploadFile: jest.Mock; deleteFile: jest.Mock };
  let involveService: { getConversionAll: jest.Mock };
  let userService: { getBalanceMyCashback: jest.Mock };
  let jobService: { syncConversionByConversionId: jest.Mock };

  beforeEach(async () => {
    userAdminModel = {
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      countDocuments: jest.fn(),
    };
    withdrawModel = {
      find: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      countDocuments: jest.fn(),
    };
    userModel = {
      findById: jest.fn(),
      findOne: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };
    feeRateModel = jest.fn() as any;
    feeRateModel.find = jest.fn();
    feeRateModel.findOne = jest.fn();
    feeRateModel.findOneAndUpdate = jest.fn();
    offerModel = {
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };
    categoryModel = {
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };
    conversionModel = {
      find: jest.fn(),
      countDocuments: jest.fn(),
      aggregate: jest.fn(),
    };
    userMyCashbackModel = {};
    bannerModel = {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      updateOne: jest.fn(),
    };
    topBrandConfigModel = { updateOne: jest.fn(), findOne: jest.fn() };
    deeplinkModel = { aggregate: jest.fn() };
    googleDriveService = {
      uploadFile: jest.fn(),
      deleteFile: jest.fn().mockResolvedValue(undefined),
    };
    involveService = { getConversionAll: jest.fn() };
    userService = { getBalanceMyCashback: jest.fn() };
    jobService = { syncConversionByConversionId: jest.fn() };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getModelToken(UserAdmin.name), useValue: userAdminModel },
        { provide: getModelToken(Withdraw.name), useValue: withdrawModel },
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: getModelToken(FeeRate.name), useValue: feeRateModel },
        { provide: getModelToken(Offer.name), useValue: offerModel },
        { provide: getModelToken(Category.name), useValue: categoryModel },
        { provide: getModelToken(Conversion.name), useValue: conversionModel },
        {
          provide: getModelToken(UserMyCashback.name),
          useValue: userMyCashbackModel,
        },
        { provide: getModelToken(Banner.name), useValue: bannerModel },
        {
          provide: getModelToken(TopBrandConfig.name),
          useValue: topBrandConfigModel,
        },
        { provide: getModelToken(Deeplink.name), useValue: deeplinkModel },
        { provide: GoogleDriveService, useValue: googleDriveService },
        { provide: InvolveService, useValue: involveService },
        { provide: UserService, useValue: userService },
        { provide: JobService, useValue: jobService },
      ],
    }).compile();

    service = moduleRef.get<AdminService>(AdminService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('admin scaffold mutations > given request data > then they do not print payloads or ids to stdout', () => {
    const logSpy = jest
      .spyOn(console, 'log')
      .mockImplementation(() => undefined);

    try {
      service.create({
        email: 'admin@example.com',
        password: 'secret',
      } as never);
      service.remove(new Types.ObjectId().toHexString());

      expect(logSpy).not.toHaveBeenCalled();
    } finally {
      logSpy.mockRestore();
    }
  });

  describe('findAll', () => {
    it('findAll > given a search term > then it builds a case-insensitive regex over username and email', async () => {
      userAdminModel.find.mockReturnValue(makeQuery([{ _id: 'a' }]));
      userAdminModel.countDocuments.mockReturnValue(makeQuery(1));

      await service.findAll(1, 10, 'alice');

      expect(userAdminModel.find).toHaveBeenCalledWith({
        $or: [
          { username: { $regex: 'alice', $options: 'i' } },
          { email: { $regex: 'alice', $options: 'i' } },
        ],
      });
    });

    it('findAll > given regex metacharacters > then search input is escaped literally', async () => {
      userAdminModel.find.mockReturnValue(makeQuery([{ _id: 'a' }]));
      userAdminModel.countDocuments.mockReturnValue(makeQuery(1));

      await service.findAll(1, 10, 'a.*');

      expect(userAdminModel.find).toHaveBeenCalledWith({
        $or: [
          { username: { $regex: 'a\\.\\*', $options: 'i' } },
          { email: { $regex: 'a\\.\\*', $options: 'i' } },
        ],
      });
    });

    // Pagination math (skip + totalPages) feeds admin table navigation; an off-by-one
    // here silently drops or duplicates rows across pages.
    it('findAll > given page 3 with limit 10 and 25 total > then skip is 20 and totalPages is 3', async () => {
      const findQuery = makeQuery([{ _id: 'x' }]);
      userAdminModel.find.mockReturnValue(findQuery);
      userAdminModel.countDocuments.mockReturnValue(makeQuery(25));

      const result = await service.findAll(3, 10);

      expect(findQuery.skip).toHaveBeenCalledWith(20);
      expect(findQuery.limit).toHaveBeenCalledWith(10);
      expect(result.pagination).toEqual({
        page: 3,
        limit: 10,
        total: 25,
        totalPages: 3,
      });
    });

    it('findAll > given no search term > then it queries with an empty filter', async () => {
      userAdminModel.find.mockReturnValue(makeQuery([]));
      userAdminModel.countDocuments.mockReturnValue(makeQuery(0));

      await service.findAll();

      expect(userAdminModel.find).toHaveBeenCalledWith({});
    });
  });

  describe('updateRequestWithdraw', () => {
    // The withdraw id arrives as a string from the request; it must be cast to an
    // ObjectId or the update silently matches nothing.
    it('updateRequestWithdraw > given no slip file > then it updates status only and casts the id to ObjectId', async () => {
      const id = new Types.ObjectId().toString();
      withdrawModel.findByIdAndUpdate.mockReturnValue(makeQuery({ _id: id }));

      await service.updateRequestWithdraw(
        { id, status: 'APPROVED' },
        undefined as never,
      );

      const [arg0, arg1] = withdrawModel.findByIdAndUpdate.mock.calls[0];
      expect(arg0).toBeInstanceOf(Types.ObjectId);
      expect(arg0.toString()).toBe(id);
      expect(arg1).toEqual({ $set: { status: 'APPROVED' } });
      expect(googleDriveService.uploadFile).not.toHaveBeenCalled();
    });

    // When a payout slip is attached it must be persisted to Drive and the returned
    // file id recorded on the withdraw — losing this breaks the payout audit trail.
    it('updateRequestWithdraw > given a slip file > then it uploads to Drive and stores the returned file id', async () => {
      const id = new Types.ObjectId().toString();
      googleDriveService.uploadFile.mockResolvedValue({ id: 'drive-file-1' });
      withdrawModel.findByIdAndUpdate.mockReturnValue(makeQuery({ _id: id }));
      const file = { originalname: 'slip.png' } as Express.Multer.File;

      await service.updateRequestWithdraw({ id, status: 'PAID' }, file);

      expect(googleDriveService.uploadFile).toHaveBeenCalledWith(file);
      expect(withdrawModel.findByIdAndUpdate.mock.calls[0][1]).toEqual({
        $set: { status: 'PAID', slip_file: 'drive-file-1' },
      });
    });
  });

  describe('getConversionAll', () => {
    // Fee rate drives the system-fee and max-cap money math in the payout pipeline;
    // its absence must hard-fail rather than silently compute wrong payouts.
    it('getConversionAll > given no fee rate configured > then it throws HttpException 400', async () => {
      feeRateModel.findOne.mockReturnValue(makeQuery(null));

      await expect(service.getConversionAll()).rejects.toBeInstanceOf(
        HttpException,
      );
      await expect(service.getConversionAll()).rejects.toMatchObject({
        status: 400,
      });
      expect(conversionModel.aggregate).not.toHaveBeenCalled();
    });

    // The payout pipeline must sort newest-first BEFORE skip/limit, otherwise each
    // page is internally sorted but pages come back in insertion order (a real
    // regression the source comment warns about).
    it('getConversionAll > given a fee rate > then the aggregation sorts by datetime_conversion before paginating', async () => {
      feeRateModel.findOne.mockReturnValue(
        makeQuery({ system: 10, max_cap: 100 }),
      );
      conversionModel.aggregate.mockReturnValue(makeQuery([]));
      conversionModel.countDocuments.mockReturnValue(makeQuery(0));

      await service.getConversionAll(2, 5);

      const pipeline = conversionModel.aggregate.mock.calls[0][0];
      const sortIdx = pipeline.findIndex((s: any) => s.$sort);
      const skipIdx = pipeline.findIndex((s: any) => s.$skip !== undefined);
      const limitIdx = pipeline.findIndex((s: any) => s.$limit !== undefined);
      expect(pipeline[sortIdx].$sort).toEqual({ datetime_conversion: -1 });
      expect(sortIdx).toBeLessThan(skipIdx);
      expect(pipeline[skipIdx].$skip).toBe(5); // (page 2 - 1) * limit 5
      expect(pipeline[limitIdx].$limit).toBe(5);
    });

    it('getConversionAll > given a conversion_id search key > then it filters by exact conversion_id', async () => {
      feeRateModel.findOne.mockReturnValue(makeQuery({ system: 10 }));
      conversionModel.aggregate.mockReturnValue(makeQuery([]));
      conversionModel.countDocuments.mockReturnValue(makeQuery(0));

      await service.getConversionAll(1, 10, 'CV123', 'conversion_id');

      const pipeline = conversionModel.aggregate.mock.calls[0][0];
      const match = pipeline.find((s: any) => s.$match).$match;
      expect(match.conversion_id).toEqual({ $eq: 'CV123' });
    });
  });

  describe('getConversionInvolveAll', () => {
    // The involve feed stores the GoGoCash user id in aff_sub1, sometimes prefixed
    // "user_id:". The prefix must be stripped before lookup or the user join misses.
    it('getConversionInvolveAll > given aff_sub1 prefixed with user_id: > then it strips the prefix and attaches the matched user', async () => {
      const userId = new Types.ObjectId();
      involveService.getConversionAll.mockResolvedValue({
        data: {
          data: [
            {
              aff_sub1: `user_id:${userId.toString()}`,
              datetime_conversion: '2026-01-01T00:00:00.000Z',
            },
          ],
        },
      });
      userModel.findById.mockResolvedValue({
        _id: userId,
        username: 'bob',
        email: 'bob@x.co',
      });

      const result = await service.getConversionInvolveAll(1, 10);

      // Looked up by the stripped id, not the raw "user_id:..." string.
      const lookupArg = userModel.findById.mock.calls[0][0];
      expect(lookupArg.toString()).toBe(userId.toString());
      expect(result.data.data[0].aff_sub1).toBe(userId.toString());
      expect(result.data.data[0].user).toEqual({
        username: 'bob',
        email: 'bob@x.co',
        _id: userId,
      });
    });

    it('getConversionInvolveAll > given no matching user > then user is null on the row', async () => {
      involveService.getConversionAll.mockResolvedValue({
        data: {
          data: [
            {
              aff_sub1: 'ffffffffffffffffffffffff',
              datetime_conversion: '2026-01-01T00:00:00.000Z',
            },
          ],
        },
      });
      userModel.findById.mockResolvedValue(null);

      const result = await service.getConversionInvolveAll();

      expect(result.data.data[0].user).toBeNull();
    });
  });

  describe('updateFeeRate', () => {
    // An existing fee-rate row must be upserted in place (not duplicated), since the
    // service reads the single fee row everywhere for payout math.
    it('updateFeeRate > given an existing fee rate > then it upserts the existing document', async () => {
      const feeId = new Types.ObjectId().toHexString();
      const existing = { _id: feeId };
      feeRateModel.findOne.mockReturnValue(makeQuery(existing));
      const updateQuery = makeQuery({ _id: feeId, system: 7 });
      feeRateModel.findOneAndUpdate.mockReturnValue(updateQuery);

      await service.updateFeeRate({ system: 7 } as never, feeId);

      expect(feeRateModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: expect.any(Types.ObjectId) },
        { $set: { system: 7 } },
        { upsert: true, new: true },
      );
    });

    it('updateFeeRate > given no existing fee rate > then it constructs and saves a new document', async () => {
      feeRateModel.findOne.mockReturnValue(makeQuery(null));
      const save = jest.fn().mockResolvedValue({ _id: 'new-fee' });
      // The service does `new this.feeRateModel(dto)`, so the model ctor must be callable.
      (feeRateModel as jest.Mock).mockImplementation(() => ({ save }));

      const result = await service.updateFeeRate(
        { system: 3 } as never,
        new Types.ObjectId().toHexString(),
      );

      expect(feeRateModel).toHaveBeenCalledWith({ system: 3 });
      expect(save).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ _id: 'new-fee' });
      expect(feeRateModel.findOneAndUpdate).not.toHaveBeenCalled();
    });
  });

  describe('updateOffer', () => {
    const offerId = new Types.ObjectId().toHexString();

    it('updateOffer > given an unknown offer id > then it throws "Offer not found"', async () => {
      offerModel.findById.mockReturnValue(makeQuery(null));

      await expect(
        service.updateOffer(new Types.ObjectId().toHexString(), {
          product_type: [],
        }),
      ).rejects.toThrow('Offer not found');
    });

    // Replacing a logo must upload the new asset AND delete the prior one, or orphaned
    // Drive files accumulate; new ids must be written, untouched assets preserved.
    it('updateOffer > given a new desktop logo > then it uploads the new file, deletes the old, and persists the new id', async () => {
      offerModel.findById.mockReturnValue(
        makeQuery({
          _id: offerId,
          logo_desktop: 'old-logo',
          logo_mobile: 'keep-mobile',
        }),
      );
      googleDriveService.uploadFile.mockResolvedValue({ id: 'new-logo' });
      offerModel.findByIdAndUpdate.mockReturnValue(makeQuery({ _id: offerId }));

      await service.updateOffer(offerId, {
        logo_desktop: { originalname: 'logo.png' } as Express.Multer.File,
        product_type: [],
      });

      expect(googleDriveService.deleteFile).toHaveBeenCalledWith('old-logo');
      const persisted = offerModel.findByIdAndUpdate.mock.calls[0][1].$set;
      expect(persisted.logo_desktop).toBe('new-logo');
      expect(persisted.logo_mobile).toBe('keep-mobile');
    });

    it('updateOffer > given a stringified product_type > then it is JSON-parsed before persistence', async () => {
      offerModel.findById.mockReturnValue(makeQuery({ _id: offerId }));
      offerModel.findByIdAndUpdate.mockReturnValue(makeQuery({ _id: offerId }));

      await service.updateOffer(offerId, {
        product_type: '[{"name":"game","minimum":"1"}]' as never,
      });

      const persisted = offerModel.findByIdAndUpdate.mock.calls[0][1].$set;
      expect(persisted.product_type).toEqual([{ name: 'game', minimum: '1' }]);
    });

    it('updateOffer > given a tracking_link > then it persists the customer redirect link', async () => {
      offerModel.findById.mockReturnValue(
        makeQuery({
          _id: offerId,
          tracking_link: 'https://track.example/old',
        }),
      );
      offerModel.findByIdAndUpdate.mockReturnValue(makeQuery({ _id: offerId }));

      await service.updateOffer(offerId, {
        product_type: [],
        tracking_link: ' https://track.example/new ',
      });

      const persisted = offerModel.findByIdAndUpdate.mock.calls[0][1].$set;
      expect(persisted.tracking_link).toBe('https://track.example/new');
    });

    it('updateOffer > given omitted booleans and zero economics > then it preserves flags and persists zeros', async () => {
      offerModel.findById.mockReturnValue(
        makeQuery({
          _id: offerId,
          disabled: true,
          extra_store: true,
          commission_store: 15,
          max_cap: 500,
        }),
      );
      offerModel.findByIdAndUpdate.mockReturnValue(makeQuery({ _id: offerId }));

      await service.updateOffer(offerId, {
        commission_store: 0,
        max_cap: 0,
        product_type: [],
      });

      const persisted = offerModel.findByIdAndUpdate.mock.calls[0][1].$set;
      expect(persisted.disabled).toBe(true);
      expect(persisted.extra_store).toBe(true);
      expect(persisted.commission_store).toBe(0);
      expect(persisted.max_cap).toBe(0);
    });
  });

  describe('updateBannerHome', () => {
    it('updateBannerHome > given no existing banner doc > then it upserts with new slot controls and does not delete files', async () => {
      bannerModel.findOne.mockReturnValue(makeQuery(null));
      bannerModel.findOneAndUpdate.mockReturnValue(
        makeQuery({ _id: 'banner-doc' }),
      );

      await service.updateBannerHome({
        link_1: '/slot-1',
        link_2: '',
        link_3: '',
        link_4: '',
        link_5: '',
        image_1: null,
        image_2: null,
        image_3: null,
        image_4: null,
        image_5: null,
        enabled_1: true,
        enabled_2: false,
        start_date_1: '2026-06-01',
        end_date_1: '2026-06-30',
        start_date_2: '2026-07-01',
        end_date_2: '2026-07-31',
      } as never);

      const [, update] = bannerModel.findOneAndUpdate.mock.calls[0];
      expect(update.$set).toEqual(
        expect.objectContaining({
          link_1: '/slot-1',
          link_2: '',
          link_3: '',
          link_4: '',
          link_5: '',
          enabled_1: true,
          enabled_2: false,
          start_date_1: '2026-06-01',
          end_date_1: '2026-06-30',
          start_date_2: '2026-07-01',
          end_date_2: '2026-07-31',
        }),
      );
      expect(update.$set.image_1).toBeUndefined();
      expect(googleDriveService.deleteFile).not.toHaveBeenCalled();
      expect(bannerModel.findOneAndUpdate).toHaveBeenCalledWith(
        {},
        expect.any(Object),
        { upsert: true, new: true },
      );
    });

    it('updateBannerHome > given legacy start_date/end_date on existing doc > then those values are preserved in the upsert payload', async () => {
      bannerModel.findOne.mockReturnValue(
        makeQuery({
          _id: 'banner-doc',
          start_date: '2025-01-01',
          end_date: '2025-12-31',
          start_date_2: '2025-02-01',
          enabled_2: false,
          image_1: 'old-image-id',
        }),
      );
      bannerModel.findOneAndUpdate.mockReturnValue(
        makeQuery({ _id: 'banner-doc' }),
      );

      await service.updateBannerHome({
        link_1: '/updated-slot-1',
        link_2: '/updated-slot-2',
        image_1: null,
        image_2: null,
        image_3: null,
        image_4: null,
        image_5: null,
      } as never);

      const [, update] = bannerModel.findOneAndUpdate.mock.calls[0];
      expect(update.$set).toMatchObject({
        start_date: '2025-01-01',
        end_date: '2025-12-31',
        start_date_2: '2025-02-01',
        enabled_2: false,
        image_1: 'old-image-id',
      });
      expect(update.$set.enabled_1).toBeUndefined();
      expect(update.$set.link_1).toBe('/updated-slot-1');
      expect(update.$set.link_2).toBe('/updated-slot-2');
    });

    it('updateBannerHome > given a partial slot update > then omitted links are preserved', async () => {
      bannerModel.findOne.mockReturnValue(
        makeQuery({
          _id: 'banner-doc',
          image_1: 'old-image-1',
          link_1: '/old-slot-1',
          link_2: '/old-slot-2',
          link_3: '/old-slot-3',
          link_4: '/old-slot-4',
          link_5: '/old-slot-5',
        }),
      );
      bannerModel.findOneAndUpdate.mockReturnValue(
        makeQuery({ _id: 'banner-doc' }),
      );

      await service.updateBannerHome({
        link_1: '/new-slot-1',
        link_2: null,
        link_3: null,
        link_4: null,
        link_5: null,
        image_1: null,
        image_2: null,
        image_3: null,
        image_4: null,
        image_5: null,
      } as never);

      const [, update] = bannerModel.findOneAndUpdate.mock.calls[0];
      expect(update.$set).toEqual(
        expect.objectContaining({
          link_1: '/new-slot-1',
          link_2: '/old-slot-2',
          link_3: '/old-slot-3',
          link_4: '/old-slot-4',
          link_5: '/old-slot-5',
        }),
      );
    });

    it('updateBannerHome > given an explicit blank slot link > then that link can be cleared', async () => {
      bannerModel.findOne.mockReturnValue(
        makeQuery({
          _id: 'banner-doc',
          link_1: '/old-slot-1',
        }),
      );
      bannerModel.findOneAndUpdate.mockReturnValue(
        makeQuery({ _id: 'banner-doc' }),
      );

      await service.updateBannerHome({
        link_1: '',
        image_1: null,
        image_2: null,
        image_3: null,
        image_4: null,
        image_5: null,
      } as never);

      const [, update] = bannerModel.findOneAndUpdate.mock.calls[0];
      expect(update.$set.link_1).toBe('');
    });

    it('updateBannerHome > given clear_image for a slot > then removes the stored image id', async () => {
      bannerModel.findOne.mockReturnValue(
        makeQuery({
          _id: 'banner-doc',
          image_2: 'drive-file-2',
          link_2: '/promo',
        }),
      );
      bannerModel.findOneAndUpdate.mockReturnValue(
        makeQuery({ _id: 'banner-doc' }),
      );

      await service.updateBannerHome({
        clear_image_2: true,
        link_2: '',
        enabled_2: false,
        image_1: null,
        image_2: null,
        image_3: null,
        image_4: null,
        image_5: null,
      } as never);

      expect(googleDriveService.deleteFile).toHaveBeenCalledWith(
        'drive-file-2',
      );
      const [, update] = bannerModel.findOneAndUpdate.mock.calls[0];
      expect(update.$set.image_2).toBeNull();
      expect(update.$set.link_2).toBe('');
    });
  });

  describe('updateUser', () => {
    // Mobile numbers must be unique across users; reassigning one already owned by a
    // DIFFERENT user must be rejected to prevent account-takeover via OTP collisions.
    it('updateUser > given the mobile belongs to another user > then it throws HttpException 400', async () => {
      const otherUserId = new Types.ObjectId();
      userModel.findOne.mockReturnValue(
        makeQuery({ _id: otherUserId, mobile: '0812345678' }),
      );

      await expect(
        service.updateUser(new Types.ObjectId().toString(), '0812345678'),
      ).rejects.toMatchObject({ status: 400 });
      expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    // Re-saving the SAME user's own number must be allowed (idempotent edit), not
    // falsely flagged as a collision.
    it('updateUser > given the mobile belongs to the same user > then it persists the update', async () => {
      const id = new Types.ObjectId();
      userModel.findOne.mockReturnValue(makeQuery({ _id: id, mobile: '0812' }));
      userModel.findByIdAndUpdate.mockReturnValue(
        makeQuery({ _id: id, mobile: '0812' }),
      );

      await service.updateUser(id.toString(), '0812');

      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        expect.any(Types.ObjectId),
        { mobile: '0812' },
        { new: true },
      );
    });

    it('updateUser > given no user owns the mobile > then it persists the update', async () => {
      const userId = new Types.ObjectId().toHexString();
      userModel.findOne.mockReturnValue(makeQuery(null));
      userModel.findByIdAndUpdate.mockReturnValue(makeQuery({ _id: userId }));

      await service.updateUser(userId, '0899999999');

      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        expect.any(Types.ObjectId),
        { mobile: '0899999999' },
        { new: true },
      );
    });
  });

  describe('saveTopBrands', () => {
    // The curated top-brands list (ordered offer ids + admin cashback labels) is
    // stored as a single upserted config doc in its own collection (empty filter
    // = the singleton); upsert prevents duplicate config rows.
    it('saveTopBrands > given curated brand entries > then it upserts a single config doc', async () => {
      topBrandConfigModel.updateOne.mockResolvedValue({ acknowledged: true });
      const brands = [
        { offerId: 'offer-1', cashback: '12.5%' },
        { offerId: 'offer-2', cashback: '10.0%' },
      ];

      const result = await service.saveTopBrands(brands);

      expect(topBrandConfigModel.updateOne).toHaveBeenCalledTimes(1);
      const [filter, update, opts] =
        topBrandConfigModel.updateOne.mock.calls[0];
      expect(filter).toEqual({});
      expect(update.$set).toEqual({ brands });
      expect(opts).toEqual({ upsert: true });
      expect(result).toEqual({ success: true, brands });
    });
  });

  describe('getTopBrands', () => {
    it('getTopBrands > given saved config > then returns saved order, cashback, and resolved offers in config order', async () => {
      const brands = [
        { offerId: 'offer-2', cashback: '12%' },
        { offerId: 'missing-offer', cashback: '9%' },
        { offerId: 'offer-1', cashback: '8%' },
      ];
      const offer1 = {
        _id: 'offer-1',
        offer_name: 'Banana IT',
        logo: 'banana.png',
      };
      const offer2 = {
        _id: 'offer-2',
        offer_name: 'Adidas',
        logo: 'adidas.png',
      };

      topBrandConfigModel.findOne.mockReturnValue(makeQuery({ brands }));
      offerModel.find.mockReturnValue(makeQuery([offer1, offer2]));

      const result = await service.getTopBrands();

      expect(offerModel.find).toHaveBeenCalledWith({
        _id: { $in: ['offer-2', 'missing-offer', 'offer-1'] },
      });
      expect(result).toEqual({
        order: ['offer-2', 'missing-offer', 'offer-1'],
        brands,
        items: [offer2, offer1],
      });
    });

    it('getTopBrands > given no saved config > then returns an empty editable config and skips offer lookup', async () => {
      topBrandConfigModel.findOne.mockReturnValue(makeQuery(null));

      await expect(service.getTopBrands()).resolves.toEqual({
        order: [],
        brands: [],
        items: [],
      });
      expect(offerModel.find).not.toHaveBeenCalled();
    });
  });

  describe('approveOffer', () => {
    it('approveOffer > given an invalid offer id > then it throws HttpException 400', async () => {
      await expect(
        service.approveOffer('not-an-objectid', 'admin-1'),
      ).rejects.toMatchObject({ status: 400 });
      expect(offerModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('approveOffer > given a valid id with no matching offer > then it throws HttpException 404', async () => {
      const offerId = new Types.ObjectId().toString();
      offerModel.findByIdAndUpdate.mockReturnValue(makeQuery(null));

      await expect(
        service.approveOffer(offerId, 'admin-1'),
      ).rejects.toMatchObject({ status: 404 });
    });

    // Approving must clear any prior rejection_reason so an un-reject / re-approve
    // cycle leaves a clean audit record (no stale rejection text on a live offer).
    it('approveOffer > given a valid offer > then it sets approved status and $unsets the rejection reason', async () => {
      const offerId = new Types.ObjectId().toString();
      offerModel.findByIdAndUpdate.mockReturnValue(
        makeQuery({ _id: offerId, status: 'approved' }),
      );

      await service.approveOffer(offerId, 'admin-7');

      const update = offerModel.findByIdAndUpdate.mock.calls[0][1];
      expect(update.$set).toMatchObject({
        status: 'approved',
        reviewed_by: 'admin-7',
      });
      expect(update.$set.reviewed_at).toBeInstanceOf(Date);
      expect(update.$unset).toEqual({ rejection_reason: '' });
    });
  });

  describe('rejectOffer', () => {
    it('rejectOffer > given an invalid offer id > then it throws HttpException 400', async () => {
      await expect(
        service.rejectOffer('bad-id', 'admin-1', 'spam'),
      ).rejects.toMatchObject({ status: 400 });
    });

    // A rejection without a reason is unauditable; whitespace-only reasons must be
    // treated as empty and rejected.
    it('rejectOffer > given a blank reason > then it throws HttpException 400 and does not update', async () => {
      const offerId = new Types.ObjectId().toString();

      await expect(
        service.rejectOffer(offerId, 'admin-1', '   '),
      ).rejects.toMatchObject({ status: 400 });
      expect(offerModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('rejectOffer > given a valid id with no matching offer > then it throws HttpException 404', async () => {
      const offerId = new Types.ObjectId().toString();
      offerModel.findByIdAndUpdate.mockReturnValue(makeQuery(null));

      await expect(
        service.rejectOffer(offerId, 'admin-1', 'duplicate'),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('rejectOffer > given a valid reason > then it trims the reason and stores it with rejected status', async () => {
      const offerId = new Types.ObjectId().toString();
      offerModel.findByIdAndUpdate.mockReturnValue(
        makeQuery({ _id: offerId, status: 'rejected' }),
      );

      await service.rejectOffer(offerId, 'admin-9', '  bad content  ');

      const update = offerModel.findByIdAndUpdate.mock.calls[0][1];
      expect(update.$set).toMatchObject({
        status: 'rejected',
        reviewed_by: 'admin-9',
        rejection_reason: 'bad content',
      });
    });
  });

  describe('getCreatedConversions', () => {
    // Admin-created quest rewards are the only conversions with this synthetic
    // offer_name; the query must scope to it or unrelated affiliate conversions leak in.
    it('getCreatedConversions > given defaults > then it queries only reward_conversion_quest conversions newest-first', async () => {
      const findQuery = makeQuery([{ _id: 'c1' }]);
      conversionModel.find.mockReturnValue(findQuery);
      conversionModel.countDocuments.mockResolvedValue(1);

      const result = await service.getCreatedConversions();

      expect(conversionModel.find).toHaveBeenCalledWith({
        offer_name: 'reward_conversion_quest',
      });
      expect(findQuery.sort).toHaveBeenCalledWith({ datetime_conversion: -1 });
      expect(result.pagination.totalPages).toBe(1);
    });
  });

  describe('getMyCashBackUser', () => {
    it('getMyCashBackUser > given a user id > then it returns the userMyCashback from the user service', async () => {
      userService.getBalanceMyCashback.mockResolvedValue({
        userMyCashback: { balance: 42 },
      });

      const result = await service.getMyCashBackUser('user-1');

      expect(userService.getBalanceMyCashback).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ balance: 42 });
    });
  });

  describe('updateConversionDataByConversionId', () => {
    it('updateConversionDataByConversionId > given a conversion id > then it delegates to the job service', async () => {
      jobService.syncConversionByConversionId.mockResolvedValue({ ok: true });

      const result = await service.updateConversionDataByConversionId('CV-99');

      expect(jobService.syncConversionByConversionId).toHaveBeenCalledWith(
        'CV-99',
      );
      expect(result).toEqual({ ok: true });
    });
  });
});
