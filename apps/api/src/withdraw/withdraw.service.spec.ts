import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { WithdrawService } from './withdraw.service';
import { User } from 'src/user/schemas/user.schema';
import { Withdraw } from './schemas/withdraw.schema';
import { FeeRate } from './schemas/feeRate.schema';
import { Offer } from 'src/offer/schemas/offer.schema';
import { Conversion } from './schemas/conversion.schema';
import { RewardList } from './schemas/rewardList.schema';
import { Quest } from 'src/point/schemas/quest.schema';
import { WithdrawMethod } from './schemas/withdrawMethod.schema';
import { UserMyCashback } from 'src/user/schemas/user-my-cashback.schema';
import { WithdrawFeeCoupon } from './schemas/withdraw-fee-coupon.schema';
import { WithdrawFeeCouponRedemption } from './schemas/withdraw-fee-coupon-redemption.schema';
import { InvolveService } from 'src/involve/involve.service';
import { PointService } from 'src/point/point.service';
import { thaiBanks } from 'src/utils/helper';
import {
  legacyQuestPayoutConfigChecksum,
  legacyRewardManifestHash,
  legacyRewardManifestKey,
} from 'src/tasks/legacy-reward-manifest';
import { legacyRankPayoutKey } from 'src/tasks/legacy-reward-identity';

/**
 * Partial mongoose-model mock shape. Every method the SUT touches is a
 * jest.fn() so a single test can stub the exact return it needs without a
 * real DB (FIRST: fast + repeatable + no open handles).
 */
type ModelMock = Record<string, any>;

const makeModelMock = (): ModelMock => ({
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findOneAndDelete: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  updateOne: jest.fn(),
  countDocuments: jest.fn(),
  deleteOne: jest.fn(),
  aggregate: jest.fn(),
  exec: jest.fn(),
});

interface Mocks {
  service: WithdrawService;
  userModel: ModelMock;
  withdrawModel: ModelMock;
  feeRateModel: ModelMock;
  offerModel: ModelMock;
  conversionModel: ModelMock;
  rewardListModel: ModelMock;
  questModel: ModelMock;
  withdrawMethodModel: ModelMock;
  userMyCashbackModel: ModelMock;
  withdrawFeeCouponModel: ModelMock;
  withdrawFeeCouponRedemptionModel: ModelMock;
  involveService: { getConversionAll: jest.Mock };
  pointService: { getQuestRankListOfPoint: jest.Mock };
  legacyManifestCollection: { findOne: jest.Mock; updateOne: jest.Mock };
}

async function buildService(): Promise<Mocks> {
  const userModel = makeModelMock();
  const withdrawModel = makeModelMock();
  const feeRateModel = makeModelMock();
  const offerModel = makeModelMock();
  const conversionModel = makeModelMock();
  const rewardListModel = makeModelMock();
  const questModel = makeModelMock();
  const legacyManifestCollection = {
    findOne: jest.fn().mockResolvedValue(null),
    updateOne: jest
      .fn()
      .mockResolvedValue({ matchedCount: 1, modifiedCount: 1 }),
  };
  questModel.db = {
    collection: jest.fn().mockReturnValue(legacyManifestCollection),
  };
  const withdrawMethodModel = makeModelMock();
  const userMyCashbackModel = makeModelMock();
  const withdrawFeeCouponModel = makeModelMock();
  const withdrawFeeCouponRedemptionModel = makeModelMock();
  const involveService = { getConversionAll: jest.fn() };
  const pointService = { getQuestRankListOfPoint: jest.fn() };
  // Fake mongoose connection: withTransaction just runs the callback (the real
  // concurrency/serialization is proven in the replica-set integration test).
  const connection = {
    startSession: jest.fn().mockResolvedValue({
      withTransaction: async (cb: () => Promise<unknown>) => {
        await cb();
      },
      endSession: jest.fn().mockResolvedValue(undefined),
    }),
  };

  const moduleRef: TestingModule = await Test.createTestingModule({
    providers: [
      WithdrawService,
      { provide: getModelToken(User.name), useValue: userModel },
      { provide: getModelToken(Withdraw.name), useValue: withdrawModel },
      { provide: getModelToken(FeeRate.name), useValue: feeRateModel },
      { provide: getModelToken(Offer.name), useValue: offerModel },
      { provide: getModelToken(Conversion.name), useValue: conversionModel },
      { provide: getModelToken(RewardList.name), useValue: rewardListModel },
      { provide: getModelToken(Quest.name), useValue: questModel },
      {
        provide: getModelToken(WithdrawMethod.name),
        useValue: withdrawMethodModel,
      },
      {
        provide: getModelToken(UserMyCashback.name),
        useValue: userMyCashbackModel,
      },
      {
        provide: getModelToken(WithdrawFeeCoupon.name),
        useValue: withdrawFeeCouponModel,
      },
      {
        provide: getModelToken(WithdrawFeeCouponRedemption.name),
        useValue: withdrawFeeCouponRedemptionModel,
      },
      { provide: InvolveService, useValue: involveService },
      { provide: PointService, useValue: pointService },
      { provide: getConnectionToken(), useValue: connection },
    ],
  }).compile();

  return {
    service: moduleRef.get<WithdrawService>(WithdrawService),
    userModel,
    withdrawModel,
    feeRateModel,
    offerModel,
    conversionModel,
    rewardListModel,
    questModel,
    withdrawMethodModel,
    userMyCashbackModel,
    withdrawFeeCouponModel,
    withdrawFeeCouponRedemptionModel,
    involveService,
    pointService,
    legacyManifestCollection,
  };
}

const VALID_USER_ID = new Types.ObjectId().toString();
const VALID_WITHDRAW_ID = new Types.ObjectId().toString();
const VALID_ADDRESS = '0x' + 'a'.repeat(40);
const VALID_TX_HASH = '0x' + 'b'.repeat(64);

describe('WithdrawService', () => {
  let mocks: Mocks;

  beforeEach(async () => {
    mocks = await buildService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(mocks.service).toBeDefined();
  });

  it('createConversionReward marks the active admin reward writer as synthetic', async () => {
    const userId = new Types.ObjectId();
    mocks.userModel.findOne.mockResolvedValue({ _id: userId });
    mocks.conversionModel.create.mockImplementation(
      async (value: Record<string, unknown>) => value,
    );

    await mocks.service.createConversionReward({
      reward_type: 'Manual quest grant',
      reward_amount: 75,
      reward_currency: 'THB',
      user: '0812345678',
    });

    expect(mocks.conversionModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        offer_id: 0,
        offer_name: 'reward_conversion_quest',
        source: 'involve',
        quest_synthetic_reward: true,
        payout: 75,
        currency: 'THB',
        user_id: userId,
      }),
    );
  });

  // ---------------------------------------------------------------------------
  // createManualWithdrawRequest — the core money + balance-gate path.
  // ---------------------------------------------------------------------------
  describe('createManualWithdrawRequest', () => {
    const dto = {
      address: VALID_ADDRESS,
      currency: 'USDT' as const,
      amount: 50,
    };

    it('createManualWithdrawRequest > given an unknown user id > then throws UnauthorizedException and never writes a record', async () => {
      // An unresolved session must never be able to create a payout record.
      mocks.userModel.findOne.mockResolvedValue(null);

      await expect(
        mocks.service.createManualWithdrawRequest(dto, VALID_USER_ID),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(mocks.withdrawModel.create).not.toHaveBeenCalled();
    });

    it('createManualWithdrawRequest > given a user without an email > then rejects with HTTP 400 before any balance check', async () => {
      // The MiniPay flow couples to a blocking email modal; the server enforces
      // the same "email required" contract so a record is never created blind.
      mocks.userModel.findOne.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
        email: '   ',
      });

      await expect(
        mocks.service.createManualWithdrawRequest(dto, VALID_USER_ID),
      ).rejects.toMatchObject({
        response: { message: 'Email required before requesting a withdrawal' },
        status: 400,
      });
      expect(mocks.withdrawModel.create).not.toHaveBeenCalled();
    });

    it('createManualWithdrawRequest > given amount above available balance > then rejects with HTTP 400 and does not create a record', async () => {
      // Hard balance gate: requesting more than the reconciled available USD
      // payout must be refused — this is the line between solvent and overdrawn.
      mocks.userModel.findOne.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
        email: 'member@gogocash.co',
      });
      jest
        .spyOn(mocks.service, 'checkWithdraw')
        .mockResolvedValue({ netAmount: 10 } as never);

      await expect(
        mocks.service.createManualWithdrawRequest(
          { ...dto, amount: 50 },
          VALID_USER_ID,
        ),
      ).rejects.toMatchObject({ status: 400 });
      expect(mocks.withdrawModel.create).not.toHaveBeenCalled();
    });

    it('createManualWithdrawRequest > given amount within balance > then persists a CELO manual-mode pending record and returns it', async () => {
      // Happy path: chain is locked to CELO and mode to manual server-side; the
      // persisted amount_total/amount_net must equal the requested amount.
      mocks.userModel.findOne.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
        email: 'member@gogocash.co',
        username: 'alice',
      });
      jest
        .spyOn(mocks.service, 'checkWithdraw')
        .mockResolvedValue({ netAmount: 100 } as never);
      const created = { _id: 'w1', amount_net: 50 };
      mocks.withdrawModel.create.mockResolvedValue(created);

      const result = await mocks.service.createManualWithdrawRequest(
        { ...dto, amount: 50 },
        VALID_USER_ID,
      );

      expect(result).toEqual({ success: true, data: created });
      expect(mocks.withdrawModel.create).toHaveBeenCalledTimes(1);
      const persisted = mocks.withdrawModel.create.mock.calls[0][0];
      expect(persisted).toMatchObject({
        status: 'pending',
        method: 'minipay_manual',
        chain: 'CELO',
        withdraw_mode: 'manual',
        amount_total: 50,
        amount_net: 50,
        currency: 'USDT',
        address: VALID_ADDRESS,
      });
    });

    it('createManualWithdrawRequest > given a concurrent duplicate (Mongo 11000) > then surfaces HTTP 409 one-at-a-time error', async () => {
      // The partial unique index rejects a second pending manual request; the
      // service must translate the raw 11000 into a user-facing 409, not 500.
      mocks.userModel.findOne.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
        email: 'member@gogocash.co',
      });
      jest
        .spyOn(mocks.service, 'checkWithdraw')
        .mockResolvedValue({ netAmount: 100 } as never);
      mocks.withdrawModel.create.mockRejectedValue({ code: 11000 });

      await expect(
        mocks.service.createManualWithdrawRequest(
          { ...dto, amount: 50 },
          VALID_USER_ID,
        ),
      ).rejects.toMatchObject({ status: 409 });
    });
  });

  // ---------------------------------------------------------------------------
  // create / createBankTransfer — server-side balance gate (V-2).
  //
  // Both endpoints persisted `amount_net` straight from the client with NO
  // balance check (the manual path above is the reference gate). A user could
  // request a payout larger than their reconciled balance, forging a withdrawal
  // record that the admin-paid bank-transfer/manual flows treat as owed funds.
  // The gate re-derives the available balance server-side via checkWithdraw
  // (currency-aware: THB -> netAmountTHB, USD/USDT/USDC -> netAmount) and
  // refuses anything above it, before any on-chain call or DB write.
  // ---------------------------------------------------------------------------
  describe('create / createBankTransfer balance gate (V-2)', () => {
    it('create > given requested amount exceeds available USD balance > then rejects with HTTP 400, no on-chain call, no record', async () => {
      mocks.userModel.findOne.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
      });
      jest
        .spyOn(mocks.service, 'checkWithdraw')
        .mockResolvedValue({ netAmount: 10, netAmountTHB: 300 } as never);
      const onChain = jest
        .spyOn(mocks.service, 'createRecordOnChain')
        .mockResolvedValue('0xrecord' as never);

      await expect(
        mocks.service.create(
          { amount_net: 100, currency: 'USD' } as never,
          VALID_USER_ID,
        ),
      ).rejects.toMatchObject({ status: 400 });
      expect(onChain).not.toHaveBeenCalled();
      expect(mocks.withdrawModel.create).not.toHaveBeenCalled();
    });

    it('create > given requested THB amount exceeds available THB balance > then rejects with HTTP 400', async () => {
      mocks.userModel.findOne.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
      });
      jest
        .spyOn(mocks.service, 'checkWithdraw')
        .mockResolvedValue({ netAmount: 1000, netAmountTHB: 50 } as never);
      jest
        .spyOn(mocks.service, 'createRecordOnChain')
        .mockResolvedValue('0xrecord' as never);

      await expect(
        mocks.service.create(
          { amount_net: 200, currency: 'THB' } as never,
          VALID_USER_ID,
        ),
      ).rejects.toMatchObject({ status: 400 });
      expect(mocks.withdrawModel.create).not.toHaveBeenCalled();
    });

    it('createBankTransfer > given requested amount exceeds available balance > then rejects with HTTP 400 and does not create a record', async () => {
      mocks.userModel.findOne.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
      });
      // Fee mock so the minimum-amount check passes and the only thing standing
      // between the request and a DB write is the balance gate under test.
      mocks.feeRateModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          minimum_withdraw_thb: 100,
          minimum_withdraw_usd: 5,
          fee_withdraw_thb: 20,
          fee_withdraw_usd: 1,
        }),
      });
      mocks.withdrawFeeCouponRedemptionModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });
      jest
        .spyOn(mocks.service, 'checkWithdraw')
        .mockResolvedValue({ netAmount: 10, netAmountTHB: 300 } as never);

      await expect(
        mocks.service.createBankTransfer(
          { amount_net: 100, amount_total: 100, currency: 'USD' } as never,
          VALID_USER_ID,
        ),
      ).rejects.toMatchObject({ status: 400 });
      expect(mocks.withdrawModel.create).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // create status (V-2b) — on-chain withdrawals are created 'pending'; the
  // server no longer self-approves from a client-supplied tx_hash. An admin
  // confirms settlement via approveWithdrawRequest.
  // ---------------------------------------------------------------------------
  describe('create status + approveWithdrawRequest (V-2b)', () => {
    const setupCreate = () => {
      mocks.userModel.findOne.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
      });
      mocks.userModel.findOneAndUpdate.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
      });
      jest
        .spyOn(mocks.service, 'checkWithdraw')
        .mockResolvedValue({ netAmount: 1000, netAmountTHB: 1000 } as never);
      jest
        .spyOn(mocks.service, 'createRecordOnChain')
        .mockResolvedValue('0xrecord' as never);
      jest
        .spyOn(mocks.service, 'checkWithdrawMyCashback')
        .mockResolvedValue({ availableTHB: 0, availableUSD: 0 } as never);
      mocks.withdrawModel.create.mockResolvedValue([{ _id: 'w1' }]);
      mocks.withdrawModel.findByIdAndUpdate.mockResolvedValue({
        _id: 'w1',
        status: 'pending',
      });
    };

    it('create > given a client tx_hash > then persists status "pending" (no client self-approval)', async () => {
      setupCreate();

      await mocks.service.create(
        {
          amount_net: 10,
          amount_total: 10,
          currency: 'USD',
          tx_hash: '0xclientclaim',
        } as never,
        VALID_USER_ID,
      );

      const persisted = mocks.withdrawModel.create.mock.calls[0][0][0];
      expect(persisted.status).toBe('pending');
    });

    it('approveWithdrawRequest > given a malformed id > then rejects with HTTP 400 without a lookup', async () => {
      await expect(
        mocks.service.approveWithdrawRequest('not-an-id', 'admin-1'),
      ).rejects.toMatchObject({ status: 400 });
      expect(mocks.withdrawModel.findById).not.toHaveBeenCalled();
    });

    it('approveWithdrawRequest > given a missing withdrawal > then rejects with HTTP 404', async () => {
      mocks.withdrawModel.findById.mockResolvedValue(null);
      await expect(
        mocks.service.approveWithdrawRequest(VALID_WITHDRAW_ID, 'admin-1'),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('approveWithdrawRequest > given an already-approved record > then returns it unchanged (idempotent, no second write)', async () => {
      const existing = { _id: VALID_WITHDRAW_ID, status: 'approved' };
      mocks.withdrawModel.findById.mockResolvedValue(existing);
      const result = await mocks.service.approveWithdrawRequest(
        VALID_WITHDRAW_ID,
        'admin-1',
      );
      expect(result).toEqual({ success: true, data: existing });
      expect(mocks.withdrawModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('approveWithdrawRequest > given a paid (non-pending terminal) record > then rejects with HTTP 409 and does not write', async () => {
      mocks.withdrawModel.findById.mockResolvedValue({
        _id: VALID_WITHDRAW_ID,
        status: 'paid',
      });
      await expect(
        mocks.service.approveWithdrawRequest(VALID_WITHDRAW_ID, 'admin-1'),
      ).rejects.toMatchObject({ status: 409 });
      expect(mocks.withdrawModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('approveWithdrawRequest > given a pending record > then sets status approved + admin attribution', async () => {
      mocks.withdrawModel.findById.mockResolvedValue({
        _id: VALID_WITHDRAW_ID,
        status: 'pending',
      });
      mocks.withdrawModel.findByIdAndUpdate.mockResolvedValue({
        _id: VALID_WITHDRAW_ID,
        status: 'approved',
      });

      const result = await mocks.service.approveWithdrawRequest(
        VALID_WITHDRAW_ID,
        'admin-7',
      );

      expect(result).toMatchObject({ success: true });
      const [, update] = mocks.withdrawModel.findByIdAndUpdate.mock.calls[0];
      expect(update.$set).toMatchObject({
        status: 'approved',
        approved_by: 'admin-7',
      });
      expect(update.$set.approved_at).toBeInstanceOf(Date);
    });
  });

  // ---------------------------------------------------------------------------
  // Auto MyCashback withdrawal tagging — server-owned mycashback_id so repeat
  // conversion-only withdraws cannot mint untracked MCB payouts (#8).
  // ---------------------------------------------------------------------------
  describe('auto MyCashback withdrawal tagging (#8)', () => {
    const MCB_DOC_ID = new Types.ObjectId().toString();

    const setupCreateWithMcb = () => {
      mocks.userModel.findOne.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
      });
      mocks.userModel.findOneAndUpdate.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
      });
      jest
        .spyOn(mocks.service, 'checkWithdraw')
        .mockResolvedValue({ netAmount: 1000, netAmountTHB: 1000 } as never);
      jest
        .spyOn(mocks.service, 'createRecordOnChain')
        .mockResolvedValue('0xrecord' as never);
      jest.spyOn(mocks.service, 'checkWithdrawMyCashback').mockResolvedValue({
        availableTHB: 0,
        availableUSD: 30,
        conversionIdMyCashback: [MCB_DOC_ID],
      } as never);
      mocks.withdrawModel.create
        .mockResolvedValueOnce([{ _id: 'w-main' }])
        .mockResolvedValueOnce({ _id: 'w-mcb' });
      mocks.withdrawModel.findByIdAndUpdate.mockResolvedValue({
        _id: 'w-main',
        status: 'pending',
      });
    };

    it('create > given client omits mycashback_id and amount_total > then auto MCB record uses server ids', async () => {
      setupCreateWithMcb();

      await mocks.service.create(
        {
          amount_net: 10,
          currency: 'USDT',
          chain: 137,
          conversion_ids: [1],
        } as never,
        VALID_USER_ID,
      );

      expect(mocks.withdrawModel.create).toHaveBeenCalledTimes(2);
      const autoRecord = mocks.withdrawModel.create.mock.calls[1][0];
      expect(autoRecord.amount_net).toBe(30);
      expect(autoRecord.mycashback_id.map(String)).toEqual([MCB_DOC_ID]);
      expect(autoRecord.mycashback_id).not.toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // create reserve-then-settle (#41) — balance reserved in serialized txn
  // before any on-chain call; on-chain failure marks the record rejected so
  // the reserved balance is released (checkWithdraw excludes rejected).
  // ---------------------------------------------------------------------------
  describe('create reserve-then-settle (#41)', () => {
    const setupCreate = () => {
      mocks.userModel.findOne.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
      });
      mocks.userModel.findOneAndUpdate.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
      });
      jest
        .spyOn(mocks.service, 'checkWithdraw')
        .mockResolvedValue({ netAmount: 1000, netAmountTHB: 1000 } as never);
      jest
        .spyOn(mocks.service, 'checkWithdrawMyCashback')
        .mockResolvedValue({ availableTHB: 0, availableUSD: 0 } as never);
      mocks.withdrawModel.create.mockResolvedValue([{ _id: 'w1' }]);
      mocks.withdrawModel.findByIdAndUpdate.mockResolvedValue({
        _id: 'w1',
        status: 'pending',
      });
    };

    it('create > given valid balance > then persists pending record before on-chain call', async () => {
      setupCreate();
      const callOrder: string[] = [];
      mocks.withdrawModel.create.mockImplementation(async () => {
        callOrder.push('create');
        return [{ _id: 'w1' }];
      });
      jest
        .spyOn(mocks.service, 'createRecordOnChain')
        .mockImplementation(async () => {
          callOrder.push('onChain');
          return '0xrecord';
        });

      await mocks.service.create(
        {
          amount_net: 10,
          amount_total: 10,
          currency: 'USD',
          chain: 137,
          conversion_ids: [1],
        } as never,
        VALID_USER_ID,
      );

      expect(callOrder).toEqual(['create', 'onChain']);
      const persisted = mocks.withdrawModel.create.mock.calls[0][0][0];
      expect(persisted.tx_hash_record).toBe('');
      expect(mocks.withdrawModel.findByIdAndUpdate).toHaveBeenCalledWith('w1', {
        $set: { tx_hash_record: '0xrecord' },
      });
    });

    it('create > given on-chain failure > then marks record rejected and throws HTTP 502', async () => {
      setupCreate();
      jest
        .spyOn(mocks.service, 'createRecordOnChain')
        .mockRejectedValue(new Error('rpc down') as never);

      await expect(
        mocks.service.create(
          {
            amount_net: 10,
            amount_total: 10,
            currency: 'USD',
            chain: 137,
            conversion_ids: [1],
          } as never,
          VALID_USER_ID,
        ),
      ).rejects.toMatchObject({ status: 502 });

      expect(mocks.withdrawModel.findByIdAndUpdate).toHaveBeenCalledWith('w1', {
        $set: {
          status: 'rejected',
          flag_reason: 'on_chain_record_failed',
        },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // markWithdrawPaid — admin settlement, idempotency, terminal-state guards.
  // ---------------------------------------------------------------------------
  describe('markWithdrawPaid', () => {
    const paidDto = { tx_hash: VALID_TX_HASH };

    it('markWithdrawPaid > given a malformed withdraw id > then rejects with HTTP 400 without a lookup', async () => {
      await expect(
        mocks.service.markWithdrawPaid('not-an-objectid', paidDto, 'admin-1'),
      ).rejects.toMatchObject({ status: 400 });
      expect(mocks.withdrawModel.findById).not.toHaveBeenCalled();
    });

    it('markWithdrawPaid > given a missing withdrawal > then rejects with HTTP 404', async () => {
      mocks.withdrawModel.findById.mockResolvedValue(null);

      await expect(
        mocks.service.markWithdrawPaid(VALID_WITHDRAW_ID, paidDto, 'admin-1'),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('markWithdrawPaid > given a non-manual withdrawal > then rejects with HTTP 400', async () => {
      // Only the manual MiniPay flow is settled by an admin; auto on-chain
      // withdrawals must not be flippable to paid through this endpoint.
      mocks.withdrawModel.findById.mockResolvedValue({
        withdraw_mode: 'auto',
        status: 'pending',
      });

      await expect(
        mocks.service.markWithdrawPaid(VALID_WITHDRAW_ID, paidDto, 'admin-1'),
      ).rejects.toMatchObject({ status: 400 });
      expect(mocks.withdrawModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('markWithdrawPaid > given an already-paid record > then returns it unchanged without a second write (idempotent, no double-pay)', async () => {
      // Idempotency is a money-safety contract: re-running mark-paid on a paid
      // row must NOT issue another update or fire a second payout event.
      const existing = {
        withdraw_mode: 'manual',
        status: 'paid',
        _id: VALID_WITHDRAW_ID,
      };
      mocks.withdrawModel.findById.mockResolvedValue(existing);

      const result = await mocks.service.markWithdrawPaid(
        VALID_WITHDRAW_ID,
        paidDto,
        'admin-1',
      );

      expect(result).toEqual({ success: true, data: existing });
      expect(mocks.withdrawModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('markWithdrawPaid > given a rejected (non-pending terminal) record > then rejects with HTTP 409 and does not write', async () => {
      // A rejected/approved row must not be silently resurrected to paid.
      mocks.withdrawModel.findById.mockResolvedValue({
        withdraw_mode: 'manual',
        status: 'rejected',
      });

      await expect(
        mocks.service.markWithdrawPaid(VALID_WITHDRAW_ID, paidDto, 'admin-1'),
      ).rejects.toMatchObject({ status: 409 });
      expect(mocks.withdrawModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('markWithdrawPaid > given a pending manual record > then sets status paid + attribution and fires the withdraw_paid event', async () => {
      // The settled record records who paid + when, and notifies the user once.
      const userId = new Types.ObjectId();
      mocks.withdrawModel.findById.mockResolvedValue({
        withdraw_mode: 'manual',
        status: 'pending',
      });
      const updated = {
        user_id: userId,
        amount_net: 50,
        currency: 'USDT',
        method: 'minipay_manual',
      };
      mocks.withdrawModel.findByIdAndUpdate.mockResolvedValue(updated);

      const result = await mocks.service.markWithdrawPaid(
        VALID_WITHDRAW_ID,
        paidDto,
        'admin-99',
      );

      expect(result).toEqual({ success: true, data: updated });
      const [, update] = mocks.withdrawModel.findByIdAndUpdate.mock.calls[0];
      expect(update.$set).toMatchObject({
        status: 'paid',
        tx_hash: VALID_TX_HASH,
        paid_by: 'admin-99',
      });
      expect(update.$set.paid_at).toBeInstanceOf(Date);
    });

    it('markWithdrawPaid > given a duplicate tx_hash (Mongo 11000) on update > then rejects with HTTP 409', async () => {
      // The same on-chain tx_hash must not be reusable across two withdrawals.
      mocks.withdrawModel.findById.mockResolvedValue({
        withdraw_mode: 'manual',
        status: 'pending',
      });
      mocks.withdrawModel.findByIdAndUpdate.mockRejectedValue({ code: 11000 });

      await expect(
        mocks.service.markWithdrawPaid(VALID_WITHDRAW_ID, paidDto, 'admin-1'),
      ).rejects.toMatchObject({ status: 409 });
    });
  });

  // ---------------------------------------------------------------------------
  // createWithdrawMethod — duplicate-account guard + ownership stamping.
  // ---------------------------------------------------------------------------
  describe('createWithdrawMethod', () => {
    it.each([
      ['object', { $ne: null }],
      ['array', ['00123999']],
    ])(
      'createWithdrawMethod > given an %s account number > then rejects before any database query',
      async (_kind, accountNo) => {
        await expect(
          mocks.service.createWithdrawMethod(
            { account_no: accountNo } as never,
            VALID_USER_ID,
          ),
        ).rejects.toMatchObject({ status: 400 });

        expect(mocks.userModel.findOne).not.toHaveBeenCalled();
        expect(mocks.withdrawMethodModel.findOne).not.toHaveBeenCalled();
        expect(mocks.withdrawMethodModel.create).not.toHaveBeenCalled();
      },
    );

    it.each([
      ['object', { $ne: null }],
      ['array', [VALID_USER_ID]],
    ])(
      'createWithdrawMethod > given an %s authenticated user id > then rejects before any database query',
      async (_kind, userId) => {
        await expect(
          mocks.service.createWithdrawMethod(
            { account_no: '00123999' } as never,
            userId as never,
          ),
        ).rejects.toMatchObject({ status: 400 });

        expect(mocks.userModel.findOne).not.toHaveBeenCalled();
        expect(mocks.withdrawMethodModel.findOne).not.toHaveBeenCalled();
        expect(mocks.withdrawMethodModel.create).not.toHaveBeenCalled();
      },
    );

    it('createWithdrawMethod > given an unknown user > then throws UnauthorizedException', async () => {
      mocks.userModel.findOne.mockResolvedValue(null);

      await expect(
        mocks.service.createWithdrawMethod(
          { account_no: '123' } as never,
          VALID_USER_ID,
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('createWithdrawMethod > given an account number already on file > then rejects with HTTP 400 and does not create a duplicate', async () => {
      mocks.userModel.findOne.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
      });
      mocks.withdrawMethodModel.findOne.mockResolvedValue({ _id: 'dup' });

      await expect(
        mocks.service.createWithdrawMethod(
          { account_no: '123' } as never,
          VALID_USER_ID,
        ),
      ).rejects.toMatchObject({ status: 400 });
      expect(mocks.withdrawMethodModel.create).not.toHaveBeenCalled();
    });

    it('createWithdrawMethod > given a new leading-zero account number > then preserves it while stamping the owner user_id', async () => {
      // Ownership must be derived from the session, never trusted from the body,
      // so the method can't be created on behalf of another account.
      const userOid = new Types.ObjectId(VALID_USER_ID);
      mocks.userModel.findOne.mockResolvedValue({ _id: userOid });
      mocks.withdrawMethodModel.findOne.mockResolvedValue(null);
      mocks.withdrawMethodModel.create.mockResolvedValue({ _id: 'm1' });

      const input = { account_no: '00123999' } as never;
      const result = await mocks.service.createWithdrawMethod(
        input,
        VALID_USER_ID,
      );

      expect(result).toMatchObject({ status: 'success' });
      expect(mocks.withdrawMethodModel.findOne).toHaveBeenCalledWith({
        account_no: { $eq: '00123999' },
        user_id: userOid,
      });
      const persisted = mocks.withdrawMethodModel.create.mock.calls[0][0];
      expect(persisted.account_no).toBe('00123999');
      expect(persisted.user_id.toString()).toBe(userOid.toString());
      expect(input).not.toHaveProperty('user_id');
    });
  });

  // ---------------------------------------------------------------------------
  // withdraw-method ownership scope — IDOR guard (V-3). get/update/delete a
  // saved bank/withdraw method by raw _id was unscoped, so any authenticated
  // user could read or overwrite another member's payout account (redirect
  // funds). Queries must be constrained to {_id, user_id} like getMethodList.
  // ---------------------------------------------------------------------------
  describe('withdraw-method ownership scope (V-3 IDOR)', () => {
    const METHOD_ID = new Types.ObjectId().toString();

    it('getMethodId > given a method id + caller > then scopes findOne by owner user_id (not unscoped findById)', async () => {
      mocks.withdrawMethodModel.findOne.mockResolvedValue(null);

      await mocks.service.getMethodId(METHOD_ID, VALID_USER_ID);

      expect(mocks.withdrawMethodModel.findById).not.toHaveBeenCalled();
      expect(mocks.withdrawMethodModel.findOne).toHaveBeenCalledTimes(1);
      const filter = mocks.withdrawMethodModel.findOne.mock.calls[0][0];
      expect(filter.user_id.toString()).toBe(VALID_USER_ID);
      expect(filter._id.toString()).toBe(METHOD_ID);
    });

    it('deleteMethodData > given a method id + caller > then deletes only the caller-owned row (scoped findOneAndDelete, not findByIdAndDelete)', async () => {
      mocks.withdrawMethodModel.findOneAndDelete.mockResolvedValue(null);

      await mocks.service.deleteMethodData(METHOD_ID, VALID_USER_ID);

      expect(
        mocks.withdrawMethodModel.findByIdAndDelete,
      ).not.toHaveBeenCalled();
      expect(mocks.withdrawMethodModel.findOneAndDelete).toHaveBeenCalledTimes(
        1,
      );
      const filter =
        mocks.withdrawMethodModel.findOneAndDelete.mock.calls[0][0];
      expect(filter.user_id.toString()).toBe(VALID_USER_ID);
      expect(filter._id.toString()).toBe(METHOD_ID);
    });

    it('updateMethodData > given a method id + caller > then updates only the caller-owned row (scoped findOneAndUpdate, not findByIdAndUpdate)', async () => {
      mocks.withdrawMethodModel.findOneAndUpdate.mockResolvedValue(null);

      await mocks.service.updateMethodData(METHOD_ID, VALID_USER_ID, {
        account_no: '00123',
      } as never);

      expect(
        mocks.withdrawMethodModel.findByIdAndUpdate,
      ).not.toHaveBeenCalled();
      expect(mocks.withdrawMethodModel.findOneAndUpdate).toHaveBeenCalledTimes(
        1,
      );
      const filter =
        mocks.withdrawMethodModel.findOneAndUpdate.mock.calls[0][0];
      expect(filter.user_id.toString()).toBe(VALID_USER_ID);
      expect(
        mocks.withdrawMethodModel.findOneAndUpdate.mock.calls[0][1].$set
          .account_no,
      ).toBe('00123');
    });

    it('getMethodId > given a malformed method id > then returns null without a query (no CastError / no unscoped read)', async () => {
      const res = await mocks.service.getMethodId(
        'not-an-objectid',
        VALID_USER_ID,
      );

      expect(res).toBeNull();
      expect(mocks.withdrawMethodModel.findOne).not.toHaveBeenCalled();
      expect(mocks.withdrawMethodModel.findById).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // detailWithdraw — ObjectId-enumeration guard for the customer route.
  // ---------------------------------------------------------------------------
  describe('detailWithdraw', () => {
    const makeChain = (value: unknown) => {
      const lean = jest.fn().mockResolvedValue(value);
      const populate = jest.fn().mockReturnValue({ lean });
      mocks.withdrawModel.findOne.mockReturnValue({ populate });
      return { populate, lean };
    };

    it('detailWithdraw > given a requesterId > then constrains the query to that owner (no cross-user enumeration)', async () => {
      // Supplying requesterId must scope by user_id so a customer cannot read
      // another member's withdrawal by guessing its ObjectId.
      makeChain({ _id: VALID_WITHDRAW_ID });

      await mocks.service.detailWithdraw(VALID_WITHDRAW_ID, VALID_USER_ID);

      const filter = mocks.withdrawModel.findOne.mock.calls[0][0];
      expect(filter).toHaveProperty('user_id');
      expect(filter.user_id.toString()).toBe(VALID_USER_ID);
    });

    it('detailWithdraw > given no requesterId (admin route) > then does not constrain by user_id', async () => {
      makeChain({ _id: VALID_WITHDRAW_ID });

      await mocks.service.detailWithdraw(VALID_WITHDRAW_ID);

      const filter = mocks.withdrawModel.findOne.mock.calls[0][0];
      expect(filter).not.toHaveProperty('user_id');
    });
  });

  // ---------------------------------------------------------------------------
  // Currency conversion — same-currency shortcut + network-failure fallback.
  // ---------------------------------------------------------------------------
  describe('currency conversion', () => {
    it('convertCurrencyUsd > given USD input > then returns the amount untouched at rate 1 with no network call', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch' as never);

      const result = await mocks.service.convertCurrencyUsd('USD', 123.45);

      expect(result).toEqual({ usdAmount: 123.45, exchangeRate: 1 });
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('convertCurrencyThb > given an upstream failure and a cold cache > then throws (fail-closed)', async () => {
      // P1-FX: a flaky FX upstream must NOT degrade to null — the callers do
      // `amount || 0`, so a null silently zeroes a foreign-currency withdrawal
      // and inflates the available balance. With no cached rate to fall back on,
      // fail loud instead.
      jest
        .spyOn(global, 'fetch' as never)
        .mockResolvedValue({ ok: false } as never);

      await expect(
        mocks.service.convertCurrencyThb('USD', 100),
      ).rejects.toBeDefined();
    });

    it('convertCurrencyUsd > given a successful rate > then caches it (a second call within TTL does not refetch)', async () => {
      // P1-FX: checkWithdraw converts the same currency ~20x per request; without
      // a cache that is 20 external calls on the hot money path.
      const fetchSpy = jest.spyOn(global, 'fetch' as never).mockResolvedValue({
        ok: true,
        json: async () => ({ rates: { USD: 0.03 } }),
      } as never);

      const first = await mocks.service.convertCurrencyUsd('THB', 100);
      const second = await mocks.service.convertCurrencyUsd('THB', 200);

      expect(first).toEqual({ usdAmount: 3, exchangeRate: 0.03 });
      expect(second).toEqual({ usdAmount: 6, exchangeRate: 0.03 });
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('convertCurrencyUsd > given an upstream failure AFTER a cached success > then serves the stale rate (resilient, no throw)', async () => {
      const fetchSpy = jest
        .spyOn(global, 'fetch' as never)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ rates: { USD: 0.03 } }),
        } as never)
        .mockResolvedValue({ ok: false } as never);

      // First call populates the cache; force-expire it so the next call refetches.
      await mocks.service.convertCurrencyUsd('THB', 100);
      mocks.service.expireFxCacheForTest();

      const stale = await mocks.service.convertCurrencyUsd('THB', 100);

      expect(stale).toEqual({ usdAmount: 3, exchangeRate: 0.03 });
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });

  // ---------------------------------------------------------------------------
  // checkWithdrawMyCashback — the "no MyCashback record" zero-balance path.
  // ---------------------------------------------------------------------------
  describe('checkWithdrawMyCashback', () => {
    it('checkWithdrawMyCashback > given an unknown user > then throws UnauthorizedException', async () => {
      mocks.userModel.findOne.mockResolvedValue(null);

      await expect(
        mocks.service.checkWithdrawMyCashback(VALID_USER_ID),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('checkWithdrawMyCashback > given a phone-OTP user with no email and no MyCashback rows > then returns an all-zero balance (no $regex undefined crash)', async () => {
      // Fresh phone-OTP users carry no email; the service must not feed
      // `$regex: undefined` to Mongo and 500 — it returns a safe zero balance.
      mocks.userModel.findOne.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
        mobile: '+66812345678',
        email: undefined,
      });
      mocks.userMyCashbackModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      const result = await mocks.service.checkWithdrawMyCashback(VALID_USER_ID);

      expect(result).toEqual({
        totalMyCashbackTHB: 0,
        totalMyCashbackUSD: 0,
        availableUSD: 0,
        availableTHB: 0,
        conversionIdMyCashback: [],
      });
    });
  });

  describe('checkWithdraw user lookup', () => {
    it('checkWithdraw > given an invalid user id > then throws UnauthorizedException', async () => {
      await expect(
        mocks.service.checkWithdraw(undefined as never),
      ).rejects.toMatchObject({
        response: { message: 'User not found' },
      });
      expect(mocks.userModel.findOne).not.toHaveBeenCalled();
    });

    it('checkWithdraw > given a loaded user > then passes the user doc into checkWithdrawMyCashback', async () => {
      const userDoc = {
        _id: new Types.ObjectId(VALID_USER_ID),
        mobile: '+66812345678',
      };
      mocks.userModel.findOne.mockResolvedValue(userDoc);
      mocks.feeRateModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ system: 30, max_cap: 1000 }),
      });
      mocks.conversionModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });
      mocks.withdrawModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });
      const mcbSpy = jest
        .spyOn(mocks.service, 'checkWithdrawMyCashback')
        .mockResolvedValue({
          totalMyCashbackTHB: 0,
          totalMyCashbackUSD: 0,
          availableUSD: 0,
          availableTHB: 0,
          conversionIdMyCashback: [],
        });

      await mocks.service.checkWithdraw(VALID_USER_ID);

      expect(mcbSpy).toHaveBeenCalledWith(VALID_USER_ID, userDoc);
      expect(mocks.userModel.findOne).toHaveBeenCalledTimes(1);
    });
  });

  describe('adminAddRewardConversionForQuest', () => {
    function reconciledRankQuest(
      questId: Types.ObjectId,
      rewards: Array<{ rank: number; reward: number; currency?: string }>,
    ) {
      const quest = {
        _id: questId,
        status: 'close',
        reward_status: false,
        reward_model: 'legacy_v1',
        legacy_payout_reconciliation_status: 'ready',
        legacy_payout_reconciliation_version: 1,
        start_date: new Date('2026-06-01T00:00:00.000Z'),
        end_date: new Date('2026-06-30T00:00:00.000Z'),
        rewards,
        facebook_page: '',
        facebook_post: '',
        line: '',
        legacy_payout_config_checksum: '',
      };
      quest.legacy_payout_config_checksum =
        legacyQuestPayoutConfigChecksum(quest);
      return quest;
    }

    function setRankManifest(
      questId: Types.ObjectId,
      recipients: Array<{
        user_id: string;
        rank: number;
        amount: number;
        currency?: string;
        excluded?: boolean;
        exclusion_reason?: string;
      }>,
    ) {
      const entries = recipients.map((recipient) => ({
        ...recipient,
        currency: recipient.currency || 'THB',
        payout_key: legacyRankPayoutKey(
          questId,
          recipient.user_id,
          recipient.rank,
        ),
      }));
      const noRecipientReason =
        entries.length === 0
          ? 'Reviewed evidence found no rank recipients'
          : undefined;
      const quest = reconciledRankQuest(
        questId,
        entries.map((entry) => ({
          rank: entry.rank,
          reward: entry.amount,
          currency: entry.currency,
        })),
      );
      mocks.legacyManifestCollection.findOne.mockResolvedValue({
        manifest_key: legacyRewardManifestKey(questId, 'rank'),
        quest_id: questId.toString(),
        reward_type: 'rank',
        reconciliation_version: 1,
        status: 'ready',
        recipients: entries,
        quest_config_checksum: quest.legacy_payout_config_checksum,
        ...(noRecipientReason
          ? { no_recipient_reason: noRecipientReason }
          : {}),
        manifest_hash: legacyRewardManifestHash(
          questId,
          'rank',
          1,
          entries,
          noRecipientReason,
          quest.legacy_payout_config_checksum,
        ),
      });
    }

    it('adminAddRewardConversionForQuest > given quest-level rewards > then it uses them instead of the legacy global reward list', async () => {
      const questId = new Types.ObjectId();
      mocks.questModel.findOne.mockResolvedValue(
        reconciledRankQuest(questId, [
          { rank: 1, reward: 1200, currency: 'THB' },
          { rank: 2, reward: 800, currency: 'THB' },
        ]),
      );
      mocks.rewardListModel.findOne.mockResolvedValue({
        name: 'quest',
        data: [{ rank: 1, reward: 1, currency: 'THB' }],
      });
      setRankManifest(questId, [
        {
          user_id: new Types.ObjectId().toHexString(),
          rank: 1,
          amount: 1200,
        },
        {
          user_id: new Types.ObjectId().toHexString(),
          rank: 2,
          amount: 800,
        },
      ]);
      mocks.conversionModel.updateOne.mockResolvedValue({ upsertedCount: 1 });
      mocks.questModel.findOneAndUpdate.mockResolvedValue({});

      await mocks.service.adminAddRewardConversionForQuest();

      expect(mocks.rewardListModel.findOne).not.toHaveBeenCalled();
      expect(mocks.pointService.getQuestRankListOfPoint).not.toHaveBeenCalled();
      expect(mocks.conversionModel.updateOne).toHaveBeenCalledTimes(2);
      expect(mocks.conversionModel.updateOne).toHaveBeenNthCalledWith(
        1,
        {
          quest_payout_key: expect.stringMatching(
            /^legacy:quest:.+:rank:1:user:/,
          ),
        },
        {
          $setOnInsert: expect.objectContaining({
            payout: 1200,
            currency: 'THB',
            quest_payout_key: expect.stringMatching(
              /^legacy:quest:.+:rank:1:user:/,
            ),
            conversion_id: expect.any(Number),
          }),
        },
        { upsert: true },
      );
      expect(mocks.conversionModel.updateOne).toHaveBeenNthCalledWith(
        2,
        {
          quest_payout_key: expect.stringMatching(
            /^legacy:quest:.+:rank:2:user:/,
          ),
        },
        {
          $setOnInsert: expect.objectContaining({
            payout: 800,
            currency: 'THB',
            quest_payout_key: expect.stringMatching(
              /^legacy:quest:.+:rank:2:user:/,
            ),
          }),
        },
        { upsert: true },
      );
      expect(mocks.questModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: questId,
          legacy_payout_reconciliation_status: 'ready',
          legacy_payout_reconciliation_version: 1,
          legacy_payout_config_checksum: reconciledRankQuest(questId, [
            { rank: 1, reward: 1200, currency: 'THB' },
            { rank: 2, reward: 800, currency: 'THB' },
          ]).legacy_payout_config_checksum,
          legacy_rank_payout_completed_at: { $exists: false },
        },
        {
          $set: {
            legacy_rank_payout_completed_at: expect.any(Date),
            reward_status: true,
          },
        },
        { new: true },
      );
    });

    it('requires ready reconciliation and a legacy reward model in its selection query', async () => {
      mocks.questModel.findOne.mockResolvedValue(null);

      await mocks.service.adminAddRewardConversionForQuest();

      const query = mocks.questModel.findOne.mock.calls[0][0];
      expect(query).toMatchObject({
        status: 'close',
        legacy_payout_reconciliation_status: 'ready',
        legacy_payout_reconciliation_version: 1,
        legacy_rank_payout_completed_at: { $exists: false },
      });
      expect(JSON.stringify(query)).toContain('legacy_v1');
      expect(JSON.stringify(query)).not.toContain('task_v2');
    });

    it('completes an explicitly reviewed empty rank manifest without inventing an unpaid recipient', async () => {
      const questId = new Types.ObjectId();
      mocks.questModel.findOne.mockResolvedValue(
        reconciledRankQuest(questId, []),
      );
      setRankManifest(questId, []);
      mocks.questModel.findOneAndUpdate.mockResolvedValue({});

      await expect(
        mocks.service.adminAddRewardConversionForQuest(),
      ).resolves.toBeNull();

      expect(mocks.conversionModel.updateOne).not.toHaveBeenCalled();
      expect(mocks.legacyManifestCollection.updateOne).toHaveBeenCalledTimes(1);
      expect(mocks.questModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
    });

    it('retries the same recipients after a crash without marking the round complete early', async () => {
      const questId = new Types.ObjectId();
      const userA = new Types.ObjectId().toHexString();
      const userB = new Types.ObjectId().toHexString();
      mocks.questModel.findOne.mockResolvedValue(
        reconciledRankQuest(questId, [
          { rank: 1, reward: 1200, currency: 'THB' },
          { rank: 2, reward: 800, currency: 'THB' },
        ]),
      );
      setRankManifest(questId, [
        { user_id: userA, rank: 1, amount: 1200 },
        { user_id: userB, rank: 2, amount: 800 },
      ]);
      mocks.conversionModel.updateOne
        .mockResolvedValueOnce({ upsertedCount: 1 })
        .mockRejectedValueOnce(new Error('crash after recipient one'))
        .mockResolvedValue({ matchedCount: 1 });
      mocks.conversionModel.findOne.mockImplementation(
        ({ quest_payout_key }: { quest_payout_key: string }) => {
          const rank = quest_payout_key.includes(':rank:1:') ? 1 : 2;
          const userId = rank === 1 ? userA : userB;
          return {
            lean: jest.fn().mockResolvedValue({
              quest_payout_key,
              user_id: new Types.ObjectId(userId),
              aff_sub1: `user_id:${userId}`,
              offer_name: 'reward_conversion_quest',
              adv_sub3: questId.toString(),
              adv_sub5: String(rank),
              payout: rank === 1 ? 1200 : 800,
              currency: 'THB',
              source: 'involve',
              provider_account: 'legacy-quest',
              provider_conversion_id: quest_payout_key,
              quest_synthetic_reward: true,
            }),
          };
        },
      );
      mocks.questModel.findOneAndUpdate.mockResolvedValue({});

      await expect(
        mocks.service.adminAddRewardConversionForQuest(),
      ).rejects.toThrow('crash after recipient one');
      expect(mocks.questModel.findOneAndUpdate).not.toHaveBeenCalled();
      await expect(
        mocks.service.adminAddRewardConversionForQuest(),
      ).resolves.toBeDefined();

      const firstAttemptKeys = mocks.conversionModel.updateOne.mock.calls
        .slice(0, 2)
        .map((call) => call[0].quest_payout_key);
      const retryKeys = mocks.conversionModel.updateOne.mock.calls
        .slice(2)
        .map((call) => call[0].quest_payout_key);
      expect(retryKeys).toEqual(firstAttemptKeys);
      expect(mocks.questModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
    });

    it('fails closed when an existing payout key names a different effect', async () => {
      const questId = new Types.ObjectId();
      const userId = new Types.ObjectId().toHexString();
      mocks.questModel.findOne.mockResolvedValue(
        reconciledRankQuest(questId, [
          { rank: 1, reward: 1200, currency: 'THB' },
        ]),
      );
      setRankManifest(questId, [{ user_id: userId, rank: 1, amount: 1200 }]);
      mocks.conversionModel.updateOne.mockResolvedValue({ matchedCount: 1 });
      mocks.conversionModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          user_id: new Types.ObjectId(userId),
          aff_sub1: `user_id:${userId}`,
          offer_name: 'reward_conversion_quest',
          adv_sub3: questId.toString(),
          adv_sub5: '1',
          payout: 999,
          currency: 'THB',
          source: 'involve',
          provider_account: 'legacy-quest',
          provider_conversion_id: legacyRankPayoutKey(questId, userId, 1),
          quest_synthetic_reward: true,
        }),
      });

      await expect(
        mocks.service.adminAddRewardConversionForQuest(),
      ).rejects.toMatchObject({ status: 409 });
      expect(mocks.legacyManifestCollection.updateOne).not.toHaveBeenCalled();
      expect(mocks.questModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('does not mark the quest paid when the manifest completion hash fence is lost', async () => {
      const questId = new Types.ObjectId();
      const userId = new Types.ObjectId().toHexString();
      mocks.questModel.findOne.mockResolvedValue(
        reconciledRankQuest(questId, [
          { rank: 1, reward: 1200, currency: 'THB' },
        ]),
      );
      setRankManifest(questId, [{ user_id: userId, rank: 1, amount: 1200 }]);
      mocks.conversionModel.updateOne.mockResolvedValue({ upsertedCount: 1 });
      mocks.legacyManifestCollection.updateOne.mockResolvedValue({
        matchedCount: 0,
      });

      await expect(
        mocks.service.adminAddRewardConversionForQuest(),
      ).rejects.toMatchObject({ status: 409 });
      expect(mocks.questModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('fails closed before any rank payout when the immutable manifest was tampered with', async () => {
      const questId = new Types.ObjectId();
      const userId = new Types.ObjectId().toHexString();
      const quest = reconciledRankQuest(questId, [
        { rank: 1, reward: 1200, currency: 'THB' },
      ]);
      mocks.questModel.findOne.mockResolvedValue(quest);
      const originalRecipients = [
        {
          user_id: userId,
          rank: 1,
          amount: 1200,
          currency: 'THB',
          payout_key: legacyRankPayoutKey(questId, userId, 1),
        },
      ];
      mocks.legacyManifestCollection.findOne.mockResolvedValue({
        manifest_key: legacyRewardManifestKey(questId, 'rank'),
        quest_id: questId.toString(),
        reward_type: 'rank',
        reconciliation_version: 1,
        status: 'ready',
        recipients: [{ ...originalRecipients[0], amount: 120_000 }],
        quest_config_checksum: quest.legacy_payout_config_checksum,
        manifest_hash: legacyRewardManifestHash(
          questId,
          'rank',
          1,
          originalRecipients,
          undefined,
          quest.legacy_payout_config_checksum,
        ),
      });

      await expect(
        mocks.service.adminAddRewardConversionForQuest(),
      ).rejects.toThrow(/manifest hash mismatch/i);
      expect(mocks.conversionModel.updateOne).not.toHaveBeenCalled();
      expect(mocks.legacyManifestCollection.updateOne).not.toHaveBeenCalled();
      expect(mocks.questModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('ignores a changed retry-time leaderboard and pays only the reconciliation manifest', async () => {
      const questId = new Types.ObjectId();
      const frozenUser = new Types.ObjectId().toHexString();
      mocks.questModel.findOne.mockResolvedValue(
        reconciledRankQuest(questId, [
          { rank: 1, reward: 1200, currency: 'THB' },
        ]),
      );
      setRankManifest(questId, [
        { user_id: frozenUser, rank: 1, amount: 1200 },
      ]);
      mocks.pointService.getQuestRankListOfPoint.mockResolvedValue([
        { user_id: new Types.ObjectId().toHexString(), point: 9999 },
      ]);
      mocks.conversionModel.updateOne.mockResolvedValue({ upsertedCount: 1 });
      mocks.questModel.findOneAndUpdate.mockResolvedValue({});

      await mocks.service.adminAddRewardConversionForQuest();

      expect(mocks.pointService.getQuestRankListOfPoint).not.toHaveBeenCalled();
      expect(mocks.conversionModel.updateOne).toHaveBeenCalledWith(
        {
          quest_payout_key: legacyRankPayoutKey(questId, frozenUser, 1),
        },
        expect.any(Object),
        { upsert: true },
      );
    });
  });

  // ---------------------------------------------------------------------------
  // listCheckWithdrawNew — source-scoped offer join (H1).
  //
  // offer_id is only unique WITHIN a source (Involve vs Optimise/Accesstrade can
  // share a numeric offer_id). The old join was a naive localField/foreignField
  // on offer_id + $unwind: with two offers sharing an id, $unwind fans the
  // conversion into multiple rows and the displayed cashback DOUBLES. The fix
  // mirrors getConversationAllPage: a source-constrained sub-pipeline that pins
  // offer.source to the conversion's source ($ifNull -> 'involve' for legacy
  // rows) and offer.offer_id, taking a single match.
  // ---------------------------------------------------------------------------
  describe('listCheckWithdrawNew source-scoped offer join (H1)', () => {
    function primeListCheckWithdrawNew(mocks: Mocks) {
      mocks.userModel.findOne.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
        email: 'u@example.com',
        mobile: '0800000000',
      });
      mocks.feeRateModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ max_cap: 5, system: 30 }),
      });
      mocks.withdrawModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });
      mocks.conversionModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });
    }

    function captureOfferLookup(mocks: Mocks) {
      const pipeline = mocks.conversionModel.aggregate.mock
        .calls[0][0] as Array<Record<string, any>>;
      const lookupStage = pipeline.find(
        (stage) => stage.$lookup && stage.$lookup.from === 'offers',
      );
      return lookupStage?.$lookup as Record<string, any> | undefined;
    }

    it('listCheckWithdrawNew > given the offers join > then it is a source-constrained sub-pipeline, not a naive localField/foreignField join', async () => {
      primeListCheckWithdrawNew(mocks);

      await mocks.service.listCheckWithdrawNew(VALID_USER_ID);

      const lookup = captureOfferLookup(mocks);
      expect(lookup).toBeDefined();
      // Naive join fields are what caused the double-count — they must be gone.
      expect(lookup?.localField).toBeUndefined();
      expect(lookup?.foreignField).toBeUndefined();
      // Source of truth is the conversion's source, defaulting to 'involve'.
      expect(lookup?.let).toMatchObject({
        oid: '$offer_id',
        src: { $ifNull: ['$source', 'involve'] },
      });
    });

    it('listCheckWithdrawNew > given the offers join sub-pipeline > then it matches offer.source to $$src and offer.offer_id to $$oid and limits to 1', async () => {
      primeListCheckWithdrawNew(mocks);

      await mocks.service.listCheckWithdrawNew(VALID_USER_ID);

      const lookup = captureOfferLookup(mocks);
      const subPipeline = lookup?.pipeline as Array<Record<string, any>>;
      expect(Array.isArray(subPipeline)).toBe(true);
      const andClauses =
        subPipeline.find((s) => s.$match)?.$match.$expr.$and ?? [];
      expect(andClauses).toEqual(
        expect.arrayContaining([
          { $eq: [{ $ifNull: ['$source', 'involve'] }, '$$src'] },
          { $eq: ['$offer_id', '$$oid'] },
        ]),
      );
      expect(subPipeline).toEqual(expect.arrayContaining([{ $limit: 1 }]));
    });

    it('listCheckWithdrawNew > given the offers join > then it keeps $unwind with preserveNullAndEmptyArrays (missing-offer rows survive)', async () => {
      primeListCheckWithdrawNew(mocks);

      await mocks.service.listCheckWithdrawNew(VALID_USER_ID);

      const pipeline = mocks.conversionModel.aggregate.mock
        .calls[0][0] as Array<Record<string, any>>;
      const unwind = pipeline.find((s) => s.$unwind);
      expect(unwind?.$unwind).toEqual({
        path: '$offer',
        preserveNullAndEmptyArrays: true,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // getBankList — deterministic static reference.
  // ---------------------------------------------------------------------------
  describe('getBankList', () => {
    it('getBankList > when called > then returns the Thai bank reference list', () => {
      expect(mocks.service.getBankList()).toBe(thaiBanks);
    });
  });
});
