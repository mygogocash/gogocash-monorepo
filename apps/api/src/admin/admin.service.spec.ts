import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import {
  ConflictException,
  HttpException,
  UnauthorizedException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { AdminService } from './admin.service';
import { UserAdmin } from './user-admin/schemas/user-admin.schema';
import { Withdraw } from 'src/withdraw/schemas/withdraw.schema';
import { WithdrawFeeCoupon } from 'src/withdraw/schemas/withdraw-fee-coupon.schema';
import { WithdrawFeeCouponRedemption } from 'src/withdraw/schemas/withdraw-fee-coupon-redemption.schema';
import { User } from 'src/user/schemas/user.schema';
import { FeeRate } from 'src/withdraw/schemas/feeRate.schema';
import { Offer } from 'src/offer/schemas/offer.schema';
import { Category } from 'src/offer/schemas/category.schema';
import { Conversion } from 'src/withdraw/schemas/conversion.schema';
import { UserMyCashback } from 'src/user/schemas/user-my-cashback.schema';
import { Banner } from 'src/offer/schemas/banner.schema';
import { SPECIFIC_PAGE_BANNER_MODEL } from 'src/offer/schemas/specific-page-banner.schema';
import { TopBrandConfig } from 'src/offer/schemas/top-brand-config.schema';
import { LandingRailConfig } from 'src/offer/schemas/landing-rail-config.schema';
import { Deeplink } from 'src/involve/schemas/deeplink.schema';
import { StoredMediaService } from 'src/media/stored-media.service';
import { MEDIA_FOLDER } from 'src/media/media-folders.config';
import { InvolveService } from 'src/involve/involve.service';
import { UserService } from 'src/user/user.service';
import { JobService } from 'src/withdraw/cronjob/job.service';
import { CategoryIntegrityService } from 'src/policy/category-integrity.service';
import { PolicyMediaCleanupService } from 'src/policy/policy-media-cleanup.service';
import { PolicyMediaWriteService } from 'src/policy/policy-media-write.service';
import { PolicyMediaAssetRegistryService } from 'src/policy/policy-media-asset-registry.service';
import { AdminActivityService } from './activity/admin-activity.service';

/** A chainable Mongoose query stub whose terminal `.exec()` resolves to `value`. */
function makeQuery<T>(value: T) {
  const query: Record<string, jest.Mock> & {
    then?: (
      onfulfilled?: ((value: T) => unknown) | null,
      onrejected?: ((reason: unknown) => unknown) | null,
    ) => Promise<unknown>;
  } = {};
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
    'session',
    'read',
  ]) {
    query[method] = jest.fn().mockReturnValue(query);
  }
  query.exec = jest.fn().mockResolvedValue(value);
  // lean() stays chainable (e.g. .lean().exec()) and thenable so
  // `await model.findOne().lean()` resolves to the document.
  query.lean = jest.fn().mockReturnValue(query);
  query.then = (onfulfilled, onrejected) =>
    Promise.resolve(value).then(onfulfilled, onrejected);
  return query;
}

describe('AdminService', () => {
  let service: AdminService;

  // Model + injected-service mocks, recreated per test for isolation.
  let userAdminModel: any;
  let withdrawModel: any;
  let withdrawFeeCouponModel: any;
  let withdrawFeeCouponRedemptionModel: any;
  let userModel: any;
  let feeRateModel: any;
  let offerModel: any;
  let categoryModel: any;
  let conversionModel: any;
  let userMyCashbackModel: any;
  let bannerModel: any;
  let allBrandBannerModel: any;
  let specificPageBannerModel: any;
  let topBrandConfigModel: any;
  let landingRailConfigModel: any;
  let deeplinkModel: any;
  let storedMediaService: {
    upload: jest.Mock;
    replace: jest.Mock;
    deleteStored: jest.Mock;
    getReadableStream: jest.Mock;
  };
  let involveService: { getConversionAll: jest.Mock };
  let userService: { getBalanceMyCashback: jest.Mock };
  let jobService: { syncConversionByConversionId: jest.Mock };
  let categoryIntegrity: {
    withNormalWrite: jest.Mock;
    assertPolicyCategoryAssignmentReady: jest.Mock;
    withPolicyCategoryAssignment: jest.Mock;
    createLegacyCategory: jest.Mock;
    updateLegacyCategoryMetadata: jest.Mock;
    reserveLegacyCategoryRenameInSession: jest.Mock;
    withIntegrityMutation: jest.Mock;
    policyCategoryAssignmentInSession: jest.Mock;
  };
  let policyMediaCleanup: {
    journalLegacyReplacements: jest.Mock;
    journalUncertainUploads: jest.Mock;
    processRequest: jest.Mock;
  };
  let policyMediaWrite: { execute: jest.Mock };
  let policyMediaRegistry: { touchAttachInSession: jest.Mock };
  let adminActivity: { append: jest.Mock; appendRequired: jest.Mock };
  let connection: {
    startSession: jest.Mock;
    collection: jest.Mock;
  };
  let session: {
    withTransaction: jest.Mock;
    endSession: jest.Mock;
  };

  beforeEach(async () => {
    userAdminModel = {
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findOneAndUpdate: jest.fn(),
      findOneAndDelete: jest.fn(),
      countDocuments: jest.fn(),
    };
    withdrawModel = {
      find: jest.fn(),
      findById: jest.fn().mockReturnValue(
        makeQuery({
          status: 'pending',
          method: 'bank_transfer',
          user_id: new Types.ObjectId(),
          slip_file: 'stored-evidence',
        }),
      ),
      findByIdAndUpdate: jest.fn(),
      findOneAndUpdate: jest.fn(),
      updateMany: jest
        .fn()
        .mockReturnValue(
          makeQuery({ acknowledged: true, matchedCount: 0, modifiedCount: 0 }),
        ),
      countDocuments: jest.fn(),
    };
    withdrawFeeCouponModel = {
      updateOne: jest
        .fn()
        .mockReturnValue(
          makeQuery({ acknowledged: true, matchedCount: 1, modifiedCount: 1 }),
        ),
    };
    withdrawFeeCouponRedemptionModel = {
      findOne: jest.fn().mockReturnValue(makeQuery(null)),
      findOneAndDelete: jest.fn().mockReturnValue(makeQuery(null)),
      deleteOne: jest.fn().mockReturnValue(makeQuery({ deletedCount: 1 })),
    };
    adminActivity = {
      append: jest.fn().mockResolvedValue(undefined),
      appendRequired: jest.fn().mockResolvedValue(undefined),
    };
    session = {
      withTransaction: jest.fn(async (work: () => Promise<void>) => work()),
      endSession: jest.fn().mockResolvedValue(undefined),
    };
    connection = {
      startSession: jest.fn().mockResolvedValue(session),
      collection: jest.fn().mockReturnValue({
        findOneAndUpdate: jest.fn().mockResolvedValue({
          _id: 'superadmin-roster',
          sequence: 1,
        }),
      }),
    };
    userModel = {
      findById: jest.fn(),
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
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
      updateMany: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ acknowledged: true }),
      }),
    };
    categoryModel = {
      create: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn().mockReturnValue(
        makeQuery({
          _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
          lifecycle_status: 'active',
          revision: 1,
        }),
      ),
      findByIdAndUpdate: jest.fn(),
      findOneAndUpdate: jest.fn().mockReturnValue(
        makeQuery({
          _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
          lifecycle_status: 'active',
          revision: 2,
        }),
      ),
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
    allBrandBannerModel = {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };
    specificPageBannerModel = {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };
    topBrandConfigModel = {
      updateOne: jest.fn().mockResolvedValue({ acknowledged: true }),
      findOne: jest.fn().mockReturnValue(makeQuery(null)),
    };
    landingRailConfigModel = {
      find: jest.fn().mockReturnValue(makeQuery([])),
      findOne: jest.fn().mockReturnValue(makeQuery(null)),
      updateOne: jest.fn().mockResolvedValue({ acknowledged: true }),
      deleteMany: jest.fn().mockReturnValue(makeQuery({ deletedCount: 0 })),
    };
    deeplinkModel = { aggregate: jest.fn() };
    storedMediaService = {
      upload: jest
        .fn()
        .mockResolvedValue(
          'https://storage.googleapis.com/gogocash-catalog-staging/withdraw-slips/slip.png',
        ),
      replace: jest
        .fn()
        .mockResolvedValue(
          'https://storage.googleapis.com/gogocash-catalog-staging/banner-home/new.png',
        ),
      deleteStored: jest.fn().mockResolvedValue(undefined),
      getReadableStream: jest.fn(),
    };
    involveService = { getConversionAll: jest.fn() };
    userService = { getBalanceMyCashback: jest.fn() };
    jobService = { syncConversionByConversionId: jest.fn() };
    categoryIntegrity = {
      withNormalWrite: jest.fn(({ enforced }) => enforced()),
      assertPolicyCategoryAssignmentReady: jest
        .fn()
        .mockResolvedValue(undefined),
      withPolicyCategoryAssignment: jest.fn(
        (policyCategoryId, rawCategory, writer) =>
          writer(
            {
              ...(String(policyCategoryId ?? '').trim()
                ? { policy_category_id: String(policyCategoryId).trim() }
                : {}),
              categories_normalized:
                String(rawCategory ?? '')
                  .trim()
                  .toLowerCase() || null,
            },
            undefined,
          ),
      ),
      createLegacyCategory: jest.fn(async (name) => ({
        _id: 'cat-1',
        name,
        image: '',
      })),
      updateLegacyCategoryMetadata: jest.fn(async (id, update) => ({
        _id: id,
        ...update,
      })),
      reserveLegacyCategoryRenameInSession: jest.fn(
        async (_id, name, _session) => ({
          name,
          name_normalized: String(name).trim().toLowerCase(),
        }),
      ),
      withIntegrityMutation: jest.fn((writer) =>
        writer({ id: 'integrity-session' }),
      ),
      policyCategoryAssignmentInSession: jest.fn(
        async (policyCategoryId, rawCategory) =>
          categoryIntegrity.withPolicyCategoryAssignment(
            policyCategoryId,
            rawCategory,
            (assignment) => assignment,
          ),
      ),
    };
    policyMediaCleanup = {
      journalLegacyReplacements: jest.fn().mockResolvedValue([]),
      journalUncertainUploads: jest.fn().mockResolvedValue([]),
      processRequest: jest.fn().mockResolvedValue({ deleted: 0, pending: 0 }),
    };
    policyMediaRegistry = {
      touchAttachInSession: jest.fn().mockResolvedValue({ tracked: false }),
    };
    policyMediaWrite = {
      execute: jest.fn(async (input) => {
        const assets: Record<string, any> = {};
        for (const upload of input.uploads) {
          const url = await storedMediaService.upload(
            upload.file,
            upload.folder,
          );
          assets[upload.role] = { url };
        }
        return categoryIntegrity.withIntegrityMutation((session) =>
          input.commit(assets, session),
        );
      }),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getModelToken(UserAdmin.name), useValue: userAdminModel },
        { provide: getModelToken(Withdraw.name), useValue: withdrawModel },
        {
          provide: getModelToken(WithdrawFeeCoupon.name),
          useValue: withdrawFeeCouponModel,
        },
        {
          provide: getModelToken(WithdrawFeeCouponRedemption.name),
          useValue: withdrawFeeCouponRedemptionModel,
        },
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
          provide: getModelToken('AllBrandBanner'),
          useValue: allBrandBannerModel,
        },
        {
          provide: getModelToken(SPECIFIC_PAGE_BANNER_MODEL),
          useValue: specificPageBannerModel,
        },
        {
          provide: getModelToken(TopBrandConfig.name),
          useValue: topBrandConfigModel,
        },
        {
          provide: getModelToken(LandingRailConfig.name),
          useValue: landingRailConfigModel,
        },
        { provide: getModelToken(Deeplink.name), useValue: deeplinkModel },
        { provide: StoredMediaService, useValue: storedMediaService },
        { provide: InvolveService, useValue: involveService },
        { provide: UserService, useValue: userService },
        { provide: JobService, useValue: jobService },
        { provide: CategoryIntegrityService, useValue: categoryIntegrity },
        { provide: PolicyMediaCleanupService, useValue: policyMediaCleanup },
        { provide: PolicyMediaWriteService, useValue: policyMediaWrite },
        {
          provide: PolicyMediaAssetRegistryService,
          useValue: policyMediaRegistry,
        },
        { provide: AdminActivityService, useValue: adminActivity },
        { provide: getConnectionToken(), useValue: connection },
      ],
    }).compile();

    service = moduleRef.get<AdminService>(AdminService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('admin scaffold mutations > given request data > then they do not print payloads or ids to stdout', async () => {
    const logSpy = jest
      .spyOn(console, 'log')
      .mockImplementation(() => undefined);

    try {
      service.create({
        email: 'admin@example.com',
        password: 'secret',
      } as never);
      userAdminModel.findOneAndDelete.mockReturnValue(
        makeQuery({
          _id: new Types.ObjectId(),
          email: 'old-admin@gogocash.co',
          role: 'viewer',
        }),
      );
      userAdminModel.findById.mockReturnValue(
        makeQuery({
          _id: new Types.ObjectId(),
          email: 'old-admin@gogocash.co',
          role: 'viewer',
        }),
      );
      await service.remove(new Types.ObjectId().toHexString(), {
        id: 'root-1',
        label: 'Root Admin',
      });

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
      const findQuery = makeQuery([]);
      userAdminModel.find.mockReturnValue(findQuery);
      userAdminModel.countDocuments.mockReturnValue(makeQuery(0));

      await service.findAll();

      expect(userAdminModel.find).toHaveBeenCalledWith({});
      expect(findQuery.select).toHaveBeenCalledWith('-password');
    });
  });

  describe('getWithdrawAll', () => {
    // The admin withdraw table's Status/Method dropdowns must actually filter
    // the result set. Before #25 these params were dropped and every status
    // returned the full list, so the filter looked broken.
    it('getWithdrawAll > given status and method > then it filters the query by both (exact match)', async () => {
      const findQuery = makeQuery([]);
      withdrawModel.find.mockReturnValue(findQuery);
      withdrawModel.countDocuments.mockReturnValue(makeQuery(0));

      await service.getWithdrawAll(
        1,
        10,
        undefined,
        'approved',
        'bank_transfer',
      );

      expect(withdrawModel.find).toHaveBeenCalledWith({
        status: 'approved',
        method: 'bank_transfer',
      });
    });

    // A status filter and a free-text search should intersect (AND), not
    // replace each other — status pins the bucket, search narrows within it.
    it('getWithdrawAll > given a status filter plus a search term > then both narrow the query', async () => {
      const findQuery = makeQuery([]);
      withdrawModel.find.mockReturnValue(findQuery);
      withdrawModel.countDocuments.mockReturnValue(makeQuery(0));

      await service.getWithdrawAll(1, 10, 'abc', 'pending');

      expect(withdrawModel.find).toHaveBeenCalledWith({
        status: 'pending',
        $or: [
          { method: { $regex: 'abc', $options: 'i' } },
          { status: { $regex: 'abc', $options: 'i' } },
          { address: { $regex: 'abc', $options: 'i' } },
        ],
      });
    });

    it('getWithdrawAll > given no filters > then it queries with an empty filter', async () => {
      const findQuery = makeQuery([]);
      withdrawModel.find.mockReturnValue(findQuery);
      withdrawModel.countDocuments.mockReturnValue(makeQuery(0));

      await service.getWithdrawAll();

      expect(withdrawModel.find).toHaveBeenCalledWith({});
    });
  });

  describe('updateRequestWithdraw', () => {
    const bankWithdraw = (overrides: Record<string, unknown> = {}) => ({
      _id: new Types.ObjectId(),
      user_id: new Types.ObjectId(),
      method: 'bank_transfer',
      status: 'pending',
      ...overrides,
    });

    // The withdraw id arrives as a string from the request; it must be cast to an
    // ObjectId or the update silently matches nothing.
    it('given stored payout evidence > approves the bank withdrawal and its companions atomically', async () => {
      const id = new Types.ObjectId().toString();
      const ownerId = new Types.ObjectId();
      withdrawModel.findById.mockReturnValue(
        makeQuery(
          bankWithdraw({
            _id: id,
            user_id: ownerId,
            slip_file: 'stored-evidence',
          }),
        ),
      );
      userModel.findOneAndUpdate.mockReturnValue(
        makeQuery({ _id: ownerId, wallet_frozen: false }),
      );
      withdrawModel.findOneAndUpdate.mockReturnValue(
        makeQuery(
          bankWithdraw({ _id: id, user_id: ownerId, status: 'approved' }),
        ),
      );
      withdrawModel.updateMany.mockReturnValue(
        makeQuery({ acknowledged: true, matchedCount: 1, modifiedCount: 1 }),
      );

      await service.updateRequestWithdraw(
        { id, status: 'approved' },
        undefined as never,
        { id: 'admin-1', label: 'Approver' },
      );

      const [arg0, arg1] = withdrawModel.findOneAndUpdate.mock.calls[0];
      expect(arg0._id).toBeInstanceOf(Types.ObjectId);
      expect(arg0._id.toString()).toBe(id);
      expect(arg0.status).toBe('pending');
      expect(arg1).toEqual({
        $set: {
          status: 'approved',
          approved_by: 'admin-1',
          approved_at: expect.any(Date),
        },
      });
      expect(withdrawModel.updateMany).toHaveBeenCalledWith(
        {
          parent_withdraw_id: expect.any(Types.ObjectId),
          method: 'bank_transfer',
          status: 'pending',
        },
        { $set: { status: 'approved' } },
        { session },
      );
      expect(storedMediaService.upload).not.toHaveBeenCalled();
    });

    it('given fresh payout evidence > uploads it and approves the pending bank withdrawal', async () => {
      const id = new Types.ObjectId().toString();
      const ownerId = new Types.ObjectId();
      const slipUrl =
        'https://storage.googleapis.com/gogocash-catalog-staging/withdraw-slips/slip.png';
      storedMediaService.upload.mockResolvedValue(slipUrl);
      withdrawModel.findById.mockReturnValue(
        makeQuery(bankWithdraw({ _id: id, user_id: ownerId })),
      );
      userModel.findOneAndUpdate.mockReturnValue(
        makeQuery({ _id: ownerId, wallet_frozen: false }),
      );
      withdrawModel.findOneAndUpdate.mockReturnValue(
        makeQuery(
          bankWithdraw({
            _id: id,
            user_id: ownerId,
            status: 'approved',
            slip_file: slipUrl,
          }),
        ),
      );
      const file = { originalname: 'slip.png' } as Express.Multer.File;

      await service.updateRequestWithdraw({ id, status: 'approved' }, file, {
        id: 'admin-1',
        label: 'Approver',
      });

      expect(storedMediaService.upload).toHaveBeenCalledWith(
        file,
        'withdraw-slips',
      );
      expect(withdrawModel.findOneAndUpdate.mock.calls[0][1]).toEqual({
        $set: {
          status: 'approved',
          slip_file: slipUrl,
          approved_by: 'admin-1',
          approved_at: expect.any(Date),
        },
      });
      expect(adminActivity.appendRequired).toHaveBeenCalledWith(
        expect.objectContaining({
          actor_id: 'admin-1',
          action: 'withdraw.slip_updated',
        }),
        session,
      );
    });

    it('given approval without payout evidence > rejects the transition', async () => {
      const id = new Types.ObjectId().toString();
      withdrawModel.findById.mockReturnValue(
        makeQuery(bankWithdraw({ _id: id })),
      );

      await expect(
        service.updateRequestWithdraw(
          { id, status: 'approved' },
          undefined as never,
          { id: 'admin-1', label: 'Approver' },
        ),
      ).rejects.toMatchObject({ status: 409 });

      expect(userModel.findOneAndUpdate).not.toHaveBeenCalled();
      expect(withdrawModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('given a non-bank withdrawal > rejects use of the generic admin updater', async () => {
      const id = new Types.ObjectId().toString();
      withdrawModel.findById.mockReturnValue(
        makeQuery({
          _id: id,
          user_id: new Types.ObjectId(),
          method: 'metamask',
          status: 'pending',
        }),
      );

      await expect(
        service.updateRequestWithdraw(
          { id, status: 'rejected' },
          undefined as never,
          { id: 'admin-1', label: 'Approver' },
        ),
      ).rejects.toMatchObject({ status: 409 });

      expect(withdrawModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('given a frozen wallet > refuses approval before changing withdrawal state', async () => {
      const id = new Types.ObjectId().toString();
      const ownerId = new Types.ObjectId();
      withdrawModel.findById.mockReturnValue(
        makeQuery(
          bankWithdraw({
            _id: id,
            user_id: ownerId,
            slip_file: 'stored-evidence',
          }),
        ),
      );
      userModel.findOneAndUpdate.mockReturnValue(makeQuery(null));
      userModel.findById.mockReturnValue(
        makeQuery({ _id: ownerId, wallet_frozen: true }),
      );

      await expect(
        service.updateRequestWithdraw(
          { id, status: 'approved' },
          undefined as never,
          { id: 'admin-1', label: 'Approver' },
        ),
      ).rejects.toMatchObject({ status: 403 });

      expect(withdrawModel.findOneAndUpdate).not.toHaveBeenCalled();
      expect(adminActivity.appendRequired).not.toHaveBeenCalled();
    });

    it('given immutable evidence already exists > rejects replacement and deletes only the unreferenced fresh upload', async () => {
      const id = new Types.ObjectId().toString();
      const freshSlip = 'https://media.example/new-slip.png';
      const originalSlip = 'https://media.example/original-slip.png';
      const existing = bankWithdraw({
        _id: id,
        slip_file: originalSlip,
      });
      storedMediaService.upload.mockResolvedValue(freshSlip);
      withdrawModel.findById
        .mockReturnValueOnce(makeQuery(existing))
        .mockReturnValueOnce(makeQuery(existing));

      await expect(
        service.updateRequestWithdraw(
          { id, status: 'pending' },
          { originalname: 'replacement.png' } as Express.Multer.File,
          { id: 'admin-1', label: 'Approver' },
        ),
      ).rejects.toMatchObject({ status: 409 });

      expect(storedMediaService.deleteStored).toHaveBeenCalledWith(freshSlip);
      expect(storedMediaService.deleteStored).not.toHaveBeenCalledWith(
        originalSlip,
      );
    });

    it('given an uncommitted transaction error > deletes the provably unreferenced fresh upload', async () => {
      const id = new Types.ObjectId().toString();
      const freshSlip = 'https://media.example/uncommitted-slip.png';
      const existing = bankWithdraw({ _id: id });
      const failedUpdate = makeQuery(null);
      failedUpdate.exec.mockRejectedValueOnce(new Error('transaction failed'));
      storedMediaService.upload.mockResolvedValue(freshSlip);
      withdrawModel.findById
        .mockReturnValueOnce(makeQuery(existing))
        .mockReturnValueOnce(makeQuery(existing));
      withdrawModel.findOneAndUpdate.mockReturnValue(failedUpdate);

      await expect(
        service.updateRequestWithdraw(
          { id, status: 'pending' },
          { originalname: 'slip.png' } as Express.Multer.File,
          { id: 'admin-1', label: 'Approver' },
        ),
      ).rejects.toThrow('transaction failed');

      expect(storedMediaService.deleteStored).toHaveBeenCalledWith(freshSlip);
    });

    it('given Mongo commits before reporting an unknown result > reconciles to the authoritative record and preserves referenced evidence', async () => {
      const id = new Types.ObjectId().toString();
      const freshSlip = 'https://media.example/committed-slip.png';
      const existing = bankWithdraw({ _id: id });
      const committed = bankWithdraw({
        ...existing,
        status: 'pending',
        slip_file: freshSlip,
      });
      storedMediaService.upload.mockResolvedValue(freshSlip);
      withdrawModel.findById
        .mockReturnValueOnce(makeQuery(existing))
        .mockReturnValueOnce(makeQuery(committed));
      withdrawModel.findOneAndUpdate.mockReturnValue(makeQuery(committed));
      session.withTransaction.mockImplementationOnce(
        async (work: () => Promise<void>) => {
          await work();
          throw Object.assign(new Error('commit result is unknown'), {
            errorLabels: ['UnknownTransactionCommitResult'],
          });
        },
      );

      await expect(
        service.updateRequestWithdraw(
          { id, status: 'pending' },
          { originalname: 'slip.png' } as Express.Multer.File,
          { id: 'admin-1', label: 'Approver' },
        ),
      ).resolves.toEqual(committed);

      expect(storedMediaService.deleteStored).not.toHaveBeenCalledWith(
        freshSlip,
      );
    });

    it('given the authoritative post-error read fails > preserves evidence and reports an ambiguous outcome', async () => {
      const id = new Types.ObjectId().toString();
      const freshSlip = 'https://media.example/uncertain-slip.png';
      const failedRead = makeQuery(null);
      failedRead.exec.mockRejectedValueOnce(new Error('primary unavailable'));
      storedMediaService.upload.mockResolvedValue(freshSlip);
      withdrawModel.findById.mockReturnValue(failedRead);
      session.withTransaction.mockRejectedValueOnce(
        Object.assign(new Error('commit result is unknown'), {
          errorLabels: ['UnknownTransactionCommitResult'],
        }),
      );

      await expect(
        service.updateRequestWithdraw(
          { id, status: 'pending' },
          { originalname: 'slip.png' } as Express.Multer.File,
          { id: 'admin-1', label: 'Approver' },
        ),
      ).rejects.toMatchObject({
        status: 503,
        response: expect.objectContaining({
          code: 'WITHDRAW_EVIDENCE_COMMIT_OUTCOME_UNKNOWN',
        }),
      });

      expect(storedMediaService.deleteStored).not.toHaveBeenCalled();
    });

    it('given pending coupon withdraw rejected > restores inventory and releases companion reservations once', async () => {
      const id = new Types.ObjectId().toString();
      const couponId = new Types.ObjectId();
      const redemptionId = new Types.ObjectId();
      withdrawModel.findById.mockReturnValue(
        makeQuery(bankWithdraw({ _id: id, coupon_id: couponId })),
      );
      withdrawModel.findOneAndUpdate.mockReturnValue(
        makeQuery(bankWithdraw({ _id: id, status: 'rejected' })),
      );
      withdrawModel.updateMany.mockReturnValue(
        makeQuery({ acknowledged: true, matchedCount: 1, modifiedCount: 1 }),
      );
      withdrawFeeCouponRedemptionModel.findOneAndDelete.mockReturnValue(
        makeQuery({
          _id: redemptionId,
          coupon_id: couponId,
          withdraw_id: id,
          code_snapshot: 'TESTFEE',
        }),
      );

      await service.updateRequestWithdraw(
        { id, status: 'rejected' },
        undefined as never,
        { id: 'admin-1', label: 'Approver' },
      );

      expect(adminActivity.appendRequired).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'withdraw.fee_coupon.restored',
        }),
        session,
      );
      expect(adminActivity.appendRequired).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'withdraw.status_changed',
        }),
        session,
      );
      expect(
        withdrawFeeCouponRedemptionModel.findOneAndDelete,
      ).toHaveBeenCalled();
      expect(withdrawFeeCouponModel.updateOne).toHaveBeenCalledWith(
        { _id: couponId, quantity_used: { $gt: 0 } },
        { $inc: { quantity_used: -1 } },
        { session },
      );
      expect(withdrawModel.updateMany).toHaveBeenCalledWith(
        {
          parent_withdraw_id: expect.any(Types.ObjectId),
          method: 'bank_transfer',
          status: 'pending',
        },
        { $set: { status: 'rejected' } },
        { session },
      );
    });

    it('updateRequestWithdraw > given reject without coupon > then does not touch redemptions', async () => {
      const id = new Types.ObjectId().toString();
      withdrawModel.findById.mockReturnValue(makeQuery(bankWithdraw()));
      withdrawModel.findOneAndUpdate.mockReturnValue(
        makeQuery({ _id: id, status: 'rejected' }),
      );

      await service.updateRequestWithdraw(
        { id, status: 'rejected' },
        undefined as never,
        { id: 'admin-1', label: 'Approver' },
      );

      expect(
        withdrawFeeCouponRedemptionModel.findOneAndDelete,
      ).not.toHaveBeenCalled();
      expect(withdrawFeeCouponModel.updateOne).not.toHaveBeenCalled();
      expect(adminActivity.appendRequired).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'withdraw.status_changed' }),
        session,
      );
    });

    it('updateRequestWithdraw > given already-rejected coupon withdraw > then does not double-restore', async () => {
      const id = new Types.ObjectId().toString();
      const couponId = new Types.ObjectId();
      withdrawModel.findById.mockReturnValue(
        makeQuery(bankWithdraw({ status: 'rejected', coupon_id: couponId })),
      );
      await service.updateRequestWithdraw(
        { id, status: 'rejected' },
        undefined as never,
        { id: 'admin-1', label: 'Approver' },
      );

      expect(
        withdrawFeeCouponRedemptionModel.findOneAndDelete,
      ).not.toHaveBeenCalled();
      expect(withdrawFeeCouponModel.updateOne).not.toHaveBeenCalled();
    });
  });

  describe('withdraw status transaction invariants', () => {
    const actor = { id: 'admin-7', label: 'Approver' };

    it('given rejected coupon withdrawal > then it cannot be reopened to pending', async () => {
      const id = new Types.ObjectId().toString();
      withdrawModel.findById.mockReturnValue(
        makeQuery({
          _id: id,
          status: 'rejected',
          method: 'bank_transfer',
          user_id: new Types.ObjectId(),
          coupon_id: new Types.ObjectId(),
        }),
      );

      await expect(
        service.updateRequestWithdraw(
          { id, status: 'pending' },
          undefined as never,
          actor,
        ),
      ).rejects.toMatchObject({ status: 409 });

      expect(withdrawModel.findOneAndUpdate).not.toHaveBeenCalled();
      expect(adminActivity.appendRequired).not.toHaveBeenCalled();
    });

    it('given a stale concurrent status write > then CAS fails without an audit event', async () => {
      const id = new Types.ObjectId().toString();
      const ownerId = new Types.ObjectId();
      withdrawModel.findById.mockReturnValue(
        makeQuery({
          _id: id,
          status: 'pending',
          method: 'bank_transfer',
          user_id: ownerId,
          slip_file: 'stored-evidence',
        }),
      );
      userModel.findOneAndUpdate.mockReturnValue(
        makeQuery({ _id: ownerId, wallet_frozen: false }),
      );
      withdrawModel.findOneAndUpdate.mockReturnValue(makeQuery(null));

      await expect(
        service.updateRequestWithdraw(
          { id, status: 'approved' },
          undefined as never,
          actor,
        ),
      ).rejects.toMatchObject({ status: 409 });

      expect(adminActivity.appendRequired).not.toHaveBeenCalled();
    });

    it('given coupon restore update fails > then no success activity is appended before transaction commit', async () => {
      const id = new Types.ObjectId().toString();
      const couponId = new Types.ObjectId();
      withdrawModel.findById.mockReturnValue(
        makeQuery({
          _id: id,
          status: 'pending',
          method: 'bank_transfer',
          user_id: new Types.ObjectId(),
          coupon_id: couponId,
        }),
      );
      withdrawModel.findOneAndUpdate.mockReturnValue(
        makeQuery({ _id: id, status: 'rejected', coupon_id: couponId }),
      );
      withdrawFeeCouponRedemptionModel.findOneAndDelete.mockReturnValue(
        makeQuery({
          _id: new Types.ObjectId(),
          coupon_id: couponId,
          code_snapshot: 'SAVEFEE',
        }),
      );
      withdrawFeeCouponModel.updateOne.mockReturnValue(
        makeQuery({ matchedCount: 0, modifiedCount: 0 }),
      );

      await expect(
        service.updateRequestWithdraw(
          { id, status: 'rejected' },
          undefined as never,
          actor,
        ),
      ).rejects.toMatchObject({ status: 409 });

      expect(adminActivity.appendRequired).not.toHaveBeenCalled();
    });

    it('given redemption was already consumed > then inventory is not decremented again', async () => {
      const id = new Types.ObjectId().toString();
      const couponId = new Types.ObjectId();
      withdrawModel.findById.mockReturnValue(
        makeQuery({
          _id: id,
          status: 'pending',
          method: 'bank_transfer',
          user_id: new Types.ObjectId(),
          coupon_id: couponId,
        }),
      );
      withdrawModel.findOneAndUpdate.mockReturnValue(
        makeQuery({ _id: id, status: 'rejected', coupon_id: couponId }),
      );
      withdrawFeeCouponRedemptionModel.findOneAndDelete.mockReturnValue(
        makeQuery(null),
      );

      await service.updateRequestWithdraw(
        { id, status: 'rejected' },
        undefined as never,
        actor,
      );

      expect(withdrawFeeCouponModel.updateOne).not.toHaveBeenCalled();
      expect(adminActivity.appendRequired).toHaveBeenCalledWith(
        expect.objectContaining({
          actor_id: 'admin-7',
          actor_label: 'Approver',
          action: 'withdraw.status_changed',
        }),
        session,
      );
    });

    it('given a transaction retry loses to another reject > then aborted-attempt audit state is discarded', async () => {
      const id = new Types.ObjectId().toString();
      const couponId = new Types.ObjectId();
      withdrawModel.findById
        .mockReturnValueOnce(
          makeQuery({
            _id: id,
            status: 'pending',
            method: 'bank_transfer',
            user_id: new Types.ObjectId(),
            coupon_id: couponId,
          }),
        )
        .mockReturnValueOnce(
          makeQuery({
            _id: id,
            status: 'rejected',
            method: 'bank_transfer',
            user_id: new Types.ObjectId(),
            coupon_id: couponId,
          }),
        );
      withdrawModel.findOneAndUpdate.mockReturnValue(
        makeQuery({ _id: id, status: 'rejected', coupon_id: couponId }),
      );
      withdrawFeeCouponRedemptionModel.findOneAndDelete.mockReturnValue(
        makeQuery({
          _id: new Types.ObjectId(),
          coupon_id: couponId,
          code_snapshot: 'SAVEFEE',
        }),
      );
      session.withTransaction.mockImplementationOnce(
        async (work: () => Promise<void>) => {
          await work();
          // Simulate Mongo retrying after this attempt aborts while a competing
          // transaction commits the same terminal transition.
          await work();
        },
      );

      await service.updateRequestWithdraw(
        { id, status: 'rejected' },
        undefined as never,
        actor,
      );

      expect(withdrawFeeCouponModel.updateOne).toHaveBeenCalledTimes(1);
      // The first simulated attempt invokes both transactional events; a real
      // Mongo retry rolls them back together with the aborted attempt.
      expect(adminActivity.appendRequired).toHaveBeenCalledTimes(2);
    });
  });

  describe('live admin role mutation', () => {
    it('refuses to demote the final superadmin', async () => {
      const targetId = new Types.ObjectId().toString();
      userAdminModel.findById.mockReturnValue(
        makeQuery({ _id: targetId, role: 'superadmin' }),
      );
      userAdminModel.countDocuments.mockReturnValue(makeQuery(1));

      await expect(
        service.update(
          targetId,
          { role: 'support' },
          { id: targetId, label: 'Root Admin' },
        ),
      ).rejects.toMatchObject({ status: 409 });

      expect(userAdminModel.findOneAndUpdate).not.toHaveBeenCalled();
      expect(adminActivity.appendRequired).not.toHaveBeenCalled();
    });

    it('refuses to delete the final superadmin', async () => {
      const targetId = new Types.ObjectId().toString();
      userAdminModel.findById.mockReturnValue(
        makeQuery({ _id: targetId, role: 'super_admin' }),
      );
      userAdminModel.countDocuments.mockReturnValue(makeQuery(1));

      await expect(
        service.remove(targetId, { id: targetId, label: 'Root Admin' }),
      ).rejects.toMatchObject({ status: 409 });

      expect(userAdminModel.findOneAndDelete).not.toHaveBeenCalled();
      expect(adminActivity.appendRequired).not.toHaveBeenCalled();
    });

    it('updates only an allowlisted role and records the authenticated actor after success', async () => {
      const targetId = new Types.ObjectId().toString();
      userAdminModel.findById.mockReturnValue(
        makeQuery({
          _id: targetId,
          role: 'viewer',
          email: 'target@gogocash.co',
        }),
      );
      userAdminModel.findOneAndUpdate.mockReturnValue(
        makeQuery({
          _id: targetId,
          role: 'support',
          email: 'target@gogocash.co',
        }),
      );

      await service.update(
        targetId,
        { role: 'support' },
        { id: 'root-1', label: 'Root Admin' },
      );

      expect(userAdminModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'viewer' }),
        { $set: { role: 'support' } },
        { new: true, session },
      );
      expect(adminActivity.appendRequired).toHaveBeenCalledWith(
        expect.objectContaining({
          actor_id: 'root-1',
          actor_label: 'Root Admin',
          action: 'admin_role.changed',
        }),
        session,
      );
    });

    it('does not append activity when the target admin no longer matches', async () => {
      const targetId = new Types.ObjectId().toString();
      userAdminModel.findById.mockReturnValue(
        makeQuery({ _id: targetId, role: 'viewer' }),
      );
      userAdminModel.findOneAndUpdate.mockReturnValue(makeQuery(null));

      await expect(
        service.update(
          targetId,
          { role: 'support' },
          { id: 'root-1', label: 'Root Admin' },
        ),
      ).rejects.toMatchObject({ status: 409 });

      expect(adminActivity.appendRequired).not.toHaveBeenCalled();
    });

    it('aborts a role mutation when its transactional audit cannot be persisted', async () => {
      const targetId = new Types.ObjectId().toString();
      userAdminModel.findById.mockReturnValue(
        makeQuery({ _id: targetId, role: 'viewer' }),
      );
      userAdminModel.findOneAndUpdate.mockReturnValue(
        makeQuery({ _id: targetId, role: 'support' }),
      );
      adminActivity.appendRequired.mockRejectedValue(
        new Error('audit unavailable'),
      );

      await expect(
        service.update(
          targetId,
          { role: 'support' },
          { id: 'root-1', label: 'Root Admin' },
        ),
      ).rejects.toThrow('audit unavailable');

      expect(adminActivity.append).not.toHaveBeenCalled();
      expect(session.withTransaction).toHaveBeenCalled();
    });

    it('deletes an existing admin and attributes the audit event to the caller', async () => {
      const targetId = new Types.ObjectId().toString();
      userAdminModel.findById.mockReturnValue(
        makeQuery({
          _id: targetId,
          role: 'viewer',
          email: 'target@gogocash.co',
        }),
      );
      userAdminModel.findOneAndDelete.mockReturnValue(
        makeQuery({
          _id: targetId,
          role: 'viewer',
          email: 'target@gogocash.co',
        }),
      );

      const result = await service.remove(targetId, {
        id: 'root-1',
        label: 'Root Admin',
      });

      expect(result).toEqual({ acknowledged: true, deletedCount: 1 });
      expect(adminActivity.appendRequired).toHaveBeenCalledWith(
        expect.objectContaining({
          actor_id: 'root-1',
          actor_label: 'Root Admin',
          action: 'admin_user.deleted',
          entity_id: targetId,
        }),
        session,
      );
    });

    it('does not append delete activity for a nonexistent admin', async () => {
      userAdminModel.findById.mockReturnValue(makeQuery(null));

      await expect(
        service.remove(new Types.ObjectId().toString(), {
          id: 'root-1',
          label: 'Root Admin',
        }),
      ).rejects.toMatchObject({ status: 404 });

      expect(adminActivity.appendRequired).not.toHaveBeenCalled();
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

    // Pins the default path the controller relies on: with no pagination args
    // the pipeline must carry finite $skip/$limit (page 1, limit 10). Mongo
    // rejects { $skip: NaN } with a 500 — the controller must never let a
    // non-numeric page/limit defeat these defaults.
    it('getConversionAll > given no pagination args > then $skip/$limit are finite defaults', async () => {
      feeRateModel.findOne.mockReturnValue(
        makeQuery({ system: 10, max_cap: 100 }),
      );
      conversionModel.aggregate.mockReturnValue(makeQuery([]));
      conversionModel.countDocuments.mockReturnValue(makeQuery(0));

      await service.getConversionAll();

      const pipeline = conversionModel.aggregate.mock.calls[0][0];
      const skip = pipeline.find((s: any) => s.$skip !== undefined).$skip;
      const limit = pipeline.find((s: any) => s.$limit !== undefined).$limit;
      expect(skip).toBe(0);
      expect(limit).toBe(10);
      expect(Number.isFinite(skip)).toBe(true);
      expect(Number.isFinite(limit)).toBe(true);
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

    // offer_id is unique only WITHIN a source (Involve vs Optimise/Accesstrade
    // can share a numeric offer_id). A naive localField/foreignField join would
    // $unwind-duplicate the conversion by matching a same-id offer from another
    // network — double-counting the payout/max_cap. The join must be scoped to
    // the conversion's own source. For Involve-only data $$src === 'involve',
    // i.e. byte-identical to the previous behaviour.
    it('getConversionAll > offers $lookup is source-constrained (no cross-network double-join)', async () => {
      feeRateModel.findOne.mockReturnValue(
        makeQuery({ system: 10, max_cap: 100 }),
      );
      conversionModel.aggregate.mockReturnValue(makeQuery([]));
      conversionModel.countDocuments.mockReturnValue(makeQuery(0));

      await service.getConversionAll(1, 10);

      const pipeline = conversionModel.aggregate.mock.calls[0][0];
      const offerLookup = pipeline.find(
        (s: any) => s.$lookup && s.$lookup.from === 'offers',
      ).$lookup;
      expect(offerLookup.localField).toBeUndefined();
      expect(offerLookup.foreignField).toBeUndefined();
      expect(offerLookup.let).toEqual({
        oid: '$offer_id',
        src: { $ifNull: ['$source', 'involve'] },
      });
      const innerMatch = offerLookup.pipeline.find((s: any) => s.$match).$match;
      expect(innerMatch.$expr.$and).toEqual(
        expect.arrayContaining([
          { $eq: [{ $ifNull: ['$source', 'involve'] }, '$$src'] },
          { $eq: ['$offer_id', '$$oid'] },
        ]),
      );
      expect(offerLookup.pipeline.some((s: any) => s.$limit === 1)).toBe(true);
      // The single-offer join keeps $unwind (preserveNullAndEmptyArrays) and
      // the max_cap $ifNull fallback unchanged.
      const unwind = pipeline.find(
        (s: any) => s.$unwind && s.$unwind.path === '$offer',
      ).$unwind;
      expect(unwind.preserveNullAndEmptyArrays).toBe(true);
      const capFields = pipeline.find(
        (s: any) => s.$addFields && s.$addFields.max_cap,
      ).$addFields;
      expect(capFields.max_cap).toEqual({ $ifNull: ['$offer.max_cap', 100] });
    });
  });

  describe('getDeepLinkList', () => {
    // Same collision hazard as getConversionAll: a deeplink joins its offer by
    // offer_id, which is unique only within a source. Key the join off the
    // deeplink's own source (defaulted to 'involve') so a same-id offer from a
    // different network can't be $unwind-joined. Involve-only data is unchanged.
    it('getDeepLinkList > offers $lookup is source-constrained keyed off the deeplink source', async () => {
      deeplinkModel.aggregate.mockReturnValue(makeQuery([]));

      await service.getDeepLinkList();

      const pipeline = deeplinkModel.aggregate.mock.calls[0][0];
      const offerLookup = pipeline.find(
        (s: any) => s.$lookup && s.$lookup.from === 'offers',
      ).$lookup;
      expect(offerLookup.localField).toBeUndefined();
      expect(offerLookup.foreignField).toBeUndefined();
      expect(offerLookup.let).toEqual({
        oid: '$offer_id',
        src: { $ifNull: ['$source', 'involve'] },
      });
      const innerMatch = offerLookup.pipeline.find((s: any) => s.$match).$match;
      expect(innerMatch.$expr.$and).toEqual(
        expect.arrayContaining([
          { $eq: [{ $ifNull: ['$source', 'involve'] }, '$$src'] },
          { $eq: ['$offer_id', '$$oid'] },
        ]),
      );
      expect(offerLookup.pipeline.some((s: any) => s.$limit === 1)).toBe(true);
      // The users join is a different collection (no source dimension) and
      // stays a plain localField/foreignField lookup.
      const userLookup = pipeline.find(
        (s: any) => s.$lookup && s.$lookup.from === 'users',
      ).$lookup;
      expect(userLookup.localField).toBe('user_id');
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

    it('updateOffer > before activation > preserves the standalone legacy update before readiness or durable media gates', async () => {
      categoryIntegrity.withNormalWrite.mockImplementation(({ legacy }) =>
        legacy(),
      );
      offerModel.findById.mockReturnValue(
        makeQuery({
          _id: offerId,
          logo_desktop: 'old-logo',
          logo_mobile: 'old-logo',
          categories: 'Shopping',
        }),
      );
      storedMediaService.replace.mockResolvedValue('legacy-new-logo');
      offerModel.findByIdAndUpdate.mockReturnValue(
        makeQuery({ _id: offerId, logo_desktop: 'legacy-new-logo' }),
      );

      await service.updateOffer(offerId, {
        logo_desktop: { originalname: 'logo.png' } as Express.Multer.File,
        policy_category_id: '507f1f77bcf86cd799439011',
        product_type: [],
      });

      expect(storedMediaService.replace).toHaveBeenCalledWith(
        expect.objectContaining({ originalname: 'logo.png' }),
        MEDIA_FOLDER.BRANDS,
        'old-logo',
      );
      expect(
        categoryIntegrity.assertPolicyCategoryAssignmentReady,
      ).not.toHaveBeenCalled();
      expect(categoryIntegrity.withIntegrityMutation).not.toHaveBeenCalled();
      expect(policyMediaWrite.execute).not.toHaveBeenCalled();
      expect(offerModel.findByIdAndUpdate.mock.calls[0][2]).toEqual({
        new: true,
      });
    });

    /**
     * #493 — the wide hero banner and the square logo both uploaded into `brands`,
     * whose 1024px cap is sized for logos. A 2400-3840px banner was downsampled on
     * upload and the original was never retained, so the loss is permanent. The banner
     * role now routes to its own 1920px folder; the logo must NOT follow it.
     */
    it('updateOffer > given a banner upload > then it stores under brand-banners while the logo stays under brands', async () => {
      categoryIntegrity.withNormalWrite.mockImplementation(({ legacy }) =>
        legacy(),
      );
      offerModel.findById.mockReturnValue(
        makeQuery({
          _id: offerId,
          logo_desktop: 'old-logo',
          banner: 'old-banner',
          categories: 'Shopping',
        }),
      );
      storedMediaService.replace.mockResolvedValue('new-asset');
      offerModel.findByIdAndUpdate.mockReturnValue(
        makeQuery({ _id: offerId, banner: 'new-asset' }),
      );

      await service.updateOffer(offerId, {
        logo_desktop: { originalname: 'logo.png' } as Express.Multer.File,
        banner: { originalname: 'hero.png' } as Express.Multer.File,
        policy_category_id: '507f1f77bcf86cd799439011',
        product_type: [],
      });

      expect(storedMediaService.replace).toHaveBeenCalledWith(
        expect.objectContaining({ originalname: 'hero.png' }),
        MEDIA_FOLDER.BRAND_BANNERS,
        'old-banner',
      );
      expect(storedMediaService.replace).toHaveBeenCalledWith(
        expect.objectContaining({ originalname: 'logo.png' }),
        MEDIA_FOLDER.BRANDS,
        'old-logo',
      );
    });

    it('updateOffer > given an unknown offer id > then it throws "Offer not found"', async () => {
      offerModel.findById.mockReturnValue(makeQuery(null));

      await expect(
        service.updateOffer(new Types.ObjectId().toHexString(), {
          product_type: [],
        }),
      ).rejects.toThrow('Offer not found');
    });

    it('updateOffer > ready v2 without media or category changes > fences the offer patch in an integrity transaction', async () => {
      const session = { id: 'integrity-session' };
      categoryIntegrity.withIntegrityMutation.mockImplementation((writer) =>
        writer(session),
      );
      offerModel.findById.mockReturnValue(makeQuery({ _id: offerId }));
      offerModel.findByIdAndUpdate.mockReturnValue(makeQuery({ _id: offerId }));

      await service.updateOffer(offerId, { product_type: [] });

      expect(categoryIntegrity.withIntegrityMutation).toHaveBeenCalledTimes(1);
      expect(offerModel.findByIdAndUpdate).toHaveBeenCalledWith(
        new Types.ObjectId(offerId),
        expect.any(Object),
        { new: true, session },
      );
    });

    it('updateOffer > given a new desktop logo > then it journals old references transactionally and persists the new URL', async () => {
      offerModel.findById.mockReturnValue(
        makeQuery({
          _id: offerId,
          logo_desktop: 'old-logo',
          logo_mobile: 'keep-mobile',
        }),
      );
      storedMediaService.upload.mockResolvedValue(
        'https://storage.googleapis.com/gogocash-catalog-staging/brands/new-logo.png',
      );
      offerModel.findByIdAndUpdate.mockReturnValue(makeQuery({ _id: offerId }));

      await service.updateOffer(offerId, {
        logo_desktop: { originalname: 'logo.png' } as Express.Multer.File,
        product_type: [],
      });

      expect(storedMediaService.upload).toHaveBeenCalledWith(
        expect.objectContaining({ originalname: 'logo.png' }),
        'brands',
      );
      expect(storedMediaService.replace).not.toHaveBeenCalled();
      expect(policyMediaCleanup.journalLegacyReplacements).toHaveBeenCalledWith(
        expect.objectContaining({
          owner_type: 'offer',
          owner_id: new Types.ObjectId(offerId),
          reason: 'offer-replaced',
          references: expect.arrayContaining(['old-logo', 'keep-mobile']),
        }),
        expect.objectContaining({ id: 'integrity-session' }),
      );
      expect(policyMediaCleanup.processRequest).toHaveBeenCalledWith(
        expect.stringMatching(/^offer-media:/),
      );
      expect(storedMediaService.deleteStored).not.toHaveBeenCalledWith(
        'old-logo',
      );
      const persisted = offerModel.findByIdAndUpdate.mock.calls[0][1].$set;
      expect(persisted.logo_desktop).toBe(
        'https://storage.googleapis.com/gogocash-catalog-staging/brands/new-logo.png',
      );
      expect(persisted.logo).toBe(
        'https://storage.googleapis.com/gogocash-catalog-staging/brands/new-logo.png',
      );
      expect(persisted.logo_mobile).toBe(
        'https://storage.googleapis.com/gogocash-catalog-staging/brands/new-logo.png',
      );
    });

    it('updateOffer > committed replacement still has cleanup debt > returns the cleanup request key explicitly', async () => {
      offerModel.findById.mockReturnValue(
        makeQuery({
          _id: offerId,
          logo_desktop: 'old-logo',
          logo_mobile: 'old-logo',
        }),
      );
      offerModel.findByIdAndUpdate.mockReturnValue(
        makeQuery({ _id: offerId, offer_name: 'Saved offer' }),
      );
      policyMediaCleanup.processRequest.mockResolvedValueOnce({
        deleted: 0,
        pending: 1,
      });

      await expect(
        service.updateOffer(offerId, {
          logo_desktop: { originalname: 'logo.png' } as Express.Multer.File,
          product_type: [],
        }),
      ).resolves.toEqual(
        expect.objectContaining({
          _id: offerId,
          media_cleanup_pending: true,
          media_cleanup_request_key: expect.stringMatching(/^offer-media:/),
        }),
      );
    });

    it('updateOffer > cleanup processing is unavailable after commit > returns a deterministic 503 with the retry key', async () => {
      offerModel.findById.mockReturnValue(
        makeQuery({ _id: offerId, logo_desktop: 'old-logo' }),
      );
      offerModel.findByIdAndUpdate.mockReturnValue(
        makeQuery({ _id: offerId, offer_name: 'Saved offer' }),
      );
      policyMediaCleanup.processRequest.mockRejectedValueOnce(
        new Error('cleanup worker unavailable'),
      );

      await expect(
        service.updateOffer(offerId, {
          logo_desktop: { originalname: 'logo.png' } as Express.Multer.File,
          product_type: [],
        }),
      ).rejects.toMatchObject({
        status: 503,
        response: expect.objectContaining({
          code: 'OFFER_MEDIA_CLEANUP_PENDING',
          request_key: expect.stringMatching(/^offer-media:/),
        }),
      });
    });

    it('updateOffer > given a new canonical banner > then it journals all replaced references and aliases the new reference', async () => {
      offerModel.findById.mockReturnValue(
        makeQuery({
          _id: offerId,
          banner: 'old-banner',
          banner_mobile: 'old-mobile-banner',
          logo_circle: 'old-circle-cover',
        }),
      );
      storedMediaService.upload.mockResolvedValue(
        'https://storage.googleapis.com/gogocash-catalog-staging/brands/new-banner.png',
      );
      offerModel.findByIdAndUpdate.mockReturnValue(makeQuery({ _id: offerId }));

      await service.updateOffer(offerId, {
        banner: { originalname: 'banner.png' } as Express.Multer.File,
        product_type: [],
      });

      expect(storedMediaService.upload).toHaveBeenCalledTimes(1);
      expect(storedMediaService.upload).toHaveBeenCalledWith(
        expect.objectContaining({ originalname: 'banner.png' }),
        // #493 — banner roles moved off the logo-sized `brands` folder.
        MEDIA_FOLDER.BRAND_BANNERS,
      );
      expect(storedMediaService.replace).not.toHaveBeenCalled();
      expect(policyMediaCleanup.journalLegacyReplacements).toHaveBeenCalledWith(
        expect.objectContaining({
          references: expect.arrayContaining([
            'old-banner',
            'old-mobile-banner',
            'old-circle-cover',
          ]),
        }),
        expect.objectContaining({ id: 'integrity-session' }),
      );
      expect(storedMediaService.deleteStored).not.toHaveBeenCalledWith(
        'old-banner',
      );
      const persisted = offerModel.findByIdAndUpdate.mock.calls[0][1].$set;
      expect(persisted.banner).toBe(
        'https://storage.googleapis.com/gogocash-catalog-staging/brands/new-banner.png',
      );
      expect(persisted.banner_mobile).toBe(persisted.banner);
      expect(persisted.logo_circle).toBe(persisted.banner);
    });

    it('updateOffer > given duplicated legacy media fields > then replaces each physical asset only once', async () => {
      const logo = { originalname: 'logo.png' } as Express.Multer.File;
      const banner = { originalname: 'banner.png' } as Express.Multer.File;
      offerModel.findById.mockReturnValue(
        makeQuery({
          _id: offerId,
          logo_desktop: 'old-logo',
          banner: 'old-banner',
        }),
      );
      storedMediaService.upload
        .mockResolvedValueOnce('stored-logo')
        .mockResolvedValueOnce('stored-banner');
      offerModel.findByIdAndUpdate.mockReturnValue(makeQuery({ _id: offerId }));

      await service.updateOffer(offerId, {
        logo_desktop: logo,
        logo_mobile: logo,
        banner,
        banner_mobile: banner,
        logo_circle: banner,
        product_type: [],
      });

      expect(storedMediaService.upload).toHaveBeenCalledTimes(2);
      expect(
        storedMediaService.upload.mock.calls.map(([file]) => file),
      ).toEqual([logo, banner]);
    });

    it('updateOffer > category conflict after upload > delegates recovery to the durable media command', async () => {
      offerModel.findById.mockReturnValue(
        makeQuery({
          _id: offerId,
          categories: 'Shopping',
          logo_desktop: 'old-logo',
          logo_mobile: 'old-logo',
        }),
      );
      storedMediaService.upload.mockResolvedValue('new-logo');
      categoryIntegrity.withPolicyCategoryAssignment.mockRejectedValueOnce(
        new ConflictException('Category changed; refresh and try again.'),
      );

      await expect(
        service.updateOffer(offerId, {
          logo_desktop: { originalname: 'logo.png' } as Express.Multer.File,
          policy_category_id: new Types.ObjectId().toHexString(),
          product_type: [],
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(storedMediaService.deleteStored).not.toHaveBeenCalled();
      expect(storedMediaService.deleteStored).not.toHaveBeenCalledWith(
        'old-logo',
      );
      expect(offerModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('updateOffer > commit is applied before the transaction wrapper throws > retains the referenced fresh upload', async () => {
      const freshLogo = 'https://media.example/fresh-logo.png';
      const oldOffer = {
        _id: offerId,
        logo: 'old-logo',
        logo_desktop: 'old-logo',
        logo_mobile: 'old-logo',
      };
      const committedOffer = {
        ...oldOffer,
        logo: freshLogo,
        logo_desktop: freshLogo,
        logo_mobile: freshLogo,
      };
      const authoritativeRead = makeQuery(committedOffer);
      offerModel.findById
        .mockReturnValueOnce(makeQuery(oldOffer))
        .mockReturnValueOnce(makeQuery(oldOffer))
        .mockReturnValueOnce(authoritativeRead);
      offerModel.findByIdAndUpdate.mockReturnValue(makeQuery(committedOffer));
      storedMediaService.upload.mockResolvedValue(freshLogo);
      categoryIntegrity.withIntegrityMutation.mockImplementationOnce(
        async (writer) => {
          await writer({ id: 'ambiguous-commit-session' });
          throw Object.assign(new Error('commit result is unknown'), {
            errorLabels: ['UnknownTransactionCommitResult'],
          });
        },
      );

      await expect(
        service.updateOffer(offerId, {
          logo_desktop: { originalname: 'logo.png' } as Express.Multer.File,
          product_type: [],
        }),
      ).rejects.toThrow('commit result is unknown');

      expect(offerModel.findById).toHaveBeenCalledTimes(2);
      expect(authoritativeRead.read).not.toHaveBeenCalled();
      expect(storedMediaService.deleteStored).not.toHaveBeenCalledWith(
        freshLogo,
      );
      expect(policyMediaCleanup.journalUncertainUploads).not.toHaveBeenCalled();
    });

    it('updateOffer > commit outcome is unknown > leaves the pre-Put command as the recovery journal', async () => {
      const freshLogo = 'https://media.example/fresh-logo-pending.png';
      const oldOffer = {
        _id: offerId,
        logo: 'old-logo',
        logo_desktop: 'old-logo',
        logo_mobile: 'old-logo',
      };
      offerModel.findById
        .mockReturnValueOnce(makeQuery(oldOffer))
        .mockReturnValueOnce(makeQuery(oldOffer));
      storedMediaService.upload.mockResolvedValue(freshLogo);
      categoryIntegrity.withIntegrityMutation.mockRejectedValueOnce(
        Object.assign(new Error('commit result is unknown'), {
          errorLabels: ['UnknownTransactionCommitResult'],
        }),
      );

      await expect(
        service.updateOffer(offerId, {
          logo_desktop: { originalname: 'logo.png' } as Express.Multer.File,
          product_type: [],
        }),
      ).rejects.toThrow('commit result is unknown');

      expect(storedMediaService.deleteStored).not.toHaveBeenCalledWith(
        freshLogo,
      );
      expect(policyMediaCleanup.journalUncertainUploads).not.toHaveBeenCalled();
      expect(policyMediaWrite.execute).toHaveBeenCalledTimes(1);
    });

    it('updateOffer > the authoritative post-error read is unavailable > retains the fresh upload for reconciliation', async () => {
      const freshLogo = 'https://media.example/fresh-logo-uncertain.png';
      const failedRead = makeQuery(null);
      failedRead.lean.mockRejectedValueOnce(new Error('primary unavailable'));
      offerModel.findById
        .mockReturnValueOnce(
          makeQuery({
            _id: offerId,
            categories: 'Shopping',
            logo_desktop: 'old-logo',
          }),
        )
        .mockReturnValueOnce(failedRead);
      storedMediaService.upload.mockResolvedValue(freshLogo);
      categoryIntegrity.withPolicyCategoryAssignment.mockRejectedValueOnce(
        new ConflictException('Category changed; refresh and try again.'),
      );

      await expect(
        service.updateOffer(offerId, {
          logo_desktop: { originalname: 'logo.png' } as Express.Multer.File,
          policy_category_id: new Types.ObjectId().toHexString(),
          product_type: [],
        }),
      ).rejects.toThrow('primary unavailable');

      expect(storedMediaService.deleteStored).not.toHaveBeenCalledWith(
        freshLogo,
      );
      expect(policyMediaCleanup.journalUncertainUploads).not.toHaveBeenCalled();
    });

    it('updateOffer > derives the raw category through a same-transaction loader instead of the stale preflight document', async () => {
      const categoryId = new Types.ObjectId().toHexString();
      offerModel.findById.mockReturnValue(
        makeQuery({
          _id: offerId,
          categories: 'Category A',
          policy_category_id: categoryId,
        }),
      );
      offerModel.findByIdAndUpdate.mockReturnValue(makeQuery({ _id: offerId }));

      await service.updateOffer(offerId, {
        policy_category_id: categoryId,
        product_type: [],
      });

      const rawCategoryInput =
        categoryIntegrity.withPolicyCategoryAssignment.mock.calls[0][1];
      expect(rawCategoryInput).toEqual(expect.any(Function));
    });

    it('updateOffer > blank policy_category_id unsets an existing direct assignment atomically', async () => {
      offerModel.findById.mockReturnValue(
        makeQuery({
          _id: offerId,
          categories: '',
          policy_category_id: new Types.ObjectId().toHexString(),
        }),
      );
      categoryIntegrity.withPolicyCategoryAssignment.mockImplementationOnce(
        (_policyCategoryId, _rawCategory, writer) =>
          writer(
            {
              unset_policy_category_id: true,
              categories_normalized: null,
            },
            undefined,
          ),
      );
      offerModel.findByIdAndUpdate.mockReturnValue(makeQuery({ _id: offerId }));

      await service.updateOffer(offerId, {
        policy_category_id: '   ',
        product_type: [],
      });

      expect(offerModel.findByIdAndUpdate).toHaveBeenCalledWith(
        new Types.ObjectId(offerId),
        expect.objectContaining({
          $unset: { policy_category_id: 1 },
        }),
        expect.any(Object),
      );
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

    // #428 / #429 — cashback PATCH must persist plural product-type rows + flag
    // without wiping them on unrelated partial updates.
    it('updateOffer > given product_type rows and all_product_types > then both persist', async () => {
      offerModel.findById.mockReturnValue(makeQuery({ _id: offerId }));
      offerModel.findByIdAndUpdate.mockReturnValue(makeQuery({ _id: offerId }));

      const rows = [
        {
          name: 'Fashion',
          pay_in: 'cashback',
          commission_info: '5.6',
        },
      ];
      await service.updateOffer(offerId, {
        product_type: rows as never,
        all_product_types: false,
        commission_store: 5.6,
      });

      const persisted = offerModel.findByIdAndUpdate.mock.calls[0][1].$set;
      expect(persisted.product_type).toEqual(rows);
      expect(persisted.all_product_types).toBe(false);
      expect(persisted.commission_store).toBe(5.6);
    });

    it('#565 > given a described product type > then the description survives the update result and a primary reload', async () => {
      let persistedOffer: Record<string, unknown> = {
        _id: offerId,
        offer_name: 'Book World - CPS',
        product_type: [],
      };
      offerModel.findById.mockImplementation(() =>
        makeQuery({ ...persistedOffer }),
      );
      offerModel.findByIdAndUpdate.mockImplementation(
        (_id: Types.ObjectId, update: { $set: Record<string, unknown> }) => {
          persistedOffer = { ...persistedOffer, ...update.$set };
          return makeQuery({ ...persistedOffer });
        },
      );

      const rows = [
        {
          name: 'Books',
          pay_in: 'cashback',
          commission_info: '5.6',
          description: 'Children / Comics / Manga',
        },
      ];
      const saved = await service.updateOffer(offerId, {
        product_type: rows as never,
        all_product_types: false,
      });
      const reloaded = await offerModel
        .findById(new Types.ObjectId(offerId))
        .read('primary')
        .exec();
      const reloadedRows = (reloaded as { product_type: typeof rows })
        .product_type;
      const savedRows = (saved as { product_type: typeof rows }).product_type;

      expect(savedRows).toEqual(rows);
      expect(reloadedRows).toEqual(rows);
      expect(reloadedRows[0].description).toBe('Children / Comics / Manga');
    });

    // #516 / #518 — the admin has always submitted these two on partner-info
    // save, but nothing persisted them, so forbidNonWhitelisted rejected the
    // whole request ("property affiliate_network_id should not exist") before
    // product_types was ever examined. That made "Info from partner" unsaveable
    // for EVERY offer, and the admin's hardcoded error string hid the reason.
    it('updateOffer > given affiliate_network_id and deeplink_store_id > then both persist', async () => {
      offerModel.findById.mockReturnValue(makeQuery({ _id: offerId }));
      offerModel.findByIdAndUpdate.mockReturnValue(makeQuery({ _id: offerId }));

      await service.updateOffer(offerId, {
        affiliate_network_id: 'accesstrade',
        deeplink_store_id: 'shopee_cps_new',
      });

      const persisted = offerModel.findByIdAndUpdate.mock.calls[0][1].$set;
      expect(persisted.affiliate_network_id).toBe('accesstrade');
      expect(persisted.deeplink_store_id).toBe('shopee_cps_new');
    });

    // Absent key must leave the stored value alone — a partial save (T&C, media,
    // tracking period) must never blank the network or advertiser line.
    it('updateOffer > given neither key > then neither is written', async () => {
      offerModel.findById.mockReturnValue(makeQuery({ _id: offerId }));
      offerModel.findByIdAndUpdate.mockReturnValue(makeQuery({ _id: offerId }));

      await service.updateOffer(offerId, { note_to_user: 'hello' });

      const persisted = offerModel.findByIdAndUpdate.mock.calls[0][1].$set;
      expect('affiliate_network_id' in persisted).toBe(false);
      expect('deeplink_store_id' in persisted).toBe(false);
    });

    it('updateOffer > given upsize product rows > then upsize fields persist (#471)', async () => {
      offerModel.findById.mockReturnValue(makeQuery({ _id: offerId }));
      offerModel.findByIdAndUpdate.mockReturnValue(makeQuery({ _id: offerId }));

      const upsizeRows = [
        {
          name: 'OPPO Find X9',
          pay_in: 'cashback',
          commission_info: '3.5',
        },
      ];
      await service.updateOffer(offerId, {
        upsize_all_product_types: false,
        upsize_start_date: '2026-07-01',
        upsize_end_date: '2026-07-31',
        upsize_product_types: upsizeRows as never,
      });

      const persisted = offerModel.findByIdAndUpdate.mock.calls[0][1].$set;
      expect(persisted.upsize_all_product_types).toBe(false);
      expect(persisted.upsize_start_date).toBe('2026-07-01');
      expect(persisted.upsize_end_date).toBe('2026-07-31');
      expect(persisted.upsize_product_types).toEqual(upsizeRows);
    });

    it('updateOffer > given no product_type field > then existing product_type is not wiped', async () => {
      offerModel.findById.mockReturnValue(
        makeQuery({
          _id: offerId,
          product_type: [{ name: 'Keep me' }],
          commission_store: 4,
        }),
      );
      offerModel.findByIdAndUpdate.mockReturnValue(makeQuery({ _id: offerId }));

      await service.updateOffer(offerId, {
        offer_name_display: 'Renamed',
      } as never);

      const persisted = offerModel.findByIdAndUpdate.mock.calls[0][1].$set;
      expect(persisted.product_type).toBeUndefined();
      expect(persisted.offer_name_display).toBe('Renamed');
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

    it('updateOffer > given tracking_period_mode manual with day counts > then the $set persists all three fields', async () => {
      offerModel.findById.mockReturnValue(makeQuery({ _id: offerId }));
      offerModel.findByIdAndUpdate.mockReturnValue(makeQuery({ _id: offerId }));

      await service.updateOffer(offerId, {
        product_type: [],
        tracking_period_mode: 'manual',
        tracking_days: 21,
        confirm_days: 45,
      });

      const persisted = offerModel.findByIdAndUpdate.mock.calls[0][1].$set;
      expect(persisted.tracking_period_mode).toBe('manual');
      expect(persisted.tracking_days).toBe(21);
      expect(persisted.confirm_days).toBe(45);
    });

    it('updateOffer > given a payload without tracking-period fields > then the $set contains none of them (existing values untouched)', async () => {
      offerModel.findById.mockReturnValue(
        makeQuery({
          _id: offerId,
          tracking_period_mode: 'manual',
          tracking_days: 7,
          confirm_days: 14,
        }),
      );
      offerModel.findByIdAndUpdate.mockReturnValue(makeQuery({ _id: offerId }));

      await service.updateOffer(offerId, { product_type: [] });

      const persisted = offerModel.findByIdAndUpdate.mock.calls[0][1].$set;
      expect(persisted).not.toHaveProperty('tracking_period_mode');
      expect(persisted).not.toHaveProperty('tracking_days');
      expect(persisted).not.toHaveProperty('confirm_days');
    });

    it('updateOffer > given flow_type and step subtitles > then the $set persists all three fields', async () => {
      offerModel.findById.mockReturnValue(makeQuery({ _id: offerId }));
      offerModel.findByIdAndUpdate.mockReturnValue(makeQuery({ _id: offerId }));

      await service.updateOffer(offerId, {
        product_type: [],
        flow_type: 'two_step',
        tracking_subtitle: 'after the return window closes',
        confirm_subtitle: '',
      });

      const persisted = offerModel.findByIdAndUpdate.mock.calls[0][1].$set;
      expect(persisted.flow_type).toBe('two_step');
      expect(persisted.tracking_subtitle).toBe(
        'after the return window closes',
      );
      // Empty string persists as an explicit clear (resolver falls back to default).
      expect(persisted.confirm_subtitle).toBe('');
    });

    it('updateOffer > given a payload without flow/subtitle fields > then the $set contains none of them', async () => {
      offerModel.findById.mockReturnValue(
        makeQuery({
          _id: offerId,
          flow_type: 'two_step',
          tracking_subtitle: 'custom tracking caption',
          confirm_subtitle: 'custom confirm caption',
        }),
      );
      offerModel.findByIdAndUpdate.mockReturnValue(makeQuery({ _id: offerId }));

      await service.updateOffer(offerId, { product_type: [] });

      const persisted = offerModel.findByIdAndUpdate.mock.calls[0][1].$set;
      expect(persisted).not.toHaveProperty('flow_type');
      expect(persisted).not.toHaveProperty('tracking_subtitle');
      expect(persisted).not.toHaveProperty('confirm_subtitle');
    });

    it('updateOffer > given mode switched to auto only > then stored manual day counts are not cleared', async () => {
      offerModel.findById.mockReturnValue(
        makeQuery({ _id: offerId, tracking_days: 7, confirm_days: 14 }),
      );
      offerModel.findByIdAndUpdate.mockReturnValue(makeQuery({ _id: offerId }));

      await service.updateOffer(offerId, {
        product_type: [],
        tracking_period_mode: 'auto',
      });

      const persisted = offerModel.findByIdAndUpdate.mock.calls[0][1].$set;
      expect(persisted.tracking_period_mode).toBe('auto');
      expect(persisted).not.toHaveProperty('tracking_days');
      expect(persisted).not.toHaveProperty('confirm_days');
    });

    it('updateOffer > given terms-and-conditions fields > then they persist (regression: admin T&C saves silently no-oped)', async () => {
      offerModel.findById.mockReturnValue(makeQuery({ _id: offerId }));
      offerModel.findByIdAndUpdate.mockReturnValue(makeQuery({ _id: offerId }));

      await service.updateOffer(offerId, {
        product_type: [],
        policy_category_id: '68345f00aa11bb22cc33dd99',
        custom_terms: '1. Custom term',
        note_to_user: 'Flash sale this week only.',
      });

      const persisted = offerModel.findByIdAndUpdate.mock.calls[0][1].$set;
      expect(persisted.policy_category_id).toBe('68345f00aa11bb22cc33dd99');
      expect(persisted.custom_terms).toBe('1. Custom term');
      expect(persisted.note_to_user).toBe('Flash sale this week only.');
    });

    it('updateOffer > given a payload without terms fields > then the $set leaves them untouched', async () => {
      offerModel.findById.mockReturnValue(
        makeQuery({ _id: offerId, custom_terms: 'keep me' }),
      );
      offerModel.findByIdAndUpdate.mockReturnValue(makeQuery({ _id: offerId }));

      await service.updateOffer(offerId, { product_type: [] });

      const persisted = offerModel.findByIdAndUpdate.mock.calls[0][1].$set;
      expect(persisted).not.toHaveProperty('policy_category_id');
      expect(persisted).not.toHaveProperty('custom_terms');
      expect(persisted).not.toHaveProperty('note_to_user');
    });

    it('updateOffer > given lookup_value > then it persists the trimmed slug', async () => {
      offerModel.findById.mockReturnValue(
        makeQuery({
          _id: offerId,
          lookup_value: 'old_slug',
        }),
      );
      offerModel.findByIdAndUpdate.mockReturnValue(makeQuery({ _id: offerId }));

      await service.updateOffer(offerId, {
        product_type: [],
        lookup_value: '  shopee_th  ',
      });

      const persisted = offerModel.findByIdAndUpdate.mock.calls[0][1].$set;
      expect(persisted.lookup_value).toBe('shopee_th');
    });

    it('updateOffer > given offer_display_tags > then it persists normalized merchandising tags', async () => {
      offerModel.findById.mockReturnValue(
        makeQuery({
          _id: offerId,
          offer_display_tags: {
            brand_category_enabled: false,
            brand_category_label: '',
            extra_cashback_tag: false,
            grab_coupon_tag: false,
            expire_in_days_enabled: false,
            expire_in_days: null,
          },
        }),
      );
      offerModel.findByIdAndUpdate.mockReturnValue(makeQuery({ _id: offerId }));

      await service.updateOffer(offerId, {
        product_type: [],
        offer_display_tags: {
          brand_category_enabled: true,
          brand_category_label: 'Shopping',
          extra_cashback_tag: true,
          grab_coupon_tag: false,
          expire_in_days_enabled: true,
          expire_in_days: 14,
        },
      });

      const persisted = offerModel.findByIdAndUpdate.mock.calls[0][1].$set;
      expect(persisted.offer_display_tags).toEqual({
        brand_category_enabled: true,
        brand_category_label: 'Shopping',
        extra_cashback_tag: true,
        grab_coupon_tag: false,
        expire_in_days_enabled: true,
        expire_in_days: 14,
      });
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

  describe('createCategory', () => {
    it('createCategory > given a name > then it creates the category and returns the created document', async () => {
      const created = { _id: 'cat-1', name: 'Fashion', image: '' };
      categoryIntegrity.createLegacyCategory.mockResolvedValue(created);

      const result = await service.createCategory('Fashion');

      expect(categoryIntegrity.createLegacyCategory).toHaveBeenCalledWith(
        'Fashion',
      );
      expect(result).toBe(created);
    });

    it('createCategory > given an empty/whitespace name > then it rejects with 400 "name is required"', async () => {
      await expect(service.createCategory('   ')).rejects.toMatchObject({
        status: 400,
        message: 'name is required',
      });
      expect(categoryIntegrity.createLegacyCategory).not.toHaveBeenCalled();
    });

    it('createCategory > given a Mongo duplicate-key error (unique name index) > then it rejects with a clear 400', async () => {
      categoryIntegrity.createLegacyCategory.mockRejectedValue(
        new ConflictException('A category named "Fashion" already exists'),
      );

      await expect(service.createCategory('Fashion')).rejects.toMatchObject({
        status: 409,
        message: expect.stringContaining('already exists'),
      });
    });

    it('createCategory > given a non-duplicate database error > then it rethrows untouched (no silent 400)', async () => {
      const dbError = new Error('connection reset');
      categoryIntegrity.createLegacyCategory.mockRejectedValue(dbError);

      await expect(service.createCategory('Fashion')).rejects.toBe(dbError);
    });
  });

  describe('updateCategory', () => {
    const categoryId = new Types.ObjectId().toHexString();

    it('updateCategory > before activation > preserves the standalone legacy media update', async () => {
      categoryIntegrity.withNormalWrite.mockImplementation(({ legacy }) =>
        legacy(),
      );
      categoryModel.findById.mockReturnValue(
        makeQuery({ _id: categoryId, name: 'Travel', image: 'old-image' }),
      );
      storedMediaService.replace.mockResolvedValue('legacy-new-image');
      categoryModel.findByIdAndUpdate.mockReturnValue(
        makeQuery({ _id: categoryId, image: 'legacy-new-image' }),
      );

      await service.updateCategory(categoryId, {
        image: { originalname: 'image.png' } as Express.Multer.File,
      });

      expect(storedMediaService.replace).toHaveBeenCalledWith(
        expect.objectContaining({ originalname: 'image.png' }),
        MEDIA_FOLDER.CATEGORIES,
        'old-image',
      );
      expect(policyMediaWrite.execute).not.toHaveBeenCalled();
      expect(categoryIntegrity.withIntegrityMutation).not.toHaveBeenCalled();
      expect(categoryModel.findByIdAndUpdate.mock.calls[0][2]).toEqual({
        new: true,
      });
    });

    it('updateCategory > before activation duplicate rename > preserves the established clear 400 response', async () => {
      categoryIntegrity.withNormalWrite.mockImplementation(({ legacy }) =>
        legacy(),
      );
      categoryModel.findById.mockReturnValue(
        makeQuery({ _id: categoryId, name: 'Travel' }),
      );
      const duplicate = makeQuery(null);
      duplicate.exec.mockRejectedValue(
        Object.assign(new Error('E11000 duplicate key'), { code: 11000 }),
      );
      categoryModel.findByIdAndUpdate.mockReturnValue(duplicate);

      await expect(
        service.updateCategory(categoryId, { name: 'Taken' }),
      ).rejects.toMatchObject({
        status: 400,
        message: 'A category named "Taken" already exists.',
      });
    });

    it('updateCategory > given a name > then it persists the rename', async () => {
      categoryModel.findById.mockReturnValue(
        makeQuery({ _id: categoryId, name: 'Old name', image: 'old.png' }),
      );
      await service.updateCategory(categoryId, { name: 'New name' });

      expect(
        categoryIntegrity.updateLegacyCategoryMetadata,
      ).toHaveBeenCalledWith(categoryId, { name: 'New name' });
    });

    it('updateCategory > given an image-only payload > then the update carries no name key (existing name untouched)', async () => {
      categoryModel.findById.mockReturnValue(
        makeQuery({ _id: categoryId, name: 'Keep me', image: 'old.png' }),
      );
      storedMediaService.upload.mockResolvedValue(
        'https://storage.googleapis.com/gogocash-catalog-staging/categories/new.png',
      );

      await service.updateCategory(categoryId, {
        image: { originalname: 'new.png' } as Express.Multer.File,
      });

      expect(categoryModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ _id: new Types.ObjectId(categoryId) }),
        expect.objectContaining({
          $set: expect.objectContaining({
            image:
              'https://storage.googleapis.com/gogocash-catalog-staging/categories/new.png',
          }),
        }),
        expect.objectContaining({ session: { id: 'integrity-session' } }),
      );
      expect(
        categoryModel.findOneAndUpdate.mock.calls[0][1].$set,
      ).not.toHaveProperty('name');
    });

    it('updateCategory > given a banner upload > then it durably persists and journals the replaced banner', async () => {
      categoryModel.findById.mockReturnValue(
        makeQuery({
          _id: categoryId,
          name: 'Keep me',
          image: 'icon.png',
          banner: 'old-wide.png',
        }),
      );
      storedMediaService.upload.mockResolvedValue(
        'https://storage.googleapis.com/gogocash-catalog-staging/categories/new-wide.png',
      );
      const banner = {
        originalname: 'new-wide.png',
      } as Express.Multer.File;

      await service.updateCategory(categoryId, { banner });

      expect(storedMediaService.upload).toHaveBeenCalledWith(
        banner,
        MEDIA_FOLDER.CATEGORIES,
      );
      expect(categoryModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ _id: new Types.ObjectId(categoryId) }),
        expect.objectContaining({
          $set: expect.objectContaining({
            banner:
              'https://storage.googleapis.com/gogocash-catalog-staging/categories/new-wide.png',
          }),
        }),
        expect.objectContaining({ session: { id: 'integrity-session' } }),
      );
    });

    it('updateCategory > rename plus media > commits the rename inside the durable media transaction', async () => {
      const session = { id: 'integrity-session' };
      categoryModel.findById.mockReturnValue(
        makeQuery({
          _id: categoryId,
          name: 'Old name',
          image: 'old.png',
          revision: 3,
        }),
      );
      storedMediaService.upload.mockResolvedValue('new.png');
      categoryIntegrity.reserveLegacyCategoryRenameInSession.mockResolvedValue({
        name: 'New name',
        name_normalized: 'new name',
      });

      await service.updateCategory(categoryId, {
        name: 'New name',
        image: { originalname: 'new.png' } as Express.Multer.File,
      });

      expect(
        categoryIntegrity.updateLegacyCategoryMetadata,
      ).not.toHaveBeenCalled();
      expect(
        categoryIntegrity.reserveLegacyCategoryRenameInSession,
      ).toHaveBeenCalledWith(categoryId, 'New name', session);
      expect(categoryModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
      expect(categoryModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ _id: new Types.ObjectId(categoryId) }),
        expect.objectContaining({
          $set: expect.objectContaining({
            name: 'New name',
            name_normalized: 'new name',
            image: 'new.png',
          }),
          $inc: { revision: 1 },
        }),
        expect.objectContaining({ session }),
      );
    });

    it('updateCategory > rename plus failed upload > leaves the rename unapplied', async () => {
      categoryModel.findById.mockReturnValue(
        makeQuery({ _id: categoryId, name: 'Old name', image: 'old.png' }),
      );
      storedMediaService.upload.mockRejectedValue(new Error('upload failed'));

      await expect(
        service.updateCategory(categoryId, {
          name: 'New name',
          image: { originalname: 'new.png' } as Express.Multer.File,
        }),
      ).rejects.toThrow('upload failed');

      expect(
        categoryIntegrity.updateLegacyCategoryMetadata,
      ).not.toHaveBeenCalled();
      expect(
        categoryIntegrity.reserveLegacyCategoryRenameInSession,
      ).not.toHaveBeenCalled();
    });

    it('updateCategory > committed replacement still has cleanup debt > returns the cleanup request key explicitly', async () => {
      categoryModel.findById.mockReturnValue(
        makeQuery({
          _id: categoryId,
          name: 'Keep me',
          image: 'old.png',
        }),
      );
      categoryModel.findOneAndUpdate.mockReturnValue(
        makeQuery({
          _id: categoryId,
          name: 'Keep me',
          image: 'new.png',
          revision: 2,
        }),
      );
      policyMediaCleanup.processRequest.mockResolvedValueOnce({
        deleted: 0,
        pending: 1,
      });

      await expect(
        service.updateCategory(categoryId, {
          image: { originalname: 'new.png' } as Express.Multer.File,
        }),
      ).resolves.toEqual(
        expect.objectContaining({
          _id: categoryId,
          media_cleanup_pending: true,
          media_cleanup_request_key: expect.stringMatching(/^category-media:/),
        }),
      );
    });

    it('updateCategory > cleanup processing is unavailable after commit > returns a deterministic 503 with the retry key', async () => {
      categoryModel.findById.mockReturnValue(
        makeQuery({ _id: categoryId, name: 'Keep me', image: 'old.png' }),
      );
      policyMediaCleanup.processRequest.mockRejectedValueOnce(
        new Error('cleanup worker unavailable'),
      );

      await expect(
        service.updateCategory(categoryId, {
          image: { originalname: 'new.png' } as Express.Multer.File,
        }),
      ).rejects.toMatchObject({
        status: 503,
        response: expect.objectContaining({
          code: 'CATEGORY_MEDIA_CLEANUP_PENDING',
          request_key: expect.stringMatching(/^category-media:/),
        }),
      });
    });

    it('updateCategory > second upload fails > delegates recovery to the durable media command', async () => {
      categoryModel.findById.mockReturnValue(
        makeQuery({ _id: categoryId, name: 'Keep me' }),
      );
      storedMediaService.upload
        .mockResolvedValueOnce('new-icon')
        .mockRejectedValueOnce(new Error('banner upload failed'));

      await expect(
        service.updateCategory(categoryId, {
          image: {} as Express.Multer.File,
          banner: {} as Express.Multer.File,
        }),
      ).rejects.toThrow('banner upload failed');
      expect(storedMediaService.deleteStored).not.toHaveBeenCalled();
      expect(policyMediaWrite.execute).toHaveBeenCalledTimes(1);
      expect(
        categoryIntegrity.updateLegacyCategoryMetadata,
      ).not.toHaveBeenCalled();
    });

    it('updateCategory > integrity fence rejects > leaves recovery to the durable media command', async () => {
      categoryModel.findById.mockReturnValue(
        makeQuery({ _id: categoryId, name: 'Keep me' }),
      );
      storedMediaService.upload
        .mockResolvedValueOnce('new-icon')
        .mockResolvedValueOnce('new-banner');
      categoryIntegrity.withIntegrityMutation.mockRejectedValueOnce(
        new ConflictException('Category changed; refresh and try again.'),
      );

      await expect(
        service.updateCategory(categoryId, {
          image: {} as Express.Multer.File,
          banner: {} as Express.Multer.File,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(storedMediaService.deleteStored).not.toHaveBeenCalled();
    });

    it('updateCategory > commit is applied before the transaction wrapper throws > retains the referenced fresh uploads', async () => {
      const freshIcon = 'https://media.example/fresh-category-icon.png';
      const freshBanner = 'https://media.example/fresh-category-banner.png';
      const oldCategory = {
        _id: categoryId,
        name: 'Keep me',
        image: 'old-icon',
        banner: 'old-banner',
      };
      const authoritativeRead = makeQuery({
        ...oldCategory,
        image: freshIcon,
        banner: freshBanner,
      });
      categoryModel.findById
        .mockReturnValueOnce(makeQuery(oldCategory))
        .mockReturnValueOnce(authoritativeRead);
      storedMediaService.upload
        .mockResolvedValueOnce(freshIcon)
        .mockResolvedValueOnce(freshBanner);
      categoryIntegrity.withIntegrityMutation.mockImplementationOnce(
        async (writer) => {
          await writer({ id: 'ambiguous-commit-session' });
          throw Object.assign(new Error('commit result is unknown'), {
            errorLabels: ['UnknownTransactionCommitResult'],
          });
        },
      );

      await expect(
        service.updateCategory(categoryId, {
          image: {} as Express.Multer.File,
          banner: {} as Express.Multer.File,
        }),
      ).rejects.toThrow('commit result is unknown');

      expect(categoryModel.findById).toHaveBeenCalledTimes(1);
      expect(authoritativeRead.read).not.toHaveBeenCalled();
      expect(storedMediaService.deleteStored).not.toHaveBeenCalledWith(
        freshIcon,
      );
      expect(storedMediaService.deleteStored).not.toHaveBeenCalledWith(
        freshBanner,
      );
      expect(policyMediaCleanup.journalUncertainUploads).not.toHaveBeenCalled();
    });

    it('updateCategory > commit outcome is unknown > leaves the pre-Put command as the recovery journal', async () => {
      const freshIcon = 'https://media.example/fresh-category-pending.png';
      const oldCategory = {
        _id: categoryId,
        name: 'Keep me',
        image: 'old-icon',
      };
      categoryModel.findById
        .mockReturnValueOnce(makeQuery(oldCategory))
        .mockReturnValueOnce(makeQuery(oldCategory));
      storedMediaService.upload.mockResolvedValueOnce(freshIcon);
      categoryIntegrity.withIntegrityMutation.mockRejectedValueOnce(
        Object.assign(new Error('commit result is unknown'), {
          errorLabels: ['UnknownTransactionCommitResult'],
        }),
      );

      await expect(
        service.updateCategory(categoryId, {
          image: {} as Express.Multer.File,
        }),
      ).rejects.toThrow('commit result is unknown');

      expect(storedMediaService.deleteStored).not.toHaveBeenCalledWith(
        freshIcon,
      );
      expect(policyMediaCleanup.journalUncertainUploads).not.toHaveBeenCalled();
    });

    it('updateCategory > the authoritative post-error read is unavailable > retains fresh media for reconciliation', async () => {
      const freshIcon = 'https://media.example/fresh-category-uncertain.png';
      const failedRead = makeQuery(null);
      failedRead.lean.mockRejectedValueOnce(new Error('primary unavailable'));
      categoryModel.findById
        .mockReturnValueOnce(
          makeQuery({
            _id: categoryId,
            name: 'Keep me',
            image: 'old-icon',
          }),
        )
        .mockReturnValueOnce(failedRead);
      storedMediaService.upload.mockResolvedValueOnce(freshIcon);
      categoryIntegrity.withIntegrityMutation.mockRejectedValueOnce(
        new ConflictException('Category changed; refresh and try again.'),
      );

      await expect(
        service.updateCategory(categoryId, {
          image: {} as Express.Multer.File,
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(storedMediaService.deleteStored).not.toHaveBeenCalledWith(
        freshIcon,
      );
      expect(policyMediaCleanup.journalUncertainUploads).not.toHaveBeenCalled();
    });

    it('updateCategory > given a banner upload > then it replaces and persists the category banner', async () => {
      categoryModel.findById.mockReturnValue(
        makeQuery({
          _id: categoryId,
          name: 'Keep me',
          image: 'icon.png',
          banner: 'old-wide.png',
        }),
      );
      categoryModel.findOne.mockReturnValue(
        makeQuery({
          _id: categoryId,
          name: 'Keep me',
          image: 'icon.png',
          banner: 'old-wide.png',
          lifecycle_status: 'active',
          revision: 1,
        }),
      );
      storedMediaService.upload.mockResolvedValue(
        'https://storage.googleapis.com/gogocash-catalog-staging/categories/new-wide.png',
      );
      const banner = {
        originalname: 'new-wide.png',
      } as Express.Multer.File;

      await service.updateCategory(categoryId, { banner });

      expect(storedMediaService.upload).toHaveBeenCalledWith(
        banner,
        MEDIA_FOLDER.CATEGORIES,
      );
      expect(storedMediaService.replace).not.toHaveBeenCalled();
      expect(policyMediaWrite.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerType: 'category',
          operation: 'category-update',
          uploads: [expect.objectContaining({ role: 'banner', file: banner })],
        }),
      );
      expect(categoryModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ _id: new Types.ObjectId(categoryId) }),
        expect.objectContaining({
          $set: expect.objectContaining({
            banner:
              'https://storage.googleapis.com/gogocash-catalog-staging/categories/new-wide.png',
          }),
          $inc: { revision: 1 },
        }),
        expect.objectContaining({ session: { id: 'integrity-session' } }),
      );
      expect(policyMediaCleanup.journalLegacyReplacements).toHaveBeenCalledWith(
        expect.objectContaining({
          owner_type: 'category',
          reason: 'legacy-category-replaced',
          references: ['old-wide.png'],
        }),
        { id: 'integrity-session' },
      );
    });

    it('updateCategory > given a rename that hits the unique name index > then it rejects with a clear 400', async () => {
      categoryModel.findById.mockReturnValue(
        makeQuery({ _id: categoryId, name: 'Old name', image: '' }),
      );
      categoryIntegrity.updateLegacyCategoryMetadata.mockRejectedValue(
        new ConflictException('A category named "Taken" already exists'),
      );
      await expect(
        service.updateCategory(categoryId, { name: 'Taken' }),
      ).rejects.toMatchObject({
        status: 409,
        message: expect.stringContaining('already exists'),
      });
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
      expect(storedMediaService.deleteStored).not.toHaveBeenCalled();
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

      expect(storedMediaService.deleteStored).toHaveBeenCalledWith(
        'drive-file-2',
      );
      const [, update] = bannerModel.findOneAndUpdate.mock.calls[0];
      expect(update.$set.image_2).toBeNull();
      expect(update.$set.link_2).toBe('');
    });

    it('updateBannerHome > given a new image upload > then stores the GCS public URL and deletes legacy Drive file', async () => {
      bannerModel.findOne.mockReturnValue(
        makeQuery({
          _id: 'banner-doc',
          image_1: 'legacy-drive-id',
        }),
      );
      bannerModel.findOneAndUpdate.mockReturnValue(
        makeQuery({ _id: 'banner-doc' }),
      );

      await service.updateBannerHome({
        image_1: {
          originalname: 'hero.png',
          mimetype: 'image/png',
          buffer: Buffer.from('png'),
        },
        image_2: null,
        image_3: null,
        image_4: null,
        image_5: null,
      } as never);

      expect(storedMediaService.replace).toHaveBeenCalledWith(
        expect.objectContaining({ originalname: 'hero.png' }),
        'banner-home',
        'legacy-drive-id',
      );
      const [, update] = bannerModel.findOneAndUpdate.mock.calls[0];
      expect(update.$set.image_1).toBe(
        'https://storage.googleapis.com/gogocash-catalog-staging/banner-home/new.png',
      );
    });

    it('updateBannerHome > given clear_image for a GCS URL > then deletes from GCS', async () => {
      bannerModel.findOne.mockReturnValue(
        makeQuery({
          _id: 'banner-doc',
          image_3:
            'https://storage.googleapis.com/gogocash-catalog-staging/banner-home/old.png',
        }),
      );
      bannerModel.findOneAndUpdate.mockReturnValue(
        makeQuery({ _id: 'banner-doc' }),
      );

      await service.updateBannerHome({
        clear_image_3: true,
        image_1: null,
        image_2: null,
        image_3: null,
        image_4: null,
        image_5: null,
      } as never);

      expect(storedMediaService.deleteStored).toHaveBeenCalledWith(
        'https://storage.googleapis.com/gogocash-catalog-staging/banner-home/old.png',
      );
      const [, update] = bannerModel.findOneAndUpdate.mock.calls[0];
      expect(update.$set.image_3).toBeNull();
    });
  });

  describe('specific page banners', () => {
    it('updateSpecificPageBanner > given a valid target > then reads and upserts only that target with slots 1-3', async () => {
      specificPageBannerModel.findOne.mockReturnValue(makeQuery(null));
      specificPageBannerModel.findOneAndUpdate.mockReturnValue(
        makeQuery({ _id: 'all-shops-banner-doc' }),
      );
      storedMediaService.upload.mockResolvedValueOnce(
        'https://media.gogocash.co/banner-specific-page/shops.png',
      );

      await service.updateSpecificPageBanner('all-shops', {
        image_1: {
          originalname: 'shops.png',
          mimetype: 'image/png',
          buffer: Buffer.from('png'),
        },
        image_4: {
          originalname: 'hidden.png',
          mimetype: 'image/png',
          buffer: Buffer.from('png'),
        },
        link_1: '/shops/promo',
        link_4: '/must-not-persist',
      } as never);

      expect(storedMediaService.upload).toHaveBeenCalledWith(
        expect.objectContaining({ originalname: 'shops.png' }),
        'banner-specific-page',
      );
      expect(storedMediaService.replace).not.toHaveBeenCalled();
      expect(specificPageBannerModel.findOne).toHaveBeenCalledWith({
        target: 'all-shops',
      });
      expect(specificPageBannerModel.findOneAndUpdate).toHaveBeenCalledWith(
        { target: 'all-shops' },
        expect.objectContaining({
          $set: expect.objectContaining({
            target: 'all-shops',
            link_1: '/shops/promo',
          }),
        }),
        { upsert: true, new: true },
      );
      const [, update] = specificPageBannerModel.findOneAndUpdate.mock.calls[0];
      expect(update.$set.image_4).toBeUndefined();
      expect(update.$set.link_4).toBeUndefined();
      expect(bannerModel.findOneAndUpdate).not.toHaveBeenCalled();
      expect(allBrandBannerModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('updateSpecificPageBanner > after a successful Mongo write > deletes the replaced old image', async () => {
      specificPageBannerModel.findOne.mockReturnValue(
        makeQuery({ target: 'all-shops', image_1: 'old-shops.png' }),
      );
      specificPageBannerModel.findOneAndUpdate.mockReturnValue(makeQuery({}));
      storedMediaService.upload.mockResolvedValueOnce('new-shops.png');

      await service.updateSpecificPageBanner('all-shops', {
        image_1: {
          originalname: 'shops.png',
          mimetype: 'image/png',
          buffer: Buffer.from('png'),
        } as Express.Multer.File,
      });

      expect(storedMediaService.deleteStored).toHaveBeenCalledWith(
        'old-shops.png',
      );
      expect(storedMediaService.deleteStored).not.toHaveBeenCalledWith(
        'new-shops.png',
      );
    });

    it('updateSpecificPageBanner > when first creating keyed all-brands storage > preserves fallback media for rollback', async () => {
      const legacyUrl =
        'https://media.gogocash.co/banner-specific-page/legacy-all-brands.png';
      specificPageBannerModel.findOne.mockReturnValue(makeQuery(null));
      allBrandBannerModel.findOne.mockReturnValue(
        makeQuery({ image_1: legacyUrl }),
      );
      specificPageBannerModel.findOneAndUpdate.mockReturnValue(makeQuery({}));
      storedMediaService.upload.mockResolvedValueOnce('new-all-brands.png');

      await service.updateSpecificPageBanner('all-brands', {
        image_1: {
          originalname: 'brands.png',
          mimetype: 'image/png',
          buffer: Buffer.from('png'),
        } as Express.Multer.File,
      });

      expect(storedMediaService.deleteStored).not.toHaveBeenCalledWith(
        legacyUrl,
      );
      expect(storedMediaService.deleteStored).not.toHaveBeenCalledWith(
        'new-all-brands.png',
      );
      expect(specificPageBannerModel.findOneAndUpdate).toHaveBeenCalledWith(
        { target: 'all-brands' },
        expect.objectContaining({
          $set: expect.objectContaining({ image_1: 'new-all-brands.png' }),
        }),
        { upsert: true, new: true },
      );
    });

    it('updateSpecificPageBanner > when Mongo persistence fails > rolls back the new upload and preserves the old image', async () => {
      specificPageBannerModel.findOne.mockReturnValue(
        makeQuery({ target: 'all-shops', image_1: 'old-shops.png' }),
      );
      const failedWrite = makeQuery(null);
      failedWrite.exec.mockRejectedValue(new Error('mongo unavailable'));
      specificPageBannerModel.findOneAndUpdate.mockReturnValue(failedWrite);
      storedMediaService.upload.mockResolvedValueOnce('new-shops.png');

      await expect(
        service.updateSpecificPageBanner('all-shops', {
          image_1: {
            originalname: 'shops.png',
            mimetype: 'image/png',
            buffer: Buffer.from('png'),
          } as Express.Multer.File,
        }),
      ).rejects.toThrow('mongo unavailable');

      expect(storedMediaService.deleteStored).toHaveBeenCalledWith(
        'new-shops.png',
      );
      expect(storedMediaService.deleteStored).not.toHaveBeenCalledWith(
        'old-shops.png',
      );
    });

    it('updateSpecificPageBanner > given an unknown target > then rejects before querying Mongo', async () => {
      await expect(
        service.updateSpecificPageBanner('homepage', {} as never),
      ).rejects.toThrow('Unknown specific page banner target');

      expect(specificPageBannerModel.findOne).not.toHaveBeenCalled();
    });

    it('getSpecificPageBanner > given all-brands exists in keyed storage > then new storage wins', async () => {
      const banner = { target: 'all-brands', image_1: 'new.png' };
      specificPageBannerModel.findOne.mockReturnValue(makeQuery(banner));

      await expect(
        service.getSpecificPageBanner('all-brands'),
      ).resolves.toEqual(banner);

      expect(specificPageBannerModel.findOne).toHaveBeenCalledWith({
        target: 'all-brands',
      });
      expect(allBrandBannerModel.findOne).not.toHaveBeenCalled();
    });

    it('getSpecificPageBanner > given keyed all-brands is absent > then falls back to the legacy collection', async () => {
      const legacy = { image_1: 'legacy.png', link_1: '/legacy' };
      specificPageBannerModel.findOne.mockReturnValue(makeQuery(null));
      allBrandBannerModel.findOne.mockReturnValue(makeQuery(legacy));

      await expect(
        service.getSpecificPageBanner('all-brands'),
      ).resolves.toEqual(legacy);

      expect(allBrandBannerModel.findOne).toHaveBeenCalledTimes(1);
    });

    it('updateAllBrandBanner > legacy alias writes the new keyed collection only', async () => {
      specificPageBannerModel.findOne.mockReturnValue(makeQuery(null));
      allBrandBannerModel.findOne.mockReturnValue(
        makeQuery({ image_2: 'legacy.png', link_2: '/legacy' }),
      );
      specificPageBannerModel.findOneAndUpdate.mockReturnValue(
        makeQuery({ target: 'all-brands' }),
      );

      await service.updateAllBrandBanner({ link_1: '/brand/promo' } as never);

      expect(specificPageBannerModel.findOneAndUpdate).toHaveBeenCalledWith(
        { target: 'all-brands' },
        expect.objectContaining({
          $set: expect.objectContaining({
            image_2: 'legacy.png',
            link_2: '/legacy',
          }),
        }),
        { upsert: true, new: true },
      );
      expect(allBrandBannerModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('updateBannerHome > given clear_image is the string false > then it does not delete the image', async () => {
      bannerModel.findOne.mockReturnValue(
        makeQuery({ image_1: 'existing.png', link_1: '/promo' }),
      );
      bannerModel.findOneAndUpdate.mockReturnValue(makeQuery({}));

      await service.updateBannerHome({
        clear_image_1: 'false',
        image_1: null,
      } as never);

      expect(storedMediaService.deleteStored).not.toHaveBeenCalled();
      const [, update] = bannerModel.findOneAndUpdate.mock.calls[0];
      expect(update.$set.image_1).toBe('existing.png');
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
    // Only ordered identities are persisted. Customer cashback is read from the
    // live offer so stale or forged labels cannot reach the homepage.
    beforeEach(() => {
      // #479 — eligibility lookup defaults to active offers for every requested id.
      offerModel.find.mockImplementation(
        (filter: { _id?: { $in?: unknown[] } }) => {
          const ids = (filter?._id?.$in ?? []).map(String);
          return makeQuery(
            ids.map((id) => ({ _id: id, disabled: false, status: 'approved' })),
          );
        },
      );
    });

    it('saveTopBrands > given curated brand entries > then it upserts identities without editable cashback', async () => {
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
      const persistedBrands = [
        { offerId: 'offer-1', cashback: '' },
        { offerId: 'offer-2', cashback: '' },
      ];
      expect(update.$set).toEqual({
        brands: persistedBrands,
        brandsDesktop: persistedBrands,
        brandsMobile: persistedBrands,
      });
      expect(opts).toEqual({ upsert: true });
      expect(result).toEqual({
        success: true,
        brands: persistedBrands,
        brandsDesktop: persistedBrands,
        brandsMobile: persistedBrands,
      });
    });

    it('saveTopBrands > given a forged cashback label > then discards it', async () => {
      topBrandConfigModel.updateOne.mockResolvedValue({ acknowledged: true });

      await service.saveTopBrands([
        { offerId: 'offer-1', cashback: 'Up to 2.02%' },
      ]);

      const update = topBrandConfigModel.updateOne.mock.calls[0][1];
      expect(update.$set.brands).toEqual([
        { offerId: 'offer-1', cashback: '' },
      ]);
    });

    it('saveTopBrands > given more than the configured maximum > then rejects before persistence', async () => {
      await expect(
        service.saveTopBrands(
          Array.from({ length: 17 }, (_, index) => ({
            offerId: `offer-${index}`,
            cashback: '',
          })),
        ),
      ).rejects.toMatchObject({ status: 400 });
      expect(topBrandConfigModel.updateOne).not.toHaveBeenCalled();
    });

    it('#479 saveTopBrands > given a disabled offer id > then rejects before persistence', async () => {
      offerModel.find.mockReturnValue(
        makeQuery([{ _id: 'offer-1', disabled: true, status: 'approved' }]),
      );

      await expect(
        service.saveTopBrands([{ offerId: 'offer-1', cashback: '' }]),
      ).rejects.toMatchObject({ status: 400 });
      expect(topBrandConfigModel.updateOne).not.toHaveBeenCalled();
    });

    it('#378 saveTopBrands > given independent device lists > then persists both and mirrors desktop into brands', async () => {
      topBrandConfigModel.updateOne.mockResolvedValue({ acknowledged: true });
      const brandsDesktop = [
        { offerId: 'd1', cashback: 'x' },
        { offerId: 'd2', cashback: 'y' },
      ];
      const brandsMobile = [{ offerId: 'm1', cashback: 'z' }];

      const result = await service.saveTopBrands({
        brandsDesktop,
        brandsMobile,
      });

      const persistedDesktop = [
        { offerId: 'd1', cashback: '' },
        { offerId: 'd2', cashback: '' },
      ];
      const persistedMobile = [{ offerId: 'm1', cashback: '' }];
      expect(topBrandConfigModel.updateOne.mock.calls[0][1].$set).toEqual({
        brands: persistedDesktop,
        brandsDesktop: persistedDesktop,
        brandsMobile: persistedMobile,
      });
      expect(result).toEqual({
        success: true,
        brands: persistedDesktop,
        brandsDesktop: persistedDesktop,
        brandsMobile: persistedMobile,
      });
    });
  });

  describe('saveLandingRails', () => {
    beforeEach(() => {
      offerModel.find.mockImplementation(
        (filter: { _id?: { $in?: unknown[] } }) => {
          const ids = (filter?._id?.$in ?? []).map(String);
          return makeQuery(
            ids.map((id) => ({ _id: id, disabled: false, status: 'approved' })),
          );
        },
      );
    });

    it('saveLandingRails > given rails > then upserts each by railId and drops removed rails', async () => {
      const result = await service.saveLandingRails({
        rails: [
          {
            railId: 'Trending',
            title: 'Trending Brands',
            link: '/brand',
            position: 1,
            brandsDesktop: [{ offerId: 'offer-1', cashback: 'forged' }],
          },
          {
            railId: 'travel',
            title: 'Travel Deals are Here!',
            emoji: '✈️',
            position: 0,
            brandsDesktop: [{ offerId: 'offer-2', cashback: 'forged' }],
            brandsMobile: [{ offerId: 'offer-2', cashback: 'forged' }],
          },
        ],
      });

      // replace-set: deleteMany keeps only the two railIds sent.
      expect(landingRailConfigModel.deleteMany).toHaveBeenCalledWith({
        railId: { $nin: ['travel', 'trending'] },
      });
      // one upsert per rail
      expect(landingRailConfigModel.updateOne).toHaveBeenCalledTimes(2);
      const travelUpdate = landingRailConfigModel.updateOne.mock.calls.find(
        (call: any[]) => call[0].railId === 'travel',
      );
      expect(travelUpdate[2]).toEqual({ upsert: true });
      // cashback is never trusted from the client
      expect(travelUpdate[1].$set.brandsDesktop).toEqual([
        { offerId: 'offer-2', cashback: '' },
      ]);
      // sorted by position ⇒ travel(0) before trending(1)
      expect(result.rails.map((r) => r.railId)).toEqual(['travel', 'trending']);
      expect(result.success).toBe(true);
    });

    it('saveLandingRails > given a disabled offer > then rejects the save', async () => {
      offerModel.find.mockReturnValue(
        makeQuery([{ _id: 'offer-x', disabled: true, status: 'approved' }]),
      );

      await expect(
        service.saveLandingRails({
          rails: [
            {
              railId: 'trending',
              title: 'Trending',
              brandsDesktop: [{ offerId: 'offer-x', cashback: '' }],
            },
          ],
        }),
      ).rejects.toThrow(/Disabled or missing offers/);
      expect(landingRailConfigModel.updateOne).not.toHaveBeenCalled();
    });
  });

  describe('getLandingRails', () => {
    it('getLandingRails > given saved rails > then returns them ordered with live cashback', async () => {
      landingRailConfigModel.find.mockReturnValue(
        makeQuery([
          {
            railId: 'trending',
            title: 'Trending Brands',
            position: 1,
            brandsDesktop: [{ offerId: 'offer-1', cashback: 'stale' }],
            brandsMobile: [],
          },
          {
            railId: 'travel',
            title: 'Travel Deals are Here!',
            emoji: '✈️',
            position: 0,
            brandsDesktop: [{ offerId: 'offer-2', cashback: 'stale' }],
            brandsMobile: [{ offerId: 'offer-2', cashback: 'stale' }],
          },
        ]),
      );
      offerModel.find.mockReturnValue(
        makeQuery([
          {
            _id: 'offer-1',
            offer_id: 1,
            offer_name: 'Alpha',
            commission_store: 8,
          },
          {
            _id: 'offer-2',
            offer_id: 2,
            offer_name: 'Bravo',
            commission_store: 12,
          },
        ]),
      );

      const result = await service.getLandingRails();

      expect(result.rails.map((r) => r.railId)).toEqual(['travel', 'trending']);
      const travel = result.rails[0];
      expect(travel.emoji).toBe('✈️');
      expect(travel.brandsDesktop).toEqual([
        { offerId: 'offer-2', cashback: '12%' },
      ]);
      expect(result.maxRails).toBeGreaterThan(0);
      expect(result.maxBrands).toBeGreaterThan(0);
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
        commission_store: 8,
      };
      const offer2 = {
        _id: 'offer-2',
        offer_name: 'Adidas',
        logo: 'adidas.png',
        commission_store: 12,
      };

      topBrandConfigModel.findOne.mockReturnValue(makeQuery({ brands }));
      offerModel.find.mockReturnValue(makeQuery([offer1, offer2]));

      const result = await service.getTopBrands();

      expect(offerModel.find).toHaveBeenCalledWith({
        _id: { $in: ['offer-2', 'missing-offer', 'offer-1'] },
      });
      expect(result).toEqual({
        order: ['offer-2', 'missing-offer', 'offer-1'],
        orderDesktop: ['offer-2', 'missing-offer', 'offer-1'],
        orderMobile: ['offer-2', 'missing-offer', 'offer-1'],
        brands: [
          { offerId: 'offer-2', cashback: '12%' },
          { offerId: 'missing-offer', cashback: '' },
          { offerId: 'offer-1', cashback: '8%' },
        ],
        brandsDesktop: [
          { offerId: 'offer-2', cashback: '12%' },
          { offerId: 'missing-offer', cashback: '' },
          { offerId: 'offer-1', cashback: '8%' },
        ],
        brandsMobile: [
          { offerId: 'offer-2', cashback: '12%' },
          { offerId: 'missing-offer', cashback: '' },
          { offerId: 'offer-1', cashback: '8%' },
        ],
        items: [offer2, offer1],
        maxBrands: 16,
      });
    });

    it('getTopBrands > given no saved config > then returns an empty editable config and skips offer lookup', async () => {
      topBrandConfigModel.findOne.mockReturnValue(makeQuery(null));

      await expect(service.getTopBrands()).resolves.toEqual({
        order: [],
        orderDesktop: [],
        orderMobile: [],
        brands: [],
        brandsDesktop: [],
        brandsMobile: [],
        items: [],
        maxBrands: 16,
      });
      expect(offerModel.find).not.toHaveBeenCalled();
    });

    it('#378 getTopBrands > given independent device lists > then returns divergent orders', async () => {
      const offer1 = { _id: 'd1', offer_name: 'Desk', commission_store: 1 };
      const offer2 = { _id: 'm1', offer_name: 'Mob', commission_store: 2 };
      topBrandConfigModel.findOne.mockReturnValue(
        makeQuery({
          brands: [{ offerId: 'legacy' }],
          brandsDesktop: [{ offerId: 'd1' }],
          brandsMobile: [{ offerId: 'm1' }],
        }),
      );
      offerModel.find.mockReturnValue(makeQuery([offer1, offer2]));

      const result = await service.getTopBrands();

      expect(result.orderDesktop).toEqual(['d1']);
      expect(result.orderMobile).toEqual(['m1']);
      expect(result.order).toEqual(['d1']);
      expect(result.items).toEqual([offer1, offer2]);
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
    it('getMyCashBackUser > given a UserMyCashback ObjectId > then it returns that row as an array', async () => {
      const mcbId = '60583a4d1325b29fd914af5b';
      const row = { _id: mcbId, buyerId: 'tmn.1', balance: [{ amount: 1 }] };
      userMyCashbackModel.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(row),
          }),
        }),
      });

      const result = await service.getMyCashBackUser(mcbId);

      expect(userMyCashbackModel.findById).toHaveBeenCalledWith(mcbId);
      expect(userService.getBalanceMyCashback).not.toHaveBeenCalled();
      expect(result).toEqual([row]);
    });

    it('getMyCashBackUser > given an app user id > then it returns the userMyCashback list from the user service', async () => {
      userMyCashbackModel.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(null),
          }),
        }),
      });
      userService.getBalanceMyCashback.mockResolvedValue({
        userMyCashback: [{ balance: 42 }],
      });

      const result = await service.getMyCashBackUser(
        '60583a4d1325b29fd914af5b',
      );

      expect(userService.getBalanceMyCashback).toHaveBeenCalledWith(
        '60583a4d1325b29fd914af5b',
      );
      expect(result).toEqual([{ balance: 42 }]);
    });

    it('getMyCashBackUser > given user-service UnauthorizedException > then it returns [] (never 401)', async () => {
      userMyCashbackModel.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(null),
          }),
        }),
      });
      userService.getBalanceMyCashback.mockRejectedValue(
        new UnauthorizedException('User not found'),
      );

      await expect(
        service.getMyCashBackUser('60583a4d1325b29fd914af5b'),
      ).resolves.toEqual([]);
    });
  });

  describe('listMyCashbackUsers', () => {
    beforeEach(() => {
      userMyCashbackModel.find = jest.fn();
      userMyCashbackModel.countDocuments = jest.fn();
      userMyCashbackModel.aggregate = jest.fn();
    });

    it('listMyCashbackUsers > given defaults > then it pages with limit 12 and newest sort', async () => {
      const findQuery = makeQuery([{ _id: 'mcb-1' }]);
      userMyCashbackModel.find.mockReturnValue(findQuery);
      userMyCashbackModel.countDocuments.mockReturnValue(makeQuery(1));

      const result = await service.listMyCashbackUsers();

      expect(userMyCashbackModel.find).toHaveBeenCalledWith({});
      expect(findQuery.select).toHaveBeenCalledWith(
        '-withdrawalPassword -buyerToken',
      );
      expect(findQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(findQuery.skip).toHaveBeenCalledWith(0);
      expect(findQuery.limit).toHaveBeenCalledWith(12);
      expect(result).toEqual({
        status: 'success',
        data: [{ _id: 'mcb-1' }],
        pagination: { page: 1, limit: 12, total: 1, totalPages: 1 },
      });
    });

    it('listMyCashbackUsers > given search + banned status + name sort > then it builds the filter and sort', async () => {
      const findQuery = makeQuery([]);
      userMyCashbackModel.find.mockReturnValue(findQuery);
      userMyCashbackModel.countDocuments.mockReturnValue(makeQuery(0));

      await service.listMyCashbackUsers({
        page: 2,
        limit: 20,
        search: 'a.*',
        sort: 'name',
        status: 'banned',
      });

      expect(userMyCashbackModel.find).toHaveBeenCalledWith({
        banned: true,
        $or: [
          { email: { $regex: 'a\\.\\*', $options: 'i' } },
          { phoneNumber: { $regex: 'a\\.\\*', $options: 'i' } },
          { buyerId: { $regex: 'a\\.\\*', $options: 'i' } },
          { firstName: { $regex: 'a\\.\\*', $options: 'i' } },
          { lastName: { $regex: 'a\\.\\*', $options: 'i' } },
        ],
      });
      expect(findQuery.sort).toHaveBeenCalledWith({
        firstName: 1,
        lastName: 1,
        email: 1,
      });
      expect(findQuery.skip).toHaveBeenCalledWith(20);
      expect(findQuery.limit).toHaveBeenCalledWith(20);
    });

    it('listMyCashbackUsers > given balance sort > then it aggregates by summed balance amounts', async () => {
      const aggregateQuery = makeQuery([{ _id: 'mcb-rich' }]);
      userMyCashbackModel.aggregate.mockReturnValue(aggregateQuery);
      userMyCashbackModel.countDocuments.mockReturnValue(makeQuery(1));

      const result = await service.listMyCashbackUsers({
        status: 'active',
        sort: 'balance',
        page: 2,
        limit: 5,
      });

      expect(userMyCashbackModel.find).not.toHaveBeenCalled();
      expect(userMyCashbackModel.aggregate).toHaveBeenCalledWith([
        { $match: { banned: { $ne: true } } },
        {
          $addFields: {
            _balanceTotal: {
              $sum: {
                $map: {
                  input: { $ifNull: ['$balance', []] },
                  as: 'b',
                  in: { $ifNull: ['$$b.amount', 0] },
                },
              },
            },
          },
        },
        { $sort: { _balanceTotal: -1, createdAt: -1 } },
        { $skip: 5 },
        { $limit: 5 },
        {
          $project: {
            withdrawalPassword: 0,
            buyerToken: 0,
            _balanceTotal: 0,
          },
        },
      ]);
      expect(result).toEqual({
        status: 'success',
        data: [{ _id: 'mcb-rich' }],
        pagination: { page: 2, limit: 5, total: 1, totalPages: 1 },
      });
    });

    it('listMyCashbackUsers > given a 24-char hex search > then it matches _id and publisherId', async () => {
      const findQuery = makeQuery([]);
      userMyCashbackModel.find.mockReturnValue(findQuery);
      userMyCashbackModel.countDocuments.mockReturnValue(makeQuery(0));
      const hex = '507f1f77bcf86cd799439011';
      const objectId = new Types.ObjectId(hex);

      await service.listMyCashbackUsers({ search: hex });

      expect(userMyCashbackModel.find).toHaveBeenCalledWith({
        $or: expect.arrayContaining([
          { _id: objectId },
          { publisherId: objectId },
        ]),
      });
    });

    it('listMyCashbackUsers > given a 12-char non-hex search > then it does not coerce ObjectId', async () => {
      const findQuery = makeQuery([]);
      userMyCashbackModel.find.mockReturnValue(findQuery);
      userMyCashbackModel.countDocuments.mockReturnValue(makeQuery(0));

      await service.listMyCashbackUsers({ search: 'abcdefghijkl' });

      const filter = userMyCashbackModel.find.mock.calls[0][0] as {
        $or: Array<Record<string, unknown>>;
      };
      expect(filter.$or.some((clause) => '_id' in clause)).toBe(false);
      expect(filter.$or.some((clause) => 'publisherId' in clause)).toBe(false);
    });

    it('listMyCashbackUsers > given unknown sort > then it falls back to newest', async () => {
      const findQuery = makeQuery([]);
      userMyCashbackModel.find.mockReturnValue(findQuery);
      userMyCashbackModel.countDocuments.mockReturnValue(makeQuery(0));

      await service.listMyCashbackUsers({ sort: 'not-a-sort' });

      expect(findQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });

    it('listMyCashbackUsers > given empty result set > then totalPages is 0', async () => {
      const findQuery = makeQuery([]);
      userMyCashbackModel.find.mockReturnValue(findQuery);
      userMyCashbackModel.countDocuments.mockReturnValue(makeQuery(0));

      const result = await service.listMyCashbackUsers();

      expect(result.pagination.totalPages).toBe(0);
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
