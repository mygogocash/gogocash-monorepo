import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { ethers } from 'ethers';
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
import { AdminActivityService } from 'src/admin/activity/admin-activity.service';
import { WalletAdjustment } from 'src/admin/wallets/schemas/wallet-adjustment.schema';
import { InvolveService } from 'src/involve/involve.service';
import { PointService } from 'src/point/point.service';
import { thaiBanks } from 'src/utils/helper';
import {
  legacyQuestPayoutConfigChecksum,
  legacyRewardManifestHash,
  legacyRewardManifestKey,
} from 'src/tasks/legacy-reward-manifest';
import { legacyRankPayoutKey } from 'src/tasks/legacy-reward-identity';
import { ChainRecordRejectedError } from './withdraw-chain';

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
  updateMany: jest.fn(),
  countDocuments: jest.fn(),
  deleteOne: jest.fn(),
  aggregate: jest.fn(),
  exec: jest.fn(),
});

const queryResult = <T>(value: T) => {
  const query: Record<string, jest.Mock> = {};
  query.session = jest.fn().mockReturnValue(query);
  query.exec = jest.fn().mockResolvedValue(value);
  query.lean = jest.fn().mockResolvedValue(value);
  return query;
};

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
  walletAdjustmentModel: ModelMock;
  adminActivity: {
    append: jest.Mock;
    appendRequired: jest.Mock;
  };
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
  const walletAdjustmentModel = makeModelMock();
  walletAdjustmentModel.find.mockReturnValue({
    lean: jest.fn().mockResolvedValue([]),
  });
  const involveService = { getConversionAll: jest.fn() };
  const pointService = { getQuestRankListOfPoint: jest.fn() };
  const adminActivity = {
    append: jest.fn().mockResolvedValue(undefined),
    appendRequired: jest.fn().mockResolvedValue(undefined),
  };
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
      {
        provide: getModelToken(WalletAdjustment.name),
        useValue: walletAdjustmentModel,
      },
      { provide: InvolveService, useValue: involveService },
      { provide: PointService, useValue: pointService },
      { provide: getConnectionToken(), useValue: connection },
      {
        provide: AdminActivityService,
        useValue: adminActivity,
      },
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
    walletAdjustmentModel,
    adminActivity,
    involveService,
    pointService,
    legacyManifestCollection,
  };
}

const VALID_USER_ID = new Types.ObjectId().toString();
const VALID_WITHDRAW_ID = new Types.ObjectId().toString();
const VALID_ADDRESS = '0x' + 'a'.repeat(40);
const VALID_TX_HASH = '0x' + 'b'.repeat(64);
const adminActor = (id: string) => ({ id, label: `${id}@gogocash.co` });
const effectHash = (value: Record<string, unknown>) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

describe('WithdrawService', () => {
  let mocks: Mocks;
  const chainEnv = {
    CHAIN_ID_WITHDRAW_POLYGON: '137',
    CONTRACT_WITHDRAW_ADDRESS_POLYGON: `0x${'1'.repeat(40)}`,
    PRIVATE_KEY_WITHDRAW: `0x${'2'.repeat(64)}`,
    RPC_URL_POLYGON: 'https://polygon.invalid',
    CHAIN_ID_WITHDRAW_CELO: '42220',
    CONTRACT_WITHDRAW_ADDRESS_CELO: `0x${'4'.repeat(40)}`,
    RPC_URL_CELO: 'https://celo.invalid',
  };
  const originalChainEnv = Object.fromEntries(
    Object.keys(chainEnv).map((key) => [key, process.env[key]]),
  );

  beforeAll(() => {
    Object.assign(process.env, chainEnv);
  });

  afterAll(() => {
    for (const [key, value] of Object.entries(originalChainEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  beforeEach(async () => {
    mocks = await buildService();
    // Most unit tests isolate their specific money-path contract. Expired
    // signature reconciliation has dedicated tests and is otherwise stubbed so
    // unrelated fixtures do not need to emulate chain reads.
    jest
      .spyOn(mocks.service, 'reconcileExpiredSignatureReservations')
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(mocks.service).toBeDefined();
  });

  describe('getSign authorization boundary', () => {
    const signingEnv = {
      CHAIN_ID_WITHDRAW_POLYGON: '137',
      CONTRACT_WITHDRAW_ADDRESS_POLYGON: `0x${'1'.repeat(40)}`,
      PRIVATE_KEY_WITHDRAW: `0x${'2'.repeat(64)}`,
      RPC_URL_POLYGON: 'https://polygon.invalid',
    };
    const previousEnv: Record<string, string | undefined> = {};

    beforeEach(() => {
      for (const [key, value] of Object.entries(signingEnv)) {
        previousEnv[key] = process.env[key];
        process.env[key] = value;
      }
      mocks.userModel.findOneAndUpdate.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
        address: VALID_ADDRESS,
      });
      mocks.withdrawModel.findOne.mockReturnValue(queryResult(null));
      mocks.withdrawModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });
      mocks.withdrawModel.create.mockImplementation(
        async ([record]: [Record<string, unknown>]) => [
          { ...record, _id: new Types.ObjectId() },
        ],
      );
    });

    afterEach(() => {
      jest.useRealTimers();
      for (const [key, value] of Object.entries(previousEnv)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    });

    const signDto = () => ({
      userid: VALID_USER_ID,
      userAddress: VALID_ADDRESS,
      totalCashbackAmount: '12.500000',
      conversionIdHashes: ['9', '7'],
      expireAt: String(Math.floor(Date.now() / 1000) + 300),
      chain: 137,
    });

    it('rejects a caller asking the service to sign for another user', async () => {
      await expect(
        mocks.service.getSign(
          { ...signDto(), userid: new Types.ObjectId().toString() },
          VALID_USER_ID,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(mocks.userModel.findById).not.toHaveBeenCalled();
    });

    it('rejects an address that is not linked to the authenticated account', async () => {
      mocks.userModel.findById.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
        address: `0x${'3'.repeat(40)}`,
      });

      await expect(
        mocks.service.getSign(signDto(), VALID_USER_ID),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(mocks.conversionModel.find).not.toHaveBeenCalled();
    });

    it('signs only the server-derived amount and conversion set', async () => {
      mocks.userModel.findById.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
        address: VALID_ADDRESS,
        wallet_frozen: false,
      });
      const entitlement = jest
        .spyOn(mocks.service, 'checkWithdraw')
        .mockResolvedValue({
          netAmount: '12.50',
          data: [{ conversion_id: 7 }, { conversion_id: 9 }],
        } as never);
      jest
        .spyOn(mocks.service, 'getConversionIdsWithdrawedByUserId')
        .mockResolvedValue([]);
      mocks.withdrawModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });

      const signature = await mocks.service.getSign(signDto(), VALID_USER_ID);

      expect(signature).toMatch(/^0x[0-9a-f]+$/i);
      expect(entitlement).toHaveBeenCalledWith(VALID_USER_ID);
    });

    it('rejects stale caller amount or conversion claims instead of signing them', async () => {
      mocks.userModel.findById.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
        address: VALID_ADDRESS,
        wallet_frozen: false,
      });
      jest.spyOn(mocks.service, 'checkWithdraw').mockResolvedValue({
        netAmount: '12.50',
        data: [{ conversion_id: 7 }, { conversion_id: 9 }],
      } as never);
      jest
        .spyOn(mocks.service, 'getConversionIdsWithdrawedByUserId')
        .mockResolvedValue([]);
      mocks.withdrawModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });

      await expect(
        mocks.service.getSign(
          { ...signDto(), totalCashbackAmount: '99' },
          VALID_USER_ID,
        ),
      ).rejects.toMatchObject({ status: 409 });
      await expect(
        mocks.service.getSign(
          { ...signDto(), conversionIdHashes: ['7', '10'] },
          VALID_USER_ID,
        ),
      ).rejects.toMatchObject({ status: 409 });
    });

    it('uses the post-reservation, post-adjustment ledger amount rather than legacy conversion total', async () => {
      mocks.userModel.findById.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
        address: VALID_ADDRESS,
        wallet_frozen: false,
      });
      const authoritativeLedger = jest
        .spyOn(mocks.service, 'checkWithdraw')
        .mockResolvedValue({
          // Represents 100 earned minus a 60 bank reservation and a 15 admin
          // debit. Signature issuance must expose only the remaining 25.
          netAmount: 25,
          data: [{ conversion_id: 7 }, { conversion_id: 9 }],
        } as never);
      const legacyLedger = jest.spyOn(mocks.service, 'checkWithdraw2');
      jest
        .spyOn(mocks.service, 'getConversionIdsWithdrawedByUserId')
        .mockResolvedValue([]);
      mocks.withdrawModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });

      await expect(
        mocks.service.getSign(
          { ...signDto(), totalCashbackAmount: '100' },
          VALID_USER_ID,
        ),
      ).rejects.toMatchObject({ status: 409 });

      await expect(
        mocks.service.getSign(
          { ...signDto(), totalCashbackAmount: '25' },
          VALID_USER_ID,
        ),
      ).resolves.toMatch(/^0x[0-9a-f]+$/i);
      expect(authoritativeLedger).toHaveBeenCalled();
      expect(legacyLedger).not.toHaveBeenCalled();
    });

    it('atomically reserves the signed amount and conversions before returning a spendable signature', async () => {
      mocks.userModel.findById.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
        address: VALID_ADDRESS,
        wallet_frozen: false,
      });
      mocks.userModel.findOneAndUpdate.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
        address: VALID_ADDRESS,
      });
      jest.spyOn(mocks.service, 'checkWithdraw').mockResolvedValue({
        netAmount: '12.50',
        data: [{ conversion_id: 7 }, { conversion_id: 9 }],
      } as never);
      jest
        .spyOn(mocks.service, 'getConversionIdsWithdrawedByUserId')
        .mockResolvedValue([]);
      mocks.withdrawModel.findOne.mockReturnValue(queryResult(null));
      mocks.withdrawModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });
      mocks.withdrawModel.create.mockImplementation(
        async ([record]: [Record<string, unknown>]) => [
          { ...record, _id: new Types.ObjectId() },
        ],
      );

      await expect(
        mocks.service.getSign(signDto(), VALID_USER_ID),
      ).resolves.toMatch(/^0x[0-9a-f]+$/i);

      expect(mocks.userModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: new Types.ObjectId(VALID_USER_ID),
          wallet_frozen: { $ne: true },
        },
        { $inc: { withdraw_lock_seq: 1 } },
        { session: expect.anything() },
      );
      expect(mocks.withdrawModel.create).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            amount_net: 12.5,
            amount_total: 12.5,
            authorization_expires_at: expect.any(Date),
            chain: '137',
            conversion_id: [7, 9],
            currency: 'USD',
            method: 'on_chain_signature',
            status: 'pending',
          }),
        ],
        { session: expect.anything() },
      );
    });

    it('returns the byte-identical stored signature when an exact lost-response retry has under 30 seconds remaining', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-07-18T12:00:00.000Z'));
      mocks.userModel.findById.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
        address: VALID_ADDRESS,
        wallet_frozen: false,
      });
      const storedSignature = `0x${'3'.repeat(130)}`;
      const dto = signDto();
      jest.advanceTimersByTime(275_000);
      const amount = ethers.parseUnits(dto.totalCashbackAmount, 6);
      const requestHash = effectHash({
        address: VALID_ADDRESS.toLowerCase(),
        amount: amount.toString(),
        chain: 137,
        conversion_ids: ['7', '9'],
        expire_at: dto.expireAt,
      });
      mocks.withdrawModel.findOne.mockReturnValue(
        queryResult({
          _id: new Types.ObjectId(),
          authorization_expires_at: new Date(Number(dto.expireAt) * 1000),
          authorization_signature: storedSignature,
          authorization_slot_active: true,
          authorization_state: 'issued',
          idempotency_effect_hash: requestHash,
          method: 'on_chain_signature',
          status: 'pending',
        }),
      );
      const ledger = jest.spyOn(mocks.service, 'checkWithdraw');

      await expect(mocks.service.getSign(dto, VALID_USER_ID)).resolves.toBe(
        storedSignature,
      );
      expect(ledger).not.toHaveBeenCalled();
      expect(mocks.withdrawModel.create).not.toHaveBeenCalled();
    });

    it('rejects an exact lost-response retry after the stored authorization actually expired', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-07-18T12:00:00.000Z'));
      mocks.userModel.findById.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
        address: VALID_ADDRESS,
        wallet_frozen: false,
      });
      const dto = { ...signDto(), expireAt: String(1_784_376_060) };
      const amount = ethers.parseUnits(dto.totalCashbackAmount, 6);
      const requestHash = effectHash({
        address: VALID_ADDRESS.toLowerCase(),
        amount: amount.toString(),
        chain: 137,
        conversion_ids: ['7', '9'],
        expire_at: dto.expireAt,
      });
      mocks.withdrawModel.findOne.mockReturnValue(
        queryResult({
          _id: new Types.ObjectId(),
          authorization_expires_at: new Date(Number(dto.expireAt) * 1000),
          authorization_signature: `0x${'3'.repeat(130)}`,
          authorization_slot_active: true,
          authorization_state: 'issued',
          idempotency_effect_hash: requestHash,
          method: 'on_chain_signature',
          status: 'pending',
        }),
      );
      const ledger = jest.spyOn(mocks.service, 'checkWithdraw');
      jest.advanceTimersByTime(61_000);

      await expect(
        mocks.service.getSign(dto, VALID_USER_ID),
      ).rejects.toMatchObject({ status: 409 });

      expect(mocks.withdrawModel.findOne).toHaveBeenCalledWith({
        idempotency_key: `signature:${requestHash}`,
        user_id: new Types.ObjectId(VALID_USER_ID),
      });
      expect(ledger).not.toHaveBeenCalled();
      expect(mocks.withdrawModel.create).not.toHaveBeenCalled();
    });
  });

  describe('expired signature reconciliation', () => {
    it('keeps an unconfirmed expired authorization reserved instead of treating absence as proof of non-use', async () => {
      jest
        .mocked(mocks.service.reconcileExpiredSignatureReservations)
        .mockRestore();
      const expired = {
        _id: new Types.ObjectId(),
        authorization_expires_at: new Date(Date.now() - 30 * 60_000),
        authorization_slot_active: true,
        authorization_state: 'issued',
        chain: '137',
        conversion_id: [1],
        method: 'on_chain_signature',
        status: 'pending',
      };
      mocks.withdrawModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([expired]),
      });
      mocks.userModel.findOneAndUpdate.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
      });
      jest
        .spyOn(mocks.service, 'getConversionIdsWithdrawedByUserId')
        .mockResolvedValue([]);
      mocks.withdrawModel.findOneAndUpdate.mockResolvedValue(expired);

      await expect(
        mocks.service.reconcileExpiredSignatureReservations(VALID_USER_ID),
      ).rejects.toMatchObject({ status: 503 });

      expect(mocks.withdrawModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: expired._id,
          authorization_slot_active: true,
          status: 'pending',
        }),
        expect.objectContaining({
          $set: expect.objectContaining({
            authorization_state: 'expired_unverified',
            flag_reason: 'signature_expired_chain_unconfirmed',
          }),
        }),
        { session: expect.anything() },
      );
      const update = mocks.withdrawModel.findOneAndUpdate.mock.calls[0][1];
      expect(update.$set.status).toBeUndefined();
      expect(update.$set.chain_record_state).toBeUndefined();
    });
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

    it('createManualWithdrawRequest > given a frozen wallet > then rejects before balance reservation or insert', async () => {
      const frozenUser = {
        _id: new Types.ObjectId(VALID_USER_ID),
        email: 'member@gogocash.co',
        wallet_frozen: true,
      };
      mocks.userModel.findOne.mockResolvedValue(frozenUser);
      mocks.userModel.findOneAndUpdate.mockResolvedValue(null);

      await expect(
        mocks.service.createManualWithdrawRequest(dto, VALID_USER_ID),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(mocks.withdrawModel.create).not.toHaveBeenCalled();
    });

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
      mocks.userModel.findOneAndUpdate.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
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
      mocks.userModel.findOneAndUpdate.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
      });
      jest
        .spyOn(mocks.service, 'checkWithdraw')
        .mockResolvedValue({ netAmount: 100 } as never);
      const created = { _id: 'w1', amount_net: 50 };
      mocks.withdrawModel.create.mockResolvedValue([created]);

      const result = await mocks.service.createManualWithdrawRequest(
        { ...dto, amount: 50 },
        VALID_USER_ID,
      );

      expect(result).toEqual({ success: true, data: created });
      expect(mocks.withdrawModel.create).toHaveBeenCalledTimes(1);
      const persisted = mocks.withdrawModel.create.mock.calls[0][0][0];
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
      expect(mocks.userModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: new Types.ObjectId(VALID_USER_ID),
          wallet_frozen: { $ne: true },
        },
        { $inc: { withdraw_lock_seq: 1 } },
        { session: expect.anything() },
      );
    });

    it('createManualWithdrawRequest > given a concurrent duplicate (Mongo 11000) > then surfaces HTTP 409 one-at-a-time error', async () => {
      // The partial unique index rejects a second pending manual request; the
      // service must translate the raw 11000 into a user-facing 409, not 500.
      mocks.userModel.findOne.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
        email: 'member@gogocash.co',
      });
      mocks.userModel.findOneAndUpdate.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
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
      mocks.userModel.findOneAndUpdate.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
      });
      mocks.withdrawModel.findOne.mockReturnValue(queryResult(null));
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
          'idem-over-usd',
        ),
      ).rejects.toMatchObject({ status: 400 });
      expect(onChain).not.toHaveBeenCalled();
      expect(mocks.withdrawModel.create).not.toHaveBeenCalled();
    });

    it('create > given requested THB amount exceeds available THB balance > then rejects with HTTP 400', async () => {
      mocks.userModel.findOne.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
      });
      mocks.userModel.findOneAndUpdate.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
      });
      mocks.withdrawModel.findOne.mockReturnValue(queryResult(null));
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
          'idem-over-thb',
        ),
      ).rejects.toMatchObject({ status: 400 });
      expect(mocks.withdrawModel.create).not.toHaveBeenCalled();
    });

    it('createBankTransfer > given requested amount exceeds available balance > then rejects with HTTP 400 and does not create a record', async () => {
      mocks.userModel.findOne.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
      });
      mocks.userModel.findOneAndUpdate.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
      });
      mocks.withdrawModel.findOne.mockReturnValue(queryResult(null));
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
          {
            account_name: 'Alice',
            account_number: '0012345678',
            amount_net: 100,
            amount_total: 100,
            bank_name: 'KBANK',
            currency: 'USD',
          } as never,
          VALID_USER_ID,
          'idem-over-balance',
        ),
      ).rejects.toMatchObject({ status: 400 });
      expect(mocks.withdrawModel.create).not.toHaveBeenCalled();
    });

    it('createBankTransfer > given client amount_total is zero > then reserves the validated amount_net server-side', async () => {
      const userId = new Types.ObjectId(VALID_USER_ID);
      mocks.userModel.findOne.mockResolvedValue({
        _id: userId,
        username: 'alice',
      });
      mocks.userModel.findOneAndUpdate.mockResolvedValue({ _id: userId });
      mocks.feeRateModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          minimum_withdraw_thb: 100,
          minimum_withdraw_usd: 5,
          fee_withdraw_thb: 20,
          fee_withdraw_usd: 1,
        }),
      });
      jest
        .spyOn(mocks.service, 'checkWithdraw')
        .mockResolvedValue({ netAmount: 1_000, netAmountTHB: 35_000 } as never);
      jest
        .spyOn(mocks.service, 'checkWithdrawMyCashback')
        .mockResolvedValue({ availableTHB: 0, availableUSD: 0 } as never);
      mocks.withdrawModel.findOne.mockReturnValue(queryResult(null));
      mocks.withdrawModel.create.mockResolvedValue([
        {
          _id: new Types.ObjectId(),
          amount_net: 500,
          withdraw_fee_final: 1,
        },
      ]);

      await mocks.service.createBankTransfer(
        {
          account_name: 'Alice',
          account_number: '0012345678',
          amount_net: 500,
          amount_total: 0,
          bank_name: 'KBANK',
          currency: 'USD',
        } as never,
        VALID_USER_ID,
        'idem-server-amount',
      );

      const persisted = mocks.withdrawModel.create.mock.calls[0][0][0];
      expect(persisted.amount_net).toBe(500);
      expect(persisted.amount_total).toBe(500);
      expect(mocks.adminActivity.appendRequired).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'withdraw.created',
          actor_type: 'customer',
          actor_id: VALID_USER_ID,
          actor_label: 'alice',
          metadata: expect.objectContaining({
            amount_net: 500,
            currency: 'USD',
            method: 'bank_transfer',
          }),
        }),
        expect.anything(),
      );
      expect(mocks.adminActivity.append).not.toHaveBeenCalled();
    });

    it('createBankTransfer > given server MyCashback > then companion is linked and classified as bank transfer', async () => {
      const userId = new Types.ObjectId(VALID_USER_ID);
      const myCashbackId = new Types.ObjectId();
      mocks.userModel.findOne.mockResolvedValue({ _id: userId });
      mocks.userModel.findOneAndUpdate.mockResolvedValue({ _id: userId });
      mocks.withdrawModel.findOne.mockReturnValue(queryResult(null));
      mocks.feeRateModel.findOne.mockReturnValue(
        queryResult({
          minimum_withdraw_thb: 1,
          minimum_withdraw_usd: 1,
          fee_withdraw_thb: 0,
          fee_withdraw_usd: 0,
        }),
      );
      jest
        .spyOn(mocks.service, 'checkWithdraw')
        .mockResolvedValue({ netAmount: 100, netAmountTHB: 3_500 } as never);
      jest.spyOn(mocks.service, 'checkWithdrawMyCashback').mockResolvedValue({
        availableTHB: 50,
        availableUSD: 0,
        conversionIdMyCashback: [myCashbackId],
      } as never);
      const primaryId = new Types.ObjectId();
      mocks.withdrawModel.create
        .mockResolvedValueOnce([{ _id: primaryId }])
        .mockResolvedValueOnce([{ _id: new Types.ObjectId() }]);

      await mocks.service.createBankTransfer(
        {
          account_name: 'Alice',
          account_number: '0012345678',
          amount_net: 500,
          bank_name: 'KBANK',
          currency: 'THB',
        } as never,
        VALID_USER_ID,
        'idem-bank-mcb',
      );

      const companion = mocks.withdrawModel.create.mock.calls[1][0][0];
      expect(companion).toMatchObject({
        amount_net: 50,
        amount_total: 50,
        method: 'bank_transfer',
        status: 'pending',
      });
      expect(String(companion.parent_withdraw_id)).toBe(String(primaryId));
      expect(companion.mycashback_id.map(String)).toEqual([
        String(myCashbackId),
      ]);
    });

    it('createBankTransfer > given an exact command replay > then returns the original before fee or balance work', async () => {
      const userId = new Types.ObjectId(VALID_USER_ID);
      const existing = {
        _id: new Types.ObjectId(),
        idempotency_effect_hash: effectHash({
          account_name: 'Alice',
          account_number: '0012345678',
          amount_net: 500,
          bank_name: 'KBANK',
          coupon_code: null,
          currency: 'THB',
        }),
        status: 'pending',
      };
      mocks.userModel.findOne.mockResolvedValue({ _id: userId });
      mocks.userModel.findOneAndUpdate.mockResolvedValue({ _id: userId });
      mocks.withdrawModel.findOne.mockReturnValue(queryResult(existing));
      const balance = jest.spyOn(mocks.service, 'checkWithdraw');

      const result = await mocks.service.createBankTransfer(
        {
          account_name: 'Alice',
          account_number: '0012345678',
          amount_net: 500,
          bank_name: 'KBANK',
          currency: 'THB',
        } as never,
        VALID_USER_ID,
        'idem-bank-replay',
      );

      expect(result).toMatchObject({ data: existing, reused: true });
      expect(mocks.feeRateModel.findOne).not.toHaveBeenCalled();
      expect(balance).not.toHaveBeenCalled();
      expect(mocks.withdrawModel.create).not.toHaveBeenCalled();
      expect(mocks.adminActivity.appendRequired).not.toHaveBeenCalled();
      expect(mocks.adminActivity.append).not.toHaveBeenCalled();
    });

    it('createBankTransfer > given a reused key with a different effect > then rejects without a write', async () => {
      const userId = new Types.ObjectId(VALID_USER_ID);
      mocks.userModel.findOne.mockResolvedValue({ _id: userId });
      mocks.userModel.findOneAndUpdate.mockResolvedValue({ _id: userId });
      mocks.withdrawModel.findOne.mockReturnValue(
        queryResult({ idempotency_effect_hash: 'different' }),
      );

      await expect(
        mocks.service.createBankTransfer(
          {
            account_name: 'Alice',
            account_number: '0012345678',
            amount_net: 500,
            bank_name: 'KBANK',
            currency: 'THB',
          } as never,
          VALID_USER_ID,
          'idem-bank-conflict',
        ),
      ).rejects.toMatchObject({ status: 409 });
      expect(mocks.withdrawModel.create).not.toHaveBeenCalled();
    });

    it('createBankTransfer > given a legacy client without a command header > then assigns an isolated compatibility key', async () => {
      const userId = new Types.ObjectId(VALID_USER_ID);
      mocks.userModel.findOne.mockResolvedValue({ _id: userId });
      mocks.userModel.findOneAndUpdate.mockResolvedValue({ _id: userId });
      mocks.withdrawModel.findOne.mockReturnValue(queryResult(null));
      mocks.feeRateModel.findOne.mockReturnValue(
        queryResult({
          minimum_withdraw_thb: 1,
          minimum_withdraw_usd: 1,
          fee_withdraw_thb: 0,
          fee_withdraw_usd: 0,
        }),
      );
      jest
        .spyOn(mocks.service, 'checkWithdraw')
        .mockResolvedValue({ netAmount: 100, netAmountTHB: 3_500 } as never);
      jest
        .spyOn(mocks.service, 'checkWithdrawMyCashback')
        .mockResolvedValue({ availableTHB: 0, availableUSD: 0 } as never);
      mocks.withdrawModel.create.mockResolvedValue([
        { _id: new Types.ObjectId() },
      ]);

      await mocks.service.createBankTransfer(
        {
          account_name: 'Alice',
          account_number: '0012345678',
          amount_net: 500,
          bank_name: 'KBANK',
          currency: 'THB',
        } as never,
        VALID_USER_ID,
      );

      const persisted = mocks.withdrawModel.create.mock.calls[0][0][0];
      expect(persisted.idempotency_key).toMatch(/^legacy:/);
    });

    it('createBankTransfer > given a no-header retry after a lost response > then reconciles the prior legacy effect', async () => {
      const userId = new Types.ObjectId(VALID_USER_ID);
      const existing = {
        _id: new Types.ObjectId(),
        idempotency_effect_hash: effectHash({
          account_name: 'Alice',
          account_number: '0012345678',
          amount_net: 500,
          bank_name: 'KBANK',
          coupon_code: null,
          currency: 'THB',
        }),
        idempotency_key: 'legacy:original-command',
        status: 'pending',
      };
      mocks.userModel.findOne.mockResolvedValue({ _id: userId });
      mocks.userModel.findOneAndUpdate.mockResolvedValue({ _id: userId });
      mocks.withdrawModel.findOne.mockReturnValue(queryResult(existing));

      const result = await mocks.service.createBankTransfer(
        {
          account_name: 'Alice',
          account_number: '0012345678',
          amount_net: 500,
          bank_name: 'KBANK',
          currency: 'THB',
        } as never,
        VALID_USER_ID,
      );

      expect(result).toMatchObject({ data: existing, reused: true });
      expect(mocks.feeRateModel.findOne).not.toHaveBeenCalled();
      expect(mocks.withdrawModel.create).not.toHaveBeenCalled();
      expect(mocks.withdrawModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          idempotency_effect_hash: existing.idempotency_effect_hash,
          idempotency_key: /^legacy:/,
          status: { $ne: 'rejected' },
        }),
      );
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
      jest.spyOn(mocks.service, 'checkWithdraw').mockResolvedValue({
        data: [{ conversion_id: 1 }],
        netAmount: 1000,
        netAmountTHB: 1000,
      } as never);
      jest
        .spyOn(mocks.service, 'createRecordOnChain')
        .mockResolvedValue('0xrecord' as never);
      jest
        .spyOn(mocks.service, 'checkWithdrawMyCashback')
        .mockResolvedValue({ availableTHB: 0, availableUSD: 0 } as never);
      mocks.withdrawModel.create.mockResolvedValue([{ _id: 'w1' }]);
      mocks.withdrawModel.findOne.mockReturnValue(queryResult(null));
      mocks.withdrawModel.findOneAndUpdate.mockResolvedValue({
        _id: 'w1',
        status: 'pending',
        tx_hash_record: '0xrecord',
      });
    };

    it('create > given a client tx_hash > then persists status "pending" (no client self-approval)', async () => {
      setupCreate();
      mocks.withdrawModel.findOne.mockReturnValue(queryResult(null));

      await mocks.service.create(
        {
          amount_net: 10,
          amount_total: 10,
          chain: 137,
          conversion_ids: [1],
          currency: 'USD',
          tx_hash: `0x${'A'.repeat(64)}`,
        } as never,
        VALID_USER_ID,
      );

      const persisted = mocks.withdrawModel.create.mock.calls[0][0][0];
      expect(persisted.status).toBe('pending');
      expect(persisted.tx_hash).toBe(`0x${'a'.repeat(64)}`);
    });

    it('approveWithdrawRequest > given a malformed id > then rejects with HTTP 400 without a lookup', async () => {
      await expect(
        mocks.service.approveWithdrawRequest(
          'not-an-id',
          adminActor('admin-1'),
        ),
      ).rejects.toMatchObject({ status: 400 });
      expect(mocks.withdrawModel.findById).not.toHaveBeenCalled();
    });

    it('approveWithdrawRequest > given a missing withdrawal > then rejects with HTTP 404', async () => {
      mocks.withdrawModel.findById.mockResolvedValue(null);
      await expect(
        mocks.service.approveWithdrawRequest(
          VALID_WITHDRAW_ID,
          adminActor('admin-1'),
        ),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('approveWithdrawRequest > given an already-approved record > then returns it unchanged (idempotent, no second write)', async () => {
      const existing = { _id: VALID_WITHDRAW_ID, status: 'approved' };
      mocks.withdrawModel.findById.mockResolvedValue(existing);
      const result = await mocks.service.approveWithdrawRequest(
        VALID_WITHDRAW_ID,
        adminActor('admin-1'),
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
        mocks.service.approveWithdrawRequest(
          VALID_WITHDRAW_ID,
          adminActor('admin-1'),
        ),
      ).rejects.toMatchObject({ status: 409 });
      expect(mocks.withdrawModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('approveWithdrawRequest > given a bank transfer > then requires the evidence-verified workflow', async () => {
      mocks.withdrawModel.findById.mockResolvedValue({
        _id: VALID_WITHDRAW_ID,
        method: 'bank_transfer',
        status: 'pending',
      });

      await expect(
        mocks.service.approveWithdrawRequest(
          VALID_WITHDRAW_ID,
          adminActor('admin-1'),
        ),
      ).rejects.toMatchObject({ status: 409 });
      expect(mocks.withdrawModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('approveWithdrawRequest > given semantically verified payout evidence > then sets status approved and writes the audit in the same transaction', async () => {
      jest
        .spyOn(mocks.service, 'assertAutoPayoutEvidence')
        .mockResolvedValue(undefined);
      mocks.withdrawModel.findById.mockResolvedValue({
        address: VALID_ADDRESS,
        amount_net: 10,
        authorization_contract: `0x${'1'.repeat(40)}`,
        chain_record_chain_id: 137,
        _id: VALID_WITHDRAW_ID,
        status: 'pending',
        tx_hash: VALID_TX_HASH,
        user_id: new Types.ObjectId(VALID_USER_ID),
      });
      mocks.userModel.findOneAndUpdate.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
      });
      mocks.withdrawModel.findOneAndUpdate.mockResolvedValue({
        _id: VALID_WITHDRAW_ID,
        status: 'approved',
      });
      mocks.withdrawModel.updateMany.mockResolvedValue({ modifiedCount: 1 });

      const result = await mocks.service.approveWithdrawRequest(
        VALID_WITHDRAW_ID,
        adminActor('admin-7'),
      );

      expect(result).toMatchObject({ success: true });
      const [, update] = mocks.withdrawModel.findOneAndUpdate.mock.calls[0];
      expect(update.$set).toMatchObject({
        status: 'approved',
        approved_by: 'admin-7',
      });
      expect(update.$set.approved_at).toBeInstanceOf(Date);
      expect(mocks.withdrawModel.updateMany).toHaveBeenCalledWith(
        {
          parent_withdraw_id: new Types.ObjectId(VALID_WITHDRAW_ID),
          status: 'pending',
        },
        { $set: { status: 'approved' } },
        { session: expect.anything() },
      );
      expect(mocks.adminActivity.appendRequired).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'withdraw.approved',
          actor_id: 'admin-7',
          entity_id: VALID_WITHDRAW_ID,
        }),
        expect.anything(),
      );
      expect(mocks.adminActivity.append).not.toHaveBeenCalled();
    });

    it('approveWithdrawRequest > given only the server recordConversionId receipt > then rejects because it is not payout settlement evidence', async () => {
      mocks.withdrawModel.findById.mockResolvedValue({
        _id: VALID_WITHDRAW_ID,
        status: 'pending',
        user_id: new Types.ObjectId(VALID_USER_ID),
        tx_hash: '',
        tx_hash_record: VALID_TX_HASH,
        chain_record_state: 'recorded',
      });

      await expect(
        mocks.service.approveWithdrawRequest(
          VALID_WITHDRAW_ID,
          adminActor('admin-7'),
        ),
      ).rejects.toMatchObject({ status: 409 });
      expect(mocks.withdrawModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('approveWithdrawRequest > given a successful contract receipt but no authoritative payout ABI or event semantics > then keeps the balance reserved for manual review', async () => {
      const receipt = jest
        .spyOn(mocks.service, 'requireSuccessfulPayoutReceipt')
        .mockResolvedValue({
          hash: VALID_TX_HASH,
          status: 1,
          to: `0x${'1'.repeat(40)}`,
        });
      mocks.withdrawModel.findById.mockResolvedValue({
        address: VALID_ADDRESS,
        amount_net: 10,
        authorization_amount_atomic: ethers.parseUnits('10', 6).toString(),
        authorization_contract: `0x${'1'.repeat(40)}`,
        authorization_chain_id: 137,
        _id: VALID_WITHDRAW_ID,
        status: 'pending',
        tx_hash: VALID_TX_HASH,
        user_id: new Types.ObjectId(VALID_USER_ID),
        withdraw_mode: 'auto',
      });

      await expect(
        mocks.service.approveWithdrawRequest(
          VALID_WITHDRAW_ID,
          adminActor('admin-7'),
        ),
      ).rejects.toMatchObject({ status: 503 });

      expect(receipt).toHaveBeenCalledWith(
        137,
        VALID_TX_HASH,
        `0x${'1'.repeat(40)}`,
      );
      expect(mocks.withdrawModel.findOneAndUpdate).not.toHaveBeenCalled();
      expect(mocks.adminActivity.appendRequired).not.toHaveBeenCalled();
    });

    it('approveWithdrawRequest > given a required audit write failure > then aborts the privileged transition', async () => {
      jest
        .spyOn(mocks.service, 'assertAutoPayoutEvidence')
        .mockResolvedValue(undefined);
      mocks.withdrawModel.findById.mockResolvedValue({
        _id: VALID_WITHDRAW_ID,
        status: 'pending',
        tx_hash: VALID_TX_HASH,
        user_id: new Types.ObjectId(VALID_USER_ID),
        withdraw_mode: 'auto',
      });
      mocks.userModel.findOneAndUpdate.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
      });
      mocks.withdrawModel.findOneAndUpdate.mockResolvedValue({
        _id: VALID_WITHDRAW_ID,
        status: 'approved',
      });
      mocks.withdrawModel.updateMany.mockResolvedValue({ modifiedCount: 0 });
      mocks.adminActivity.appendRequired.mockRejectedValue(
        new Error('audit unavailable'),
      );

      await expect(
        mocks.service.approveWithdrawRequest(
          VALID_WITHDRAW_ID,
          adminActor('admin-7'),
        ),
      ).rejects.toThrow('audit unavailable');
      expect(mocks.adminActivity.append).not.toHaveBeenCalled();
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
      jest.spyOn(mocks.service, 'checkWithdraw').mockResolvedValue({
        data: [{ conversion_id: 1 }],
        netAmount: 1000,
        netAmountTHB: 1000,
      } as never);
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
        .mockResolvedValueOnce([{ _id: 'w-mcb' }]);
      mocks.withdrawModel.findOne.mockReturnValue(queryResult(null));
      mocks.withdrawModel.findOneAndUpdate.mockResolvedValue({
        _id: 'w-main',
        status: 'pending',
        tx_hash_record: '0xrecord',
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
        'idem-mcb',
      );

      expect(mocks.withdrawModel.create).toHaveBeenCalledTimes(2);
      const autoRecord = mocks.withdrawModel.create.mock.calls[1][0][0];
      // The companion may reserve at most the server-validated command amount,
      // even when the account has more MyCashback available.
      expect(autoRecord.amount_net).toBe(10);
      expect(autoRecord.method).toBe('on_chain');
      expect(String(autoRecord.parent_withdraw_id)).toBe('w-main');
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
      jest.spyOn(mocks.service, 'checkWithdraw').mockResolvedValue({
        data: [{ conversion_id: 1 }],
        netAmount: 1000,
        netAmountTHB: 1000,
      } as never);
      jest
        .spyOn(mocks.service, 'checkWithdrawMyCashback')
        .mockResolvedValue({ availableTHB: 0, availableUSD: 0 } as never);
      mocks.withdrawModel.create.mockResolvedValue([{ _id: 'w1' }]);
      mocks.withdrawModel.findOne.mockReturnValue(queryResult(null));
      mocks.withdrawModel.findOneAndUpdate.mockResolvedValue({
        _id: 'w1',
        status: 'pending',
        tx_hash_record: '0xrecord',
      });
    };

    it('promotes a matching signed reservation instead of creating and deducting a second primary', async () => {
      const authorizationId = new Types.ObjectId();
      const authorization = {
        _id: authorizationId,
        address: VALID_ADDRESS,
        amount_net: 10,
        authorization_amount_atomic: ethers.parseUnits('10', 6).toString(),
        authorization_chain_id: 137,
        authorization_contract: `0x${'1'.repeat(40)}`,
        authorization_slot_active: true,
        authorization_state: 'executed_unclaimed',
        conversion_id: [1],
        status: 'pending',
      };
      const promoted = {
        ...authorization,
        authorization_slot_active: false,
        authorization_state: 'submitted',
        chain_record_state: 'recorded',
        idempotency_key: 'idem-promote-signature',
        method: 'metamask',
        tx_hash: VALID_TX_HASH,
      };
      mocks.userModel.findOne.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
      });
      mocks.userModel.findOneAndUpdate.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
      });
      mocks.withdrawModel.findOne.mockImplementation((filter) => {
        if (filter?.authorization_slot_active === true) {
          return queryResult(authorization);
        }
        return queryResult(null);
      });
      mocks.withdrawModel.findOneAndUpdate.mockResolvedValue(promoted);
      jest
        .spyOn(mocks.service, 'checkWithdrawMyCashback')
        .mockResolvedValue({ availableTHB: 0, availableUSD: 0 } as never);
      const balance = jest.spyOn(mocks.service, 'checkWithdraw');
      const onChain = jest.spyOn(mocks.service, 'createRecordOnChain');

      const result = await mocks.service.create(
        {
          address: VALID_ADDRESS,
          amount_net: 10,
          chain: 137,
          conversion_ids: [1],
          currency: 'USD',
          method: 'metamask',
          tx_hash: VALID_TX_HASH,
        } as never,
        VALID_USER_ID,
        'idem-promote-signature',
      );

      expect(result).toMatchObject({ status: 'success', data: promoted });
      expect(balance).not.toHaveBeenCalled();
      expect(onChain).not.toHaveBeenCalled();
      expect(mocks.withdrawModel.create).not.toHaveBeenCalled();
      expect(mocks.withdrawModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: authorizationId,
          authorization_slot_active: true,
        }),
        expect.objectContaining({
          $set: expect.objectContaining({
            authorization_slot_active: false,
            authorization_state: 'submitted',
            idempotency_key: 'idem-promote-signature',
          }),
        }),
        { new: true, session: expect.anything() },
      );
    });

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
        'idem-reserve-success',
      );

      expect(callOrder).toEqual(['create', 'onChain']);
      const persisted = mocks.withdrawModel.create.mock.calls[0][0][0];
      expect(persisted.tx_hash_record).toBe('');
      expect(persisted.chain_record_state).toBe('reserved');
      expect(persisted.chain_record_chain_id).toBe(137);
      expect(persisted.chain_record_attempts).toBe(0);
      expect(persisted.chain_record_lease_until).toBeUndefined();
      expect(mocks.withdrawModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: 'w1',
          chain_record_state: { $in: ['processing', 'broadcast'] },
          status: 'pending',
          tx_hash_record: { $in: ['', null] },
        },
        {
          $set: {
            chain_record_confirmed_at: expect.any(Date),
            chain_record_state: 'recorded',
            tx_hash_record: '0xrecord',
          },
          $unset: {
            chain_record_lease_until: 1,
            chain_record_lease_owner: 1,
          },
        },
        { new: true },
      );
    });

    it('persists the canonical broadcast hash before awaiting final chain evidence', async () => {
      setupCreate();
      const claimed = {
        _id: 'w1',
        chain_record_state: 'processing',
        status: 'pending',
      };
      const broadcast = {
        ...claimed,
        chain_record_broadcast_hash: VALID_TX_HASH,
        chain_record_state: 'broadcast',
      };
      mocks.withdrawModel.findOneAndUpdate
        .mockResolvedValueOnce(claimed)
        .mockResolvedValueOnce(broadcast)
        .mockResolvedValueOnce({
          ...broadcast,
          chain_record_state: 'recorded',
          tx_hash_record: VALID_TX_HASH,
        });
      const observedStates: string[] = [];
      jest
        .spyOn(mocks.service, 'createRecordOnChain')
        .mockImplementation(async (_userId, _chainId, _ids, onBroadcast) => {
          observedStates.push('submitted');
          await onBroadcast?.(VALID_TX_HASH);
          observedStates.push('hash-persisted');
          return VALID_TX_HASH;
        });

      await mocks.service.create(
        {
          amount_net: 10,
          currency: 'USD',
          chain: 137,
          conversion_ids: [1],
        } as never,
        VALID_USER_ID,
        'idem-broadcast-evidence',
      );

      expect(observedStates).toEqual(['submitted', 'hash-persisted']);
      expect(mocks.withdrawModel.findOneAndUpdate).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          _id: 'w1',
          chain_record_state: 'processing',
          chain_record_lease_owner: expect.any(String),
        }),
        expect.objectContaining({
          $set: expect.objectContaining({
            chain_record_broadcast_hash: VALID_TX_HASH,
            chain_record_state: 'broadcast',
          }),
        }),
        { new: true },
      );
    });

    it('create > given an ambiguous RPC failure > then keeps the durable reservation for reconciliation', async () => {
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
          'idem-reserve-failure',
        ),
      ).rejects.toMatchObject({ status: 503 });

      expect(mocks.withdrawModel.updateMany).not.toHaveBeenCalled();
    });

    it('create > given a mined reverted receipt > then rejects primary and companions atomically', async () => {
      setupCreate();
      jest
        .spyOn(mocks.service, 'createRecordOnChain')
        .mockRejectedValue(
          new ChainRecordRejectedError('transaction reverted') as never,
        );
      mocks.withdrawModel.findOneAndUpdate.mockResolvedValue({
        _id: 'w1',
        status: 'rejected',
      });
      mocks.withdrawModel.updateMany.mockResolvedValue({ modifiedCount: 1 });

      await expect(
        mocks.service.create(
          {
            amount_net: 10,
            currency: 'USD',
            chain: 137,
            conversion_ids: [1],
          } as never,
          VALID_USER_ID,
          'idem-reserve-reverted',
        ),
      ).rejects.toMatchObject({ status: 502 });

      expect(mocks.withdrawModel.updateMany).toHaveBeenCalledWith(
        {
          parent_withdraw_id: 'w1',
          status: 'pending',
        },
        {
          $set: {
            flag_reason: 'on_chain_record_failed',
            status: 'rejected',
          },
        },
        { session: expect.anything() },
      );
    });

    it('create > given external payout evidence and a reverted chain record > then preserves the reservation for review', async () => {
      setupCreate();
      jest
        .spyOn(mocks.service, 'createRecordOnChain')
        .mockRejectedValue(
          new ChainRecordRejectedError('transaction reverted') as never,
        );
      mocks.withdrawModel.findOneAndUpdate.mockResolvedValue({
        _id: 'w1',
        chain_record_state: 'processing',
        status: 'pending',
        tx_hash: VALID_TX_HASH,
      });

      await expect(
        mocks.service.create(
          {
            amount_net: 10,
            currency: 'USD',
            chain: 137,
            conversion_ids: [1],
            tx_hash: VALID_TX_HASH,
          } as never,
          VALID_USER_ID,
          'idem-external-payout-record-reverted',
        ),
      ).rejects.toMatchObject({ status: 502 });

      expect(mocks.withdrawModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: 'w1',
          chain_record_state: { $in: ['processing', 'broadcast'] },
          status: 'pending',
          tx_hash: VALID_TX_HASH,
        },
        {
          $set: {
            chain_record_state: 'failed',
            flagged: true,
            flag_reason: 'chain_record_failed_after_external_submission',
          },
          $unset: {
            chain_record_lease_owner: 1,
            chain_record_lease_until: 1,
          },
        },
        { new: true },
      );
      expect(mocks.withdrawModel.updateMany).not.toHaveBeenCalled();
    });

    it('create > given no tx hash or command key > then rejects before reserving funds', async () => {
      mocks.userModel.findOne.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
      });

      await expect(
        mocks.service.create(
          {
            amount_net: 10,
            currency: 'USD',
            chain: 137,
            conversion_ids: [1],
          } as never,
          VALID_USER_ID,
        ),
      ).rejects.toMatchObject({ status: 400 });

      expect(mocks.userModel.findOneAndUpdate).not.toHaveBeenCalled();
      expect(mocks.withdrawModel.create).not.toHaveBeenCalled();
    });

    it('create > given an exact retry after reservation commit > then never records on-chain twice', async () => {
      const existing = {
        chain_record_lease_until: new Date(Date.now() + 60_000),
        chain_record_state: 'processing',
        _id: 'w-existing',
        status: 'pending',
        tx_hash_record: '',
        idempotency_effect_hash: effectHash({
          address: '',
          amount_net: 10,
          chain: 137,
          conversion_ids: [1],
          currency: 'USD',
          method: 'on_chain',
          tx_hash: '',
        }),
      };
      mocks.userModel.findOne.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
      });
      mocks.userModel.findOneAndUpdate.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
      });
      mocks.withdrawModel.findOne.mockReturnValue(queryResult(existing));
      const onChain = jest.spyOn(mocks.service, 'createRecordOnChain');

      const result = await mocks.service.create(
        {
          amount_net: 10,
          currency: 'USD',
          chain: 137,
          conversion_ids: [1],
        } as never,
        VALID_USER_ID,
        'idem-onchain-replay',
      );

      expect(result).toMatchObject({
        data: existing,
        reused: true,
        status: 'processing',
      });
      expect(onChain).not.toHaveBeenCalled();
      expect(mocks.withdrawModel.create).not.toHaveBeenCalled();
    });

    it('create > given a reused key with a changed amount > then rejects without network work', async () => {
      mocks.userModel.findOne.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
      });
      mocks.userModel.findOneAndUpdate.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
      });
      mocks.withdrawModel.findOne.mockReturnValue(
        queryResult({ idempotency_effect_hash: 'different' }),
      );
      const onChain = jest.spyOn(mocks.service, 'createRecordOnChain');

      await expect(
        mocks.service.create(
          {
            amount_net: 11,
            currency: 'USD',
            chain: 137,
            conversion_ids: [1],
          } as never,
          VALID_USER_ID,
          'idem-onchain-conflict',
        ),
      ).rejects.toMatchObject({ status: 409 });
      expect(onChain).not.toHaveBeenCalled();
      expect(mocks.withdrawModel.create).not.toHaveBeenCalled();
    });

    it('create > given chain failure after another actor changed status > then refuses an unsafe rollback', async () => {
      setupCreate();
      jest
        .spyOn(mocks.service, 'createRecordOnChain')
        .mockRejectedValue(
          new ChainRecordRejectedError('transaction reverted') as never,
        );
      mocks.withdrawModel.findOneAndUpdate
        .mockResolvedValueOnce({
          _id: 'w1',
          chain_record_state: 'processing',
          status: 'pending',
        })
        .mockResolvedValueOnce(null);

      await expect(
        mocks.service.create(
          {
            amount_net: 10,
            currency: 'USD',
            chain: 137,
            conversion_ids: [1],
          } as never,
          VALID_USER_ID,
          'idem-onchain-cas-lost',
        ),
      ).rejects.toMatchObject({ status: 409 });
    });

    it('create > given a stale crashed lease without broadcast evidence > then never risks a second broadcast', async () => {
      const existing = {
        _id: 'w-stale',
        chain_record_lease_until: new Date(Date.now() - 60_000),
        chain_record_state: 'processing',
        idempotency_effect_hash: effectHash({
          address: '',
          amount_net: 10,
          chain: 137,
          conversion_ids: [1],
          currency: 'USD',
          method: 'on_chain',
          tx_hash: '',
        }),
        status: 'pending',
        tx_hash_record: '',
      };
      mocks.userModel.findOne.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
      });
      mocks.userModel.findOneAndUpdate.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
      });
      mocks.withdrawModel.findOne.mockReturnValue(queryResult(existing));
      jest
        .spyOn(mocks.service, 'getConversionIdsWithdrawedByUserId')
        .mockResolvedValue([]);
      mocks.withdrawModel.findOneAndUpdate.mockResolvedValue({
        ...existing,
        chain_record_lease_until: new Date(Date.now() + 60_000),
      });
      const onChain = jest.spyOn(mocks.service, 'createRecordOnChain');

      const result = await mocks.service.create(
        {
          amount_net: 10,
          currency: 'USD',
          chain: 137,
          conversion_ids: [1],
        } as never,
        VALID_USER_ID,
        'idem-stale-recovery',
      );

      expect(onChain).not.toHaveBeenCalled();
      expect(result).toMatchObject({ reused: true, status: 'processing' });
    });

    it('create > given a broadcast still pending after the lease > then reconciles that hash and never rebroadcasts', async () => {
      const existing = {
        _id: 'w-slow-pending',
        chain_record_broadcast_hash: VALID_TX_HASH,
        chain_record_lease_until: new Date(Date.now() - 60_000),
        chain_record_state: 'processing',
        idempotency_effect_hash: effectHash({
          address: '',
          amount_net: 10,
          chain: 137,
          conversion_ids: [1],
          currency: 'USD',
          method: 'on_chain',
          tx_hash: '',
        }),
        status: 'pending',
        tx_hash_record: '',
      };
      mocks.userModel.findOne.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
      });
      mocks.userModel.findOneAndUpdate.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
      });
      mocks.withdrawModel.findOne.mockReturnValue(queryResult(existing));
      jest
        .spyOn(mocks.service, 'getChainRecordReceiptState')
        .mockResolvedValue('pending');
      jest
        .spyOn(mocks.service, 'getConversionIdsWithdrawedByUserId')
        .mockResolvedValue([]);
      mocks.withdrawModel.findOneAndUpdate.mockResolvedValue({
        ...existing,
        chain_record_lease_until: new Date(Date.now() + 60_000),
      });
      const onChain = jest.spyOn(mocks.service, 'createRecordOnChain');

      const result = await mocks.service.create(
        {
          amount_net: 10,
          currency: 'USD',
          chain: 137,
          conversion_ids: [1],
        } as never,
        VALID_USER_ID,
        'idem-slow-pending',
      );

      expect(onChain).not.toHaveBeenCalled();
      expect(mocks.withdrawModel.updateMany).not.toHaveBeenCalled();
      expect(result).toMatchObject({ reused: true, status: 'processing' });
    });

    it('create > given a replayed broadcast with a reverted receipt > then rejects without rebroadcasting', async () => {
      const existing = {
        _id: 'w-reverted-broadcast',
        chain_record_broadcast_hash: VALID_TX_HASH,
        chain_record_state: 'broadcast',
        idempotency_effect_hash: effectHash({
          address: '',
          amount_net: 10,
          chain: 137,
          conversion_ids: [1],
          currency: 'USD',
          method: 'on_chain',
          tx_hash: '',
        }),
        status: 'pending',
        tx_hash: '',
        tx_hash_record: '',
      };
      mocks.userModel.findOne.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
      });
      mocks.userModel.findOneAndUpdate.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
      });
      mocks.withdrawModel.findOne.mockReturnValue(queryResult(existing));
      mocks.withdrawModel.findOneAndUpdate.mockResolvedValue({
        ...existing,
        chain_record_state: 'failed',
        status: 'rejected',
      });
      mocks.withdrawModel.updateMany.mockResolvedValue({ modifiedCount: 1 });
      jest
        .spyOn(mocks.service, 'getChainRecordReceiptState')
        .mockResolvedValue('rejected');
      const onChain = jest.spyOn(mocks.service, 'createRecordOnChain');

      await expect(
        mocks.service.create(
          {
            amount_net: 10,
            currency: 'USD',
            chain: 137,
            conversion_ids: [1],
          } as never,
          VALID_USER_ID,
          'idem-reverted-broadcast',
        ),
      ).rejects.toMatchObject({ status: 502 });

      expect(onChain).not.toHaveBeenCalled();
      expect(mocks.withdrawModel.updateMany).toHaveBeenCalledWith(
        { parent_withdraw_id: 'w-reverted-broadcast', status: 'pending' },
        {
          $set: {
            flag_reason: 'on_chain_record_failed',
            status: 'rejected',
          },
        },
        { session: expect.anything() },
      );
    });

    it('create > given stale lease but conversions already on-chain > then reconciles without a second broadcast', async () => {
      const existing = {
        _id: 'w-reconciled',
        chain_record_lease_until: new Date(Date.now() - 60_000),
        chain_record_state: 'processing',
        idempotency_effect_hash: effectHash({
          address: '',
          amount_net: 10,
          chain: 137,
          conversion_ids: [1],
          currency: 'USD',
          method: 'on_chain',
          tx_hash: '',
        }),
        status: 'pending',
        tx_hash_record: '',
      };
      mocks.userModel.findOne.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
      });
      mocks.userModel.findOneAndUpdate.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
      });
      mocks.withdrawModel.findOne.mockReturnValue(queryResult(existing));
      jest
        .spyOn(mocks.service, 'getConversionIdsWithdrawedByUserId')
        .mockResolvedValue(['1']);
      mocks.withdrawModel.findOneAndUpdate.mockResolvedValue({
        ...existing,
        chain_record_state: 'recorded',
      });
      const onChain = jest.spyOn(mocks.service, 'createRecordOnChain');

      const result = await mocks.service.create(
        {
          amount_net: 10,
          currency: 'USD',
          chain: 137,
          conversion_ids: [1],
        } as never,
        VALID_USER_ID,
        'idem-chain-reconciled',
      );

      expect(onChain).not.toHaveBeenCalled();
      expect(result).toMatchObject({ reused: true, status: 'success' });
    });
  });

  // ---------------------------------------------------------------------------
  // markWithdrawPaid — admin settlement, idempotency, terminal-state guards.
  // ---------------------------------------------------------------------------
  describe('markWithdrawPaid', () => {
    const paidDto = { tx_hash: VALID_TX_HASH };

    it('markWithdrawPaid > given a malformed withdraw id > then rejects with HTTP 400 without a lookup', async () => {
      await expect(
        mocks.service.markWithdrawPaid(
          'not-an-objectid',
          paidDto,
          adminActor('admin-1'),
        ),
      ).rejects.toMatchObject({ status: 400 });
      expect(mocks.withdrawModel.findById).not.toHaveBeenCalled();
    });

    it('markWithdrawPaid > given a missing withdrawal > then rejects with HTTP 404', async () => {
      mocks.withdrawModel.findById.mockResolvedValue(null);

      await expect(
        mocks.service.markWithdrawPaid(
          VALID_WITHDRAW_ID,
          paidDto,
          adminActor('admin-1'),
        ),
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
        mocks.service.markWithdrawPaid(
          VALID_WITHDRAW_ID,
          paidDto,
          adminActor('admin-1'),
        ),
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
        tx_hash: VALID_TX_HASH,
      };
      mocks.withdrawModel.findOneAndUpdate.mockResolvedValue(null);
      mocks.withdrawModel.findById.mockResolvedValue(existing);

      const result = await mocks.service.markWithdrawPaid(
        VALID_WITHDRAW_ID,
        paidDto,
        adminActor('admin-1'),
      );

      expect(result).toEqual({ success: true, data: existing });
      expect(mocks.withdrawModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('markWithdrawPaid > given a concurrent different tx hash already won > then rejects instead of overwriting payout proof', async () => {
      mocks.withdrawModel.findOneAndUpdate.mockResolvedValue(null);
      mocks.withdrawModel.findById.mockResolvedValue({
        withdraw_mode: 'manual',
        status: 'paid',
        tx_hash: '0x' + 'c'.repeat(64),
      });

      await expect(
        mocks.service.markWithdrawPaid(
          VALID_WITHDRAW_ID,
          paidDto,
          adminActor('admin-1'),
        ),
      ).rejects.toMatchObject({ status: 409 });
    });

    it('markWithdrawPaid > given a rejected (non-pending terminal) record > then rejects with HTTP 409 and does not write', async () => {
      // A rejected/approved row must not be silently resurrected to paid.
      mocks.withdrawModel.findById.mockResolvedValue({
        withdraw_mode: 'manual',
        status: 'rejected',
      });

      await expect(
        mocks.service.markWithdrawPaid(
          VALID_WITHDRAW_ID,
          paidDto,
          adminActor('admin-1'),
        ),
      ).rejects.toMatchObject({ status: 409 });
      expect(mocks.withdrawModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('markWithdrawPaid > given a successful Celo receipt but no authoritative stablecoin contract semantics > then keeps the balance reserved for manual review', async () => {
      const receipt = jest
        .spyOn(mocks.service, 'requireSuccessfulPayoutReceipt')
        .mockResolvedValue({
          hash: VALID_TX_HASH,
          status: 1,
          to: `0x${'5'.repeat(40)}`,
        });
      mocks.withdrawModel.findById.mockResolvedValue({
        _id: VALID_WITHDRAW_ID,
        address: VALID_ADDRESS,
        amount_net: 50,
        chain: 'CELO',
        currency: 'USDT',
        status: 'pending',
        user_id: new Types.ObjectId(VALID_USER_ID),
        withdraw_mode: 'manual',
      });

      await expect(
        mocks.service.markWithdrawPaid(
          VALID_WITHDRAW_ID,
          paidDto,
          adminActor('admin-99'),
        ),
      ).rejects.toMatchObject({ status: 503 });

      expect(receipt).toHaveBeenCalledWith(42220, VALID_TX_HASH);
      expect(mocks.withdrawModel.findOneAndUpdate).not.toHaveBeenCalled();
      expect(mocks.adminActivity.appendRequired).not.toHaveBeenCalled();
    });

    it('markWithdrawPaid > given semantically verified payout evidence > then sets status paid and writes the audit in the same transaction', async () => {
      const userId = new Types.ObjectId();
      jest
        .spyOn(mocks.service, 'assertManualPayoutEvidence')
        .mockResolvedValue(undefined);
      const updated = {
        _id: VALID_WITHDRAW_ID,
        user_id: userId,
        amount_net: 50,
        currency: 'USDT',
        method: 'minipay_manual',
      };
      mocks.withdrawModel.findById.mockResolvedValue({
        _id: VALID_WITHDRAW_ID,
        user_id: userId,
        withdraw_mode: 'manual',
        status: 'pending',
      });
      mocks.userModel.findOneAndUpdate.mockResolvedValue({ _id: userId });
      mocks.withdrawModel.findOne.mockReturnValue(queryResult(null));
      mocks.withdrawModel.findOneAndUpdate.mockResolvedValue(updated);

      const result = await mocks.service.markWithdrawPaid(
        VALID_WITHDRAW_ID,
        paidDto,
        adminActor('admin-99'),
      );

      expect(result).toEqual({ success: true, data: updated });
      const [filter, update] =
        mocks.withdrawModel.findOneAndUpdate.mock.calls[0];
      expect(filter).toMatchObject({
        status: 'pending',
        withdraw_mode: 'manual',
      });
      expect(update.$set).toMatchObject({
        status: 'paid',
        tx_hash: VALID_TX_HASH,
        paid_by: 'admin-99',
      });
      expect(update.$set.paid_at).toBeInstanceOf(Date);
      expect(mocks.adminActivity.appendRequired).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'withdraw.marked_paid',
          actor_id: 'admin-99',
          entity_id: VALID_WITHDRAW_ID,
        }),
        expect.anything(),
      );
      expect(mocks.adminActivity.append).not.toHaveBeenCalled();
    });

    it('markWithdrawPaid > given a duplicate tx_hash (Mongo 11000) on update > then rejects with HTTP 409', async () => {
      // The same on-chain tx_hash must not be reusable across two withdrawals.
      const userId = new Types.ObjectId();
      jest
        .spyOn(mocks.service, 'assertManualPayoutEvidence')
        .mockResolvedValue(undefined);
      mocks.withdrawModel.findById.mockResolvedValue({
        _id: VALID_WITHDRAW_ID,
        user_id: userId,
        withdraw_mode: 'manual',
        status: 'pending',
      });
      mocks.userModel.findOneAndUpdate.mockResolvedValue({ _id: userId });
      mocks.withdrawModel.findOne.mockReturnValue(queryResult(null));
      mocks.withdrawModel.findOneAndUpdate.mockRejectedValue({ code: 11000 });

      await expect(
        mocks.service.markWithdrawPaid(
          VALID_WITHDRAW_ID,
          paidDto,
          adminActor('admin-1'),
        ),
      ).rejects.toMatchObject({ status: 409 });
    });

    it('markWithdrawPaid > given a required audit write failure > then aborts the privileged transition', async () => {
      const userId = new Types.ObjectId();
      jest
        .spyOn(mocks.service, 'assertManualPayoutEvidence')
        .mockResolvedValue(undefined);
      mocks.withdrawModel.findById.mockResolvedValue({
        _id: VALID_WITHDRAW_ID,
        user_id: userId,
        withdraw_mode: 'manual',
        status: 'pending',
      });
      mocks.userModel.findOneAndUpdate.mockResolvedValue({ _id: userId });
      mocks.withdrawModel.findOne.mockReturnValue(queryResult(null));
      mocks.withdrawModel.findOneAndUpdate.mockResolvedValue({
        _id: VALID_WITHDRAW_ID,
        amount_net: 50,
        currency: 'USDT',
      });
      mocks.adminActivity.appendRequired.mockRejectedValue(
        new Error('audit unavailable'),
      );

      await expect(
        mocks.service.markWithdrawPaid(
          VALID_WITHDRAW_ID,
          paidDto,
          adminActor('admin-1'),
        ),
      ).rejects.toThrow('audit unavailable');
      expect(mocks.adminActivity.append).not.toHaveBeenCalled();
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

    it('checkWithdraw > given wallet credits and debits > then they change authoritative spendable balance', async () => {
      const userDoc = { _id: new Types.ObjectId(VALID_USER_ID) };
      mocks.userModel.findOne.mockResolvedValue(userDoc);
      mocks.feeRateModel.findOne.mockReturnValue(
        queryResult({ system: 0, max_cap: 1000 }),
      );
      mocks.conversionModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });
      mocks.withdrawModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });
      mocks.walletAdjustmentModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { amount: 100, currency: 'USD', type: 'credit' },
          { amount: 25, currency: 'USD', type: 'debit' },
        ]),
      });
      jest
        .spyOn(mocks.service, 'convertCurrencyThb')
        .mockImplementation(async (_currency, amount) => ({
          amount: amount * 35,
          exchangeRate: 35,
        }));
      jest.spyOn(mocks.service, 'checkWithdrawMyCashback').mockResolvedValue({
        availableTHB: 0,
        availableUSD: 0,
        conversionIdMyCashback: [],
        totalMyCashbackTHB: 0,
        totalMyCashbackUSD: 0,
      });

      const result = await mocks.service.checkWithdraw(VALID_USER_ID);

      expect(result.walletAdjustmentUSD).toBe(75);
      expect(result.walletAdjustmentTHB).toBe(2_625);
      expect(result.netAmount).toBe(75);
      expect(result.netAmountTHB).toBe(2_625);
    });
  });

  describe('checkWithdraw2 on-chain reconciliation', () => {
    it('excludes canonical string ids already recorded on-chain', async () => {
      mocks.userModel.findOne.mockResolvedValue({
        _id: new Types.ObjectId(VALID_USER_ID),
      });
      mocks.feeRateModel.findOne.mockReturnValue(
        queryResult({
          fee_withdraw_thb: 0,
          fee_withdraw_usd: 0,
          minimum_withdraw_thb: 0,
          system: 0,
        }),
      );
      jest
        .spyOn(mocks.service, 'getConversionIdsWithdrawedByUserId')
        .mockResolvedValueOnce(['7'])
        .mockResolvedValue([]);
      mocks.conversionModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            conversion_id: 7,
            currency: 'USD',
            offer_name: 'merchant',
            payout: 10,
          },
          {
            conversion_id: 9,
            currency: 'USD',
            offer_name: 'merchant',
            payout: 20,
          },
        ]),
      });
      mocks.withdrawModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });
      jest
        .spyOn(mocks.service, 'convertCurrencyThb')
        .mockImplementation(async (_currency, amount) => ({
          amount: amount * 35,
          exchangeRate: 35,
        }));

      const result = await mocks.service.checkWithdraw2(VALID_USER_ID);

      expect(result.data.map((item) => item.conversion_id)).toEqual([9]);
      expect(result.netAmount).toBe('20.00');
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
