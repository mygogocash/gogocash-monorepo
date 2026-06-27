import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  MongooseModule,
  getModelToken,
  getConnectionToken,
} from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
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
import { CustomerIoService } from '../src/customer-io/customer-io.service';

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
  let conn: Connection;
  let userModel: Model<User>;
  let conversionModel: Model<Conversion>;
  let feeRateModel: Model<FeeRate>;
  let withdrawModel: Model<Withdraw>;

  beforeAll(async () => {
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
        ]),
      ],
      providers: [
        WithdrawService,
        { provide: InvolveService, useValue: {} },
        { provide: PointService, useValue: {} },
        {
          provide: CustomerIoService,
          useValue: { track: async () => undefined },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    service = moduleRef.get(WithdrawService);
    conn = moduleRef.get(getConnectionToken());
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

  afterAll(async () => {
    if (conn) await conn.dropDatabase();
    if (app) await app.close();
  });

  beforeEach(async () => {
    await Promise.all([
      userModel.deleteMany({}),
      conversionModel.deleteMany({}),
      feeRateModel.deleteMany({}),
      withdrawModel.deleteMany({}),
    ]);
    await feeRateModel.create({
      system: 5, // 5% system fee
      store: 5,
      max_cap: 100_000,
      fee_withdraw_thb: 0,
      fee_withdraw_usd: 0,
      minimum_withdraw_thb: 1,
      minimum_withdraw_usd: 1,
    });
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
      const dto = { amount_net: 60, amount_total: 60, currency: 'THB' };
      const results = await Promise.allSettled([
        service.createBankTransfer(dto as never, userId),
        service.createBankTransfer(dto as never, userId),
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
      await seedApprovedThb(userId, 105, 1); // ~99.75 available after the 5% fee

      const dto = {
        amount_net: 60,
        amount_total: 60,
        currency: 'THB',
        chain: 137,
        conversion_ids: [1],
      };
      const results = await Promise.allSettled([
        service.create(dto as never, userId),
        service.create(dto as never, userId),
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
