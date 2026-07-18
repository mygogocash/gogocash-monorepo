import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WithdrawService } from '../src/withdraw/withdraw.service';
import { User, UserSchema } from '../src/user/schemas/user.schema';
import {
  Withdraw,
  WithdrawSchema,
} from '../src/withdraw/schemas/withdraw.schema';
import { FeeRate, FeeRateSchema } from '../src/withdraw/schemas/feeRate.schema';
import { Offer, OfferSchema } from '../src/offer/schemas/offer.schema';
import {
  Conversion,
  ConversionSchema,
} from '../src/withdraw/schemas/conversion.schema';
import {
  RewardList,
  RewardListSchema,
} from '../src/withdraw/schemas/rewardList.schema';
import { Quest, QuestSchema } from '../src/point/schemas/quest.schema';
import {
  WithdrawMethod,
  WithdrawMethodSchema,
} from '../src/withdraw/schemas/withdrawMethod.schema';
import {
  UserMyCashback,
  UserMyCashbackSchema,
} from '../src/user/schemas/user-my-cashback.schema';
import { InvolveService } from '../src/involve/involve.service';
import { PointService } from '../src/point/point.service';
import {
  WithdrawFeeCoupon,
  WithdrawFeeCouponSchema,
} from '../src/withdraw/schemas/withdraw-fee-coupon.schema';
import {
  WithdrawFeeCouponRedemption,
  WithdrawFeeCouponRedemptionSchema,
} from '../src/withdraw/schemas/withdraw-fee-coupon-redemption.schema';
import {
  WalletAdjustment,
  WalletAdjustmentSchema,
} from '../src/admin/wallets/schemas/wallet-adjustment.schema';
import { AdminActivityService } from '../src/admin/activity/admin-activity.service';

/**
 * Integration test for the withdraw balance aggregation (checkWithdraw) against
 * a REAL Mongo 7 / mongoose 9 — closes the #36 gap that unit tests (model mocks)
 * can't cover: mongoose-9 flipped strictQuery/sanitizeFilter defaults and
 * reworked find/lean, exactly the surface this money path relies on.
 *
 * Runs only when MONGO_URI is set (CI provides a mongo:7 service; locally:
 * `MONGO_URI=mongodb://localhost:27018/inttest npm run test:e2e`). FX is stubbed
 * (separately covered by P1-FX) so the assertion stays deterministic and offline.
 */
const MONGO_URI = process.env.MONGO_URI;
const suite = MONGO_URI ? describe : describe.skip;

suite('checkWithdraw — real Mongo aggregation (#36)', () => {
  let app: INestApplication;
  let service: WithdrawService;
  let userModel: Model<User>;
  let conversionModel: Model<Conversion>;
  let feeRateModel: Model<FeeRate>;
  let withdrawModel: Model<Withdraw>;
  const chainEnv = {
    CHAIN_ID_WITHDRAW_POLYGON: '137',
    CONTRACT_WITHDRAW_ADDRESS_POLYGON: `0x${'1'.repeat(40)}`,
    PRIVATE_KEY_WITHDRAW: `0x${'2'.repeat(64)}`,
    RPC_URL_POLYGON: 'https://polygon.invalid',
  };
  const originalChainEnv = Object.fromEntries(
    Object.keys(chainEnv).map((key) => [key, process.env[key]]),
  );

  beforeAll(async () => {
    Object.assign(process.env, chainEnv);
    const moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(MONGO_URI as string),
        MongooseModule.forFeature([
          { name: User.name, schema: UserSchema },
          { name: Withdraw.name, schema: WithdrawSchema },
          { name: FeeRate.name, schema: FeeRateSchema },
          { name: Offer.name, schema: OfferSchema },
          { name: Conversion.name, schema: ConversionSchema },
          { name: RewardList.name, schema: RewardListSchema },
          { name: Quest.name, schema: QuestSchema },
          { name: WithdrawMethod.name, schema: WithdrawMethodSchema },
          { name: UserMyCashback.name, schema: UserMyCashbackSchema },
          {
            name: WithdrawFeeCoupon.name,
            schema: WithdrawFeeCouponSchema,
          },
          {
            name: WithdrawFeeCouponRedemption.name,
            schema: WithdrawFeeCouponRedemptionSchema,
          },
          {
            name: WalletAdjustment.name,
            schema: WalletAdjustmentSchema,
          },
        ]),
      ],
      providers: [
        WithdrawService,
        { provide: InvolveService, useValue: {} },
        { provide: PointService, useValue: {} },
        {
          provide: AdminActivityService,
          useValue: { append: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    service = moduleRef.get(WithdrawService);
    userModel = moduleRef.get(getModelToken(User.name));
    conversionModel = moduleRef.get(getModelToken(Conversion.name));
    feeRateModel = moduleRef.get(getModelToken(FeeRate.name));
    withdrawModel = moduleRef.get(getModelToken(Withdraw.name));

    // Cross-currency conversion hits an external FX API (covered by P1-FX). Stub
    // it identity so this test stays offline + deterministic; THB->THB never
    // calls it anyway, which is what we assert on.
    jest
      .spyOn(service, 'convertCurrencyUsd')
      .mockImplementation(async (_c: string, amount: number) => ({
        usdAmount: amount,
        exchangeRate: 1,
      }));
    jest
      .spyOn(service, 'convertCurrencyThb')
      .mockImplementation(async (_c: string, amount: number) => ({
        amount,
        exchangeRate: 1,
      }));
  });

  const testUserFilter = { id_firebase: { $regex: '^int-fb-' } };

  async function cleanupWithdrawTestData(): Promise<void> {
    const testUsers = await userModel.find(testUserFilter).select('_id').lean();
    const testUserIds = testUsers.map((user) => user._id);
    if (testUserIds.length === 0) {
      return;
    }
    const affSubFilters = testUserIds.map(
      (userId) => `user_id:${userId.toString()}`,
    );
    await Promise.all([
      userModel.deleteMany({ _id: { $in: testUserIds } }),
      conversionModel.deleteMany({
        $or: [
          { user_id: { $in: testUserIds } },
          { aff_sub1: { $in: affSubFilters } },
        ],
      }),
      withdrawModel.deleteMany({ user_id: { $in: testUserIds } }),
    ]);
  }

  afterAll(async () => {
    await cleanupWithdrawTestData();
    if (app) await app.close();
    for (const [key, value] of Object.entries(originalChainEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  beforeEach(async () => {
    await cleanupWithdrawTestData();
    await feeRateModel.findOneAndUpdate(
      {},
      {
        $set: {
          system: 5,
          store: 5,
          max_cap: 100_000,
          fee_withdraw_thb: 0,
          fee_withdraw_usd: 0,
          minimum_withdraw_thb: 1,
          minimum_withdraw_usd: 1,
        },
      },
      { upsert: true },
    );
  });

  const seedApprovedThb = async (
    userId: string,
    payout: number,
    n: number,
    withIndexedUserId = false,
  ) => {
    const docs = Array.from({ length: n }, (_, i) => ({
      conversion_id: Date.now() + i,
      offer_id: 1,
      offer_name: 'shopee',
      merchant_id: 1,
      aff_sub1: `user_id:${userId}`,
      ...(withIndexedUserId
        ? { user_id: new Types.ObjectId(userId) }
        : undefined),
      conversion_status: 'approved',
      currency: 'THB',
      payout,
      sale_amount: payout * 10,
      datetime_conversion: new Date(),
    }));
    await conversionModel.create(docs);
    return docs.map((doc) => doc.conversion_id);
  };

  it('reconciles approved THB conversions minus the system fee into netAmountTHB', async () => {
    const user = await userModel.create({
      id_firebase: 'int-fb-1',
      email: 'int1@gogocash.co',
    });
    const userId = user._id.toString();
    await seedApprovedThb(userId, 100, 2); // 2 × (100 − 5%) = 190

    const result = await service.checkWithdraw(userId);

    expect(result.netAmountTHB).toBeCloseTo(190, 5);
  });

  it('subtracts an outstanding pending withdrawal from the available balance', async () => {
    const user = await userModel.create({
      id_firebase: 'int-fb-2',
      email: 'int2@gogocash.co',
    });
    const userId = user._id.toString();
    await seedApprovedThb(userId, 100, 2); // 190 available
    await withdrawModel.create({
      user_id: new Types.ObjectId(userId),
      status: 'pending',
      currency: 'THB',
      amount_total: 50,
      amount_net: 50,
      method: 'bank_transfer',
      percent_fee: 0,
      mycashback_id: [],
      conversion_id: [],
    });

    const result = await service.checkWithdraw(userId);

    // 190 earned − 50 reserved by the pending withdrawal = 140.
    expect(result.netAmountTHB).toBeCloseTo(140, 5);
  });

  it('does not leak another user’s conversions into the balance (aff_sub1 scoping)', async () => {
    const me = await userModel.create({ id_firebase: 'int-fb-3a' });
    const other = await userModel.create({ id_firebase: 'int-fb-3b' });
    await seedApprovedThb(me._id.toString(), 100, 1); // 95 for me
    await seedApprovedThb(other._id.toString(), 100, 3); // 285 for the other

    const result = await service.checkWithdraw(me._id.toString());

    expect(result.netAmountTHB).toBeCloseTo(95, 5);
  });

  it('reconciles balances when conversions are indexed by user_id (P1-COLLSCAN read path)', async () => {
    const user = await userModel.create({
      id_firebase: 'int-fb-indexed',
      email: 'indexed@gogocash.co',
    });
    const userId = user._id.toString();
    await seedApprovedThb(userId, 100, 2, true);

    const result = await service.checkWithdraw(userId);

    expect(result.netAmountTHB).toBeCloseTo(190, 5);
  });

  // Transactions require a replica set. Gated on MONGO_REPLICA_SET so the
  // standalone Mongo used elsewhere (incl. the CI service) skips it; run with a
  // single-node RS:  MONGO_REPLICA_SET=1 MONGO_URI=mongodb://localhost:27019/...
  const rsOnly = process.env.MONGO_REPLICA_SET === '1' ? it : it.skip;

  rsOnly(
    'serializes two concurrent bank-transfers so only one passes the balance gate (P1-TX)',
    async () => {
      const user = await userModel.create({
        id_firebase: 'int-fb-tx',
        email: 'tx@gogocash.co',
      });
      const userId = user._id.toString();
      await seedApprovedThb(userId, 105, 1); // ~99.75 available after the 5% fee

      // Two simultaneous 60-THB requests: 60 fits, but 60+60=120 does not.
      const dto = {
        account_name: 'Integration User',
        account_number: '0012345678',
        amount_net: 60,
        amount_total: 60,
        bank_name: 'KBANK',
        currency: 'THB',
      };
      const results = await Promise.allSettled([
        service.createBankTransfer(dto as never, userId, 'bank-race-a'),
        service.createBankTransfer(dto as never, userId, 'bank-race-b'),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');
      expect(fulfilled).toHaveLength(1); // exactly one wins
      expect(rejected).toHaveLength(1); // the other is refused (over balance)

      const count = await withdrawModel.countDocuments({
        user_id: new Types.ObjectId(userId),
      });
      expect(count).toBe(1); // and only one record was actually written
    },
  );

  rsOnly(
    'serializes two concurrent on-chain withdrawals so only one passes the balance gate (#41)',
    async () => {
      jest
        .spyOn(service, 'createRecordOnChain')
        .mockResolvedValue('0xonchainhash');

      const user = await userModel.create({
        id_firebase: 'int-fb-onchain-tx',
        email: 'onchain-tx@gogocash.co',
      });
      const userId = user._id.toString();
      const [conversionId] = await seedApprovedThb(userId, 105, 1); // ~99.75 available after the 5% fee

      const dto = {
        amount_net: 60,
        amount_total: 60,
        currency: 'THB',
        chain: 137,
        conversion_ids: [conversionId],
        method: 'metamask',
      };
      const results = await Promise.allSettled([
        service.create(dto as never, userId, 'onchain-race-a'),
        service.create(dto as never, userId, 'onchain-race-b'),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);

      const count = await withdrawModel.countDocuments({
        user_id: new Types.ObjectId(userId),
        status: { $in: ['pending', 'approved', 'paid'] },
      });
      expect(count).toBe(1);
    },
  );
});
