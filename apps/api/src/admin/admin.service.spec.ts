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
      expect(arg1).toEqual({ status: 'APPROVED' });
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
        status: 'PAID',
        slip_file: 'drive-file-1',
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
      expect(match.$or).toEqual([{ conversion_id: 'CV123' }]);
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
      const existing = { _id: 'fee-1' };
      feeRateModel.findOne.mockReturnValue(makeQuery(existing));
      const updateQuery = makeQuery({ _id: 'fee-1', system: 7 });
      feeRateModel.findOneAndUpdate.mockReturnValue(updateQuery);

      await service.updateFeeRate({ system: 7 } as never, 'fee-1');

      expect(feeRateModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'fee-1' },
        { system: 7 },
        { upsert: true, new: true },
      );
    });

    it('updateFeeRate > given no existing fee rate > then it constructs and saves a new document', async () => {
      feeRateModel.findOne.mockReturnValue(makeQuery(null));
      const save = jest.fn().mockResolvedValue({ _id: 'new-fee' });
      // The service does `new this.feeRateModel(dto)`, so the model ctor must be callable.
      (feeRateModel as jest.Mock).mockImplementation(() => ({ save }));

      const result = await service.updateFeeRate({ system: 3 } as never, 'x');

      expect(feeRateModel).toHaveBeenCalledWith({ system: 3 });
      expect(save).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ _id: 'new-fee' });
      expect(feeRateModel.findOneAndUpdate).not.toHaveBeenCalled();
    });
  });

  describe('updateOffer', () => {
    it('updateOffer > given an unknown offer id > then it throws "Offer not found"', async () => {
      offerModel.findById.mockReturnValue(makeQuery(null));

      await expect(
        service.updateOffer('missing', { product_type: [] }),
      ).rejects.toThrow('Offer not found');
    });

    // Replacing a logo must upload the new asset AND delete the prior one, or orphaned
    // Drive files accumulate; new ids must be written, untouched assets preserved.
    it('updateOffer > given a new desktop logo > then it uploads the new file, deletes the old, and persists the new id', async () => {
      offerModel.findById.mockReturnValue(
        makeQuery({
          _id: 'o1',
          logo_desktop: 'old-logo',
          logo_mobile: 'keep-mobile',
        }),
      );
      googleDriveService.uploadFile.mockResolvedValue({ id: 'new-logo' });
      offerModel.findByIdAndUpdate.mockReturnValue(makeQuery({ _id: 'o1' }));

      await service.updateOffer('o1', {
        logo_desktop: { originalname: 'logo.png' } as Express.Multer.File,
        product_type: [],
      });

      expect(googleDriveService.deleteFile).toHaveBeenCalledWith('old-logo');
      const persisted = offerModel.findByIdAndUpdate.mock.calls[0][1];
      expect(persisted.logo_desktop).toBe('new-logo');
      expect(persisted.logo_mobile).toBe('keep-mobile');
    });

    it('updateOffer > given a stringified product_type > then it is JSON-parsed before persistence', async () => {
      offerModel.findById.mockReturnValue(makeQuery({ _id: 'o1' }));
      offerModel.findByIdAndUpdate.mockReturnValue(makeQuery({ _id: 'o1' }));

      await service.updateOffer('o1', {
        product_type: '[{"name":"game","minimum":"1"}]' as never,
      });

      const persisted = offerModel.findByIdAndUpdate.mock.calls[0][1];
      expect(persisted.product_type).toEqual([{ name: 'game', minimum: '1' }]);
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
        id.toString(),
        { mobile: '0812' },
        { new: true },
      );
    });

    it('updateUser > given no user owns the mobile > then it persists the update', async () => {
      userModel.findOne.mockReturnValue(makeQuery(null));
      userModel.findByIdAndUpdate.mockReturnValue(makeQuery({ _id: 'u1' }));

      await service.updateUser('u1', '0899999999');

      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'u1',
        { mobile: '0899999999' },
        { new: true },
      );
    });
  });

  describe('saveTopBrands', () => {
    // Manual brand ordering is stored as a single upserted banner-config doc keyed by
    // type; the upsert flag prevents creating duplicate ordering rows.
    it('saveTopBrands > given an ordering array > then it upserts a single top_brands config doc', async () => {
      bannerModel.updateOne.mockResolvedValue({ acknowledged: true });

      const result = await service.saveTopBrands(['b1', 'b2']);

      expect(bannerModel.updateOne).toHaveBeenCalledTimes(1);
      const [filter, update, opts] = bannerModel.updateOne.mock.calls[0];
      expect(filter).toEqual({ type: 'top_brands' });
      expect(update.$set).toMatchObject({
        type: 'top_brands',
        order: ['b1', 'b2'],
      });
      expect(opts).toEqual({ upsert: true });
      expect(result).toEqual({ success: true, order: ['b1', 'b2'] });
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
