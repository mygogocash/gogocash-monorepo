import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import {
  CreateManualWithdrawRequestDto,
  CreateWithdrawDto,
  GETSignDTO,
  GetWithdrawTransactionsDTO,
  MarkWithdrawPaidDto,
  PreviewWithdrawFeeDto,
  RequestCreateRewardList,
} from './dto/create-withdraw.dto';
import {
  WithdrawFeeCoupon,
  type WithdrawFeeCouponDocument,
} from './schemas/withdraw-fee-coupon.schema';
import { WithdrawFeeCouponRedemption } from './schemas/withdraw-fee-coupon-redemption.schema';
import {
  normalizeWithdrawFeeCouponCode,
  resolveWithdrawFeePreview,
  type WithdrawFeeCouponLike,
} from './resolve-withdraw-fee';
import {
  CreateWithdrawMethod,
  UpdateWithdrawDto,
} from './dto/update-withdraw.dto';
import { ethers, keccak256, solidityPacked } from 'ethers';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { User } from 'src/user/schemas/user.schema';
import {
  ClientSession,
  Connection,
  isValidObjectId,
  Model,
  Types,
} from 'mongoose';
import { InvolveService } from 'src/involve/involve.service';
import { Withdraw, type WithdrawDocument } from './schemas/withdraw.schema';
import { FeeRate } from './schemas/feeRate.schema';
import { Offer } from 'src/offer/schemas/offer.schema';
import { WithdrawMethod } from './schemas/withdrawMethod.schema';
import { rateCurrencyUSD, thaiBanks } from 'src/utils/helper';
import { escapeRegexLiteral } from 'src/common/escape-regex';
import { buildAutoMyCashbackWithdrawFields } from './withdraw-mycashback-auto';
import { UserMyCashback } from 'src/user/schemas/user-my-cashback.schema';
import { Conversion } from './schemas/conversion.schema';
import { AdminActivityService } from 'src/admin/activity/admin-activity.service';
import type { AdminActor } from 'src/admin/activity/admin-activity.actor';
import { WalletAdjustment } from 'src/admin/wallets/schemas/wallet-adjustment.schema';
import { RewardList } from './schemas/rewardList.schema';
import { PointService } from 'src/point/point.service';
import { Quest } from 'src/point/schemas/quest.schema';
import { RequestCreateConversionReward } from 'src/user/dto/create-conversion-reward.dto';
import {
  affSub1ForUserId,
  buildApprovedUserConversionsFilter,
  buildUserConversionScopeFilter,
} from './conversion-user-id.util';
import {
  mongoEq,
  mongoFilter,
  mongoSetUpdate,
  requireObjectId,
  requireOneOf,
  requireTrimmedString,
} from 'src/common/mongo-query';
import {
  legacyQuestRewardFilter,
  legacyRankPayoutKey,
  legacySyntheticConversionId,
} from 'src/tasks/legacy-reward-identity';
import {
  assertLegacyRewardManifest,
  legacyQuestPayoutConfigChecksum,
  legacyRewardManifestKey,
  LegacyRewardManifest,
} from 'src/tasks/legacy-reward-manifest';
import { requireCanonicalEvmTransactionHash } from './evm-transaction-hash';
import {
  ChainRecordRejectedError,
  configuredWithdrawChainIds,
  requireSuccessfulChainRecord,
  resolveWithdrawChainConfig,
} from './withdraw-chain';

const MAX_UINT256 = (1n << 256n) - 1n;
const CHAIN_RECORD_LEASE_MS = 10 * 60 * 1000;
const SIGNATURE_RESERVATION_METHOD = 'on_chain_signature';
const SIGNATURE_RECONCILIATION_GRACE_MS = 10 * 60 * 1000;

function canonicalUint256(value: unknown): string | null {
  const raw = String(value ?? '').trim();
  if (!/^\d+$/.test(raw)) return null;
  const parsed = BigInt(raw);
  return parsed <= MAX_UINT256 ? parsed.toString() : null;
}

@Injectable()
export class WithdrawService {
  private readonly logger = new Logger(WithdrawService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Withdraw.name) private withdrawModel: Model<Withdraw>,
    @InjectModel(FeeRate.name) private feeRateModel: Model<FeeRate>,
    @InjectModel(Offer.name) private offerModel: Model<Offer>,
    @InjectModel(Conversion.name) private conversionModel: Model<Conversion>,
    @InjectModel(RewardList.name) private rewardListModel: Model<RewardList>,
    @InjectModel(Quest.name) private questModel: Model<Quest>,
    @InjectModel(WithdrawMethod.name)
    private withdrawMethodModel: Model<WithdrawMethod>,
    @InjectModel(UserMyCashback.name)
    private userMyCashbackModel: Model<UserMyCashback>,
    @InjectModel(WithdrawFeeCoupon.name)
    private withdrawFeeCouponModel: Model<WithdrawFeeCoupon>,
    @InjectModel(WithdrawFeeCouponRedemption.name)
    private withdrawFeeCouponRedemptionModel: Model<WithdrawFeeCouponRedemption>,
    @InjectModel(WalletAdjustment.name)
    private walletAdjustmentModel: Model<WalletAdjustment>,
    private readonly involveService: InvolveService,
    private readonly pointService: PointService,
    @InjectConnection() private readonly connection: Connection,
    private readonly adminActivity: AdminActivityService,
  ) {}

  private toCouponLike(doc: WithdrawFeeCouponDocument): WithdrawFeeCouponLike {
    return {
      _id: String(doc._id),
      code: doc.code,
      name: doc.name,
      discount_mode: doc.discount_mode,
      discount_value: doc.discount_value,
      currency: doc.currency,
      disabled: doc.disabled,
      start_at: doc.start_at,
      end_at: doc.end_at,
      quantity: doc.quantity,
      quantity_used: doc.quantity_used,
      unlimited_quantity: doc.unlimited_quantity,
      usage_per_user: doc.usage_per_user,
      applies_to: doc.applies_to,
      min_withdraw_amount: doc.min_withdraw_amount,
    };
  }

  private previewFailureMessage(reason: string): string {
    switch (reason) {
      case 'below_minimum':
        return 'Amount is below the minimum withdrawal.';
      case 'insufficient_balance':
        return 'Insufficient cashback balance.';
      case 'negative_receive':
        return 'Withdrawal amount is too low after fees.';
      case 'coupon_disabled':
        return 'This coupon is disabled.';
      case 'coupon_not_started':
        return 'This coupon is not active yet.';
      case 'coupon_expired':
        return 'This coupon has expired.';
      case 'coupon_exhausted':
        return 'This coupon has no remaining uses.';
      case 'coupon_user_limit':
        return 'You have already used this coupon.';
      case 'coupon_currency_mismatch':
        return 'This coupon does not apply to the selected currency.';
      case 'coupon_method_mismatch':
        return 'This coupon does not apply to the selected withdrawal method.';
      default:
        return 'Unable to preview withdrawal fee.';
    }
  }

  async previewWithdrawFee(dto: PreviewWithdrawFeeDto, userId: string) {
    const fee = await this.feeRateModel.findOne().exec();
    if (!fee) {
      throw new HttpException(
        {
          message:
            'Withdrawals are temporarily unavailable. Please try again later or contact support.',
        },
        400,
      );
    }

    const currency = dto.currency || 'THB';
    const method = dto.method || 'bank_transfer';
    const balance = await this.checkWithdraw(userId);
    const availableBalance =
      currency === 'THB'
        ? Number(balance.netAmountTHB || 0)
        : Number(balance.netAmount || 0);

    let coupon: WithdrawFeeCouponLike | null = null;
    let userRedemptionCount = 0;
    if (dto.coupon_code?.trim()) {
      const code = normalizeWithdrawFeeCouponCode(dto.coupon_code);
      const found = await this.withdrawFeeCouponModel.findOne({ code }).exec();
      if (!found) {
        throw new HttpException({ message: 'Coupon code not found.' }, 400);
      }
      coupon = this.toCouponLike(found);
      userRedemptionCount = await this.withdrawFeeCouponRedemptionModel
        .countDocuments({
          coupon_id: found._id,
          user_id: new Types.ObjectId(userId),
        })
        .exec();
    }

    const preview = resolveWithdrawFeePreview({
      feeRate: fee,
      amount: dto.amount,
      availableBalance,
      currency,
      method,
      coupon,
      userRedemptionCount,
    });

    if (preview.ok === false) {
      throw new HttpException(
        { message: this.previewFailureMessage(preview.reason) },
        400,
      );
    }
    return preview;
  }

  async getSign(
    msg: GETSignDTO,
    authenticatedUserId: string | undefined,
  ): Promise<string> {
    if (
      !authenticatedUserId ||
      !isValidObjectId(authenticatedUserId) ||
      msg.userid !== authenticatedUserId
    ) {
      throw new ForbiddenException(
        'Withdrawal authorizations can only be issued for the signed-in user.',
      );
    }

    const user = await this.userModel.findById(authenticatedUserId);
    if (!user) {
      throw new UnauthorizedException({ message: 'User not found' });
    }
    if (user.wallet_frozen) {
      throw new ForbiddenException({
        message: 'Your wallet is frozen. Contact support before withdrawing.',
      });
    }
    if (
      !user.address ||
      !ethers.isAddress(user.address) ||
      !ethers.isAddress(msg.userAddress) ||
      ethers.getAddress(user.address) !== ethers.getAddress(msg.userAddress)
    ) {
      throw new ForbiddenException(
        'The payout address does not match the wallet linked to this account.',
      );
    }

    const chain = resolveWithdrawChainConfig(msg.chain);
    const expireAt = BigInt(msg.expireAt);
    const now = BigInt(Math.floor(Date.now() / 1000));
    if (expireAt < now + 30n || expireAt > now + 10n * 60n) {
      throw new BadRequestException(
        'Withdrawal authorization expiry must be 30 seconds to 10 minutes from now.',
      );
    }

    const requestedConversionIds = [
      ...new Set(msg.conversionIdHashes.map((id) => BigInt(id).toString())),
    ].sort((left, right) => (BigInt(left) < BigInt(right) ? -1 : 1));
    let requestedAmount: bigint;
    try {
      requestedAmount = ethers.parseUnits(
        msg.totalCashbackAmount,
        chain.decimal,
      );
    } catch {
      throw new BadRequestException('Invalid withdrawal amount.');
    }
    if (requestedAmount <= 0n) {
      throw new BadRequestException('Invalid withdrawal amount.');
    }

    // Validate signing configuration before committing a reservation. A crash
    // after commit is still safe: an exact retry reuses the durable command.
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY_WITHDRAW);
    const normalizedAddress = ethers.getAddress(user.address);
    const authorizationEffectHash = createHash('sha256')
      .update(
        JSON.stringify({
          address: normalizedAddress.toLowerCase(),
          amount: requestedAmount.toString(),
          chain: chain.chainId,
          conversion_ids: requestedConversionIds,
          expire_at: expireAt.toString(),
        }),
      )
      .digest('hex');
    const authorizationKey = `signature:${authorizationEffectHash}`;
    const domain = {
      name: 'CashbackLedger',
      version: '1',
      chainId: chain.chainId,
      verifyingContract: chain.contract,
    };
    const types = {
      WithdrawAuthBatch: [
        { name: 'userid', type: 'string' },
        { name: 'userAddress', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'expireAt', type: 'uint64' },
        { name: 'conversionIdsHash', type: 'bytes32' },
      ],
    };
    const signAuthorization = async (
      conversionIds: string[],
      amount: bigint,
    ) => {
      let conversionIdsHash = ethers.ZeroHash;
      for (const conversionId of conversionIds) {
        conversionIdsHash = keccak256(
          solidityPacked(
            ['bytes32', 'uint256'],
            [conversionIdsHash, conversionId],
          ),
        );
      }
      const signature = await wallet.signTypedData(domain, types, {
        userid: authenticatedUserId,
        userAddress: normalizedAddress,
        amount: amount.toString(),
        expireAt,
        conversionIdsHash,
      });
      return { conversionIdsHash, signature };
    };

    // An expired signature cannot simply disappear: it may have been mined.
    // Reconcile it against chain state before making another spendable promise.
    await this.reconcileExpiredSignatureReservations(authenticatedUserId);

    const reservation = await this.runSerializedWithdraw(
      authenticatedUserId,
      async (session, lockedUser) => {
        if (
          !lockedUser.address ||
          !ethers.isAddress(lockedUser.address) ||
          ethers.getAddress(lockedUser.address) !== normalizedAddress
        ) {
          throw new ConflictException(
            'The linked payout address changed while authorization was being prepared.',
          );
        }
        const existingCommand = await this.withdrawModel
          .findOne({
            user_id: new Types.ObjectId(authenticatedUserId),
            idempotency_key: authorizationKey,
          })
          .session(session)
          .exec();
        if (existingCommand) {
          if (
            existingCommand.idempotency_effect_hash !==
              authorizationEffectHash ||
            existingCommand.method !== SIGNATURE_RESERVATION_METHOD ||
            existingCommand.status !== 'pending' ||
            existingCommand.authorization_state !== 'issued' ||
            existingCommand.authorization_slot_active !== true ||
            !existingCommand.authorization_signature
          ) {
            throw new ConflictException(
              'This withdrawal authorization is no longer reusable.',
            );
          }
          return {
            record: existingCommand,
            signature: existingCommand.authorization_signature,
          };
        }

        const activeAuthorization = await this.withdrawModel
          .findOne({
            user_id: new Types.ObjectId(authenticatedUserId),
            authorization_slot_active: true,
          })
          .session(session)
          .exec();
        if (activeAuthorization) {
          throw new ConflictException(
            'A withdrawal authorization is already active for this account.',
          );
        }

        // Derive the promise from the same authoritative ledger used by bank,
        // manual, and server-recorded withdrawals while holding their shared
        // per-user serialization lock.
        const entitlement = await this.checkWithdraw(authenticatedUserId);
        const chainIds = configuredWithdrawChainIds();
        const [withdrawnByChain, reservedWithdrawals] = await Promise.all([
          Promise.all(
            chainIds.map((chainId) =>
              this.getConversionIdsWithdrawedByUserId(
                authenticatedUserId,
                chainId,
                true,
              ),
            ),
          ),
          this.withdrawModel
            .find({
              user_id: new Types.ObjectId(authenticatedUserId),
              status: { $in: ['pending', 'approved', 'paid'] },
              conversion_id: { $ne: [] },
            })
            .select('conversion_id')
            .lean(),
        ]);
        const unavailableConversionIds = new Set([
          ...withdrawnByChain.flat(),
          ...reservedWithdrawals.flatMap((withdrawal) =>
            (withdrawal.conversion_id ?? [])
              .map(canonicalUint256)
              .filter((id): id is string => id !== null),
          ),
        ]);
        const serverConversionIds = [
          ...new Set(
            entitlement.data
              .map((conversion) => canonicalUint256(conversion.conversion_id))
              .filter((id): id is string => id !== null)
              .filter((id) => !unavailableConversionIds.has(id)),
          ),
        ].sort((left, right) => (BigInt(left) < BigInt(right) ? -1 : 1));
        if (
          serverConversionIds.length === 0 ||
          serverConversionIds.length !== msg.conversionIdHashes.length ||
          serverConversionIds.length !== requestedConversionIds.length ||
          serverConversionIds.some(
            (conversionId, index) =>
              conversionId !== requestedConversionIds[index],
          )
        ) {
          throw new ConflictException(
            'The requested conversions no longer match your available cashback.',
          );
        }

        const authoritativeAmount = String(entitlement.netAmount);
        let serverAmount: bigint;
        try {
          serverAmount = ethers.parseUnits(authoritativeAmount, chain.decimal);
        } catch {
          throw new BadRequestException('Invalid withdrawal amount.');
        }
        if (serverAmount <= 0n || requestedAmount !== serverAmount) {
          throw new ConflictException(
            'The requested amount no longer matches your available cashback.',
          );
        }
        const numericConversionIds = serverConversionIds.map(Number);
        if (
          numericConversionIds.some(
            (conversionId) => !Number.isSafeInteger(conversionId),
          )
        ) {
          throw new BadRequestException(
            'A conversion id is too large for this withdrawal ledger.',
          );
        }

        const amount = Number(authoritativeAmount);
        const { conversionIdsHash, signature } = await signAuthorization(
          serverConversionIds,
          serverAmount,
        );
        const [record] = await this.withdrawModel.create(
          [
            {
              user_id: new Types.ObjectId(authenticatedUserId),
              status: 'pending',
              address: normalizedAddress,
              tx_hash: '',
              tx_hash_record: '',
              percent_fee: 0,
              amount_total: amount,
              amount_net: amount,
              method: SIGNATURE_RESERVATION_METHOD,
              currency: 'USD',
              conversion_id: numericConversionIds,
              mycashback_id: [],
              chain: String(chain.chainId),
              idempotency_key: authorizationKey,
              idempotency_effect_hash: authorizationEffectHash,
              chain_record_state: 'reserved',
              authorization_expires_at: new Date(Number(expireAt) * 1000),
              authorization_state: 'issued',
              authorization_request_hash: authorizationEffectHash,
              authorization_signature: signature,
              authorization_amount_atomic: serverAmount.toString(),
              authorization_conversion_hash: conversionIdsHash,
              authorization_chain_id: chain.chainId,
              authorization_contract: chain.contract.toLowerCase(),
              authorization_slot_active: true,
            },
          ],
          { session },
        );
        return { record, signature };
      },
    );
    return reservation.signature;
  }

  /**
   * Releases an expired EIP-712 reservation only after the signature is no
   * longer executable plus a conservative chain-finality grace period, and a
   * fail-closed chain read verifies whether its conversions were recorded. A
   * fully recorded batch becomes approved. Absence or a partial batch remains
   * reserved for manual review: without the contract source in this repository,
   * absence is not strong enough evidence that no payout occurred.
   */
  async reconcileExpiredSignatureReservations(userId: string): Promise<void> {
    if (!isValidObjectId(userId)) return;
    const cutoff = new Date(Date.now() - SIGNATURE_RECONCILIATION_GRACE_MS);
    const expired = await this.withdrawModel
      .find({
        user_id: new Types.ObjectId(userId),
        method: SIGNATURE_RESERVATION_METHOD,
        status: 'pending',
        authorization_expires_at: { $lte: cutoff },
      })
      .lean();
    if (expired.length === 0) return;

    const chainIds = [
      ...new Set(
        expired
          .map((record) => Number(record.chain))
          .filter((chainId) => {
            try {
              resolveWithdrawChainConfig(chainId);
              return true;
            } catch {
              return false;
            }
          }),
      ),
    ];
    if (chainIds.length === 0 || chainIds.length > expired.length) {
      throw new HttpException(
        {
          message:
            'An expired withdrawal authorization requires manual chain review.',
        },
        503,
      );
    }
    const chainState = new Map<number, Set<string>>();
    await Promise.all(
      chainIds.map(async (chainId) => {
        chainState.set(
          chainId,
          new Set(
            await this.getConversionIdsWithdrawedByUserId(
              userId,
              chainId,
              true,
            ),
          ),
        );
      }),
    );

    let unresolvedOutcome = false;
    await this.runSerializedWithdraw(userId, async (session) => {
      for (const record of expired) {
        const conversionIds = (record.conversion_id ?? [])
          .map(canonicalUint256)
          .filter((id): id is string => id !== null);
        const recorded = chainState.get(Number(record.chain));
        if (!recorded || conversionIds.length === 0) {
          unresolvedOutcome = true;
          continue;
        }
        const recordedCount = conversionIds.filter((conversionId) =>
          recorded.has(conversionId),
        ).length;
        const filter = {
          _id: record._id,
          user_id: new Types.ObjectId(userId),
          method: SIGNATURE_RESERVATION_METHOD,
          status: 'pending',
          authorization_slot_active: true,
          authorization_expires_at: { $lte: cutoff },
        };
        if (recordedCount === conversionIds.length) {
          unresolvedOutcome = true;
          await this.withdrawModel.findOneAndUpdate(
            filter,
            {
              $set: {
                authorization_state: 'executed_unclaimed',
                chain_record_confirmed_at: new Date(),
                flagged: true,
                flag_reason: 'signature_executed_unclaimed',
              },
            },
            { session },
          );
        } else {
          unresolvedOutcome = true;
          await this.withdrawModel.findOneAndUpdate(
            filter,
            {
              $set: {
                authorization_state: 'expired_unverified',
                flagged: true,
                flag_reason:
                  recordedCount === 0
                    ? 'signature_expired_chain_unconfirmed'
                    : 'signature_partial_chain_state',
              },
            },
            { session },
          );
        }
      }
    });

    if (unresolvedOutcome) {
      throw new HttpException(
        {
          message:
            'An expired withdrawal authorization requires manual chain review.',
        },
        503,
      );
    }
  }

  async getConversionIdsWithdrawedByUserId(
    userId: string,
    chainId: number,
    failClosed = false,
  ): Promise<string[]> {
    try {
      const abi = [
        {
          inputs: [{ internalType: 'string', name: 'userid', type: 'string' }],
          name: 'getConversionIdsByUserId',
          outputs: [{ internalType: 'uint256[]', name: '', type: 'uint256[]' }],
          stateMutability: 'view',
          type: 'function',
        },
      ];
      const chain = resolveWithdrawChainConfig(chainId);

      // console.log('Using contract address:', contractAddress);
      // console.log('Using contract address:', rpc);

      const provider = new ethers.JsonRpcProvider(chain.rpc);
      // const provider = new ethers.JsonRpcProvider(process.env.RPC_URL_POLYGON);
      const contract = new ethers.Contract(chain.contract, abi, provider);
      const conversionIds = await contract.getConversionIdsByUserId(userId);
      // Preserve uint256 precision and one runtime type. Number(id) both loses
      // large ids and made the downstream string lookup fail open.
      const conversionIdsStringArray: string[] = conversionIds.map((id) =>
        id.toString(),
      );
      return conversionIdsStringArray;
    } catch (error) {
      this.logger.error(
        `Unable to read on-chain conversion ids for chain ${chainId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      if (failClosed) {
        throw new HttpException(
          {
            message:
              'Withdrawal authorization is temporarily unavailable while chain state is being verified.',
          },
          503,
        );
      }
      return [];
    }
  }
  async checkWithdraw2(id: string, requireChainState = false) {
    const user = await this.userModel.findOne({
      _id: new Types.ObjectId(id),
    });
    if (!user) {
      throw new UnauthorizedException({
        message: 'Your session has expired. Please sign in again.',
      });
    }
    const fee = await this.feeRateModel.findOne().exec();
    if (!fee) {
      // Missing fee-rate config is an operational problem, not a client one.
      this.logger.error('Withdrawal blocked: no FeeRate document configured.');
      throw new HttpException(
        {
          message:
            'Withdrawals are temporarily unavailable. Please try again later or contact support.',
        },
        400,
      );
    }
    // console.log('Checking withdraw for user:', user._id.toString());
    const conversionIdsWithdrawedPolygon =
      await this.getConversionIdsWithdrawedByUserId(
        user._id.toString(),
        Number(process.env.CHAIN_ID_WITHDRAW_POLYGON),
        requireChainState,
      );

    const conversionIdsWithdrawedBNB =
      await this.getConversionIdsWithdrawedByUserId(
        user._id.toString(),
        Number(process.env.CHAIN_ID_WITHDRAW_BNB),
        requireChainState,
      );

    const conversionIdsWithdrawedSonic =
      await this.getConversionIdsWithdrawedByUserId(
        user._id.toString(),
        Number(process.env.CHAIN_ID_WITHDRAW_SONIC),
        requireChainState,
      );

    const conversionIdsWithdrawedCelo =
      await this.getConversionIdsWithdrawedByUserId(
        user._id.toString(),
        Number(process.env.CHAIN_ID_WITHDRAW_CELO),
        requireChainState,
      );
    // console.log('conversionIdsWithdrawed:', conversionIdsWithdrawed);
    const conversionIdsWithdrawed = [
      ...conversionIdsWithdrawedPolygon,
      ...conversionIdsWithdrawedBNB,
      ...conversionIdsWithdrawedSonic,
      ...conversionIdsWithdrawedCelo,
    ];
    // console.log('conversionIdsWithdrawed total:', conversionIdsWithdrawed);
    // const conversions = await this.involveService.getConversionAll({
    //   page: 1,
    //   limit: 10,
    // });

    // let allConversions = conversions.data.data;
    // let currentPage = 1;

    // while (conversions.data.nextPage) {
    //   currentPage++;
    //   const nextConversions = await this.involveService.getConversionAll({
    //     page: currentPage,
    //     limit: 10,
    //   });
    //   allConversions = allConversions.concat(nextConversions.data.data);
    //   conversions.data.nextPage = nextConversions.data.nextPage;
    // }
    const allConversions = await this.conversionModel
      .find(buildApprovedUserConversionsFilter(user._id))
      .lean();
    const withdrawList = await this.withdrawModel
      .find({
        user_id: new Types.ObjectId(user._id),
        status: { $in: ['pending', 'approved', 'paid'] },
      })
      .lean();

    const withdrawnConversionIds = withdrawList.flatMap(
      (withdraw) => withdraw.conversion_id,
    );
    // console.log('withdrawnConversionIds', withdrawnConversionIds);

    const approvedList = allConversions.filter(
      (item) =>
        !withdrawnConversionIds.includes(item.conversion_id) &&
        !conversionIdsWithdrawed.includes(item.conversion_id?.toString()),
    );

    const groupedByCurrency = approvedList.reduce(
      (acc, item) => {
        const currency = item.currency || 'unknown';
        if (!acc[currency]) {
          acc[currency] = [];
        }
        acc[currency].push(item);
        return acc;
      },
      {} as Record<string, any[]>,
    );

    const totalPayoutByCurrency = Object.entries(groupedByCurrency).reduce(
      (acc, [currency, items]) => {
        const totalPayout = (items as any[]).reduce(
          (sum, item) => sum + (Number(item.payout || 0) || 0),
          0,
        );
        acc[currency] = totalPayout;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Convert to USD
    const totalPayoutInUSD = await Promise.all(
      Object.entries(totalPayoutByCurrency).map(async ([currency, amount]) => {
        if (currency === 'USD') {
          return { currency, amount, usdAmount: amount };
        }
        // You'll need to implement currency conversion logic here
        const usdAmount = await this.convertCurrencyUsd(currency, amount);
        // const usdAmount = amount; // Placeholder - implement actual conversion
        return {
          currency,
          amount,
          usdAmount: usdAmount.usdAmount,
          exchangeRate: usdAmount.exchangeRate,
        };
      }),
    );

    // Convert to THB
    const totalPayoutInTHB = await Promise.all(
      Object.entries(totalPayoutByCurrency).map(async ([currency, amount]) => {
        // You'll need to implement currency conversion logic here
        const thbAmount = await this.convertCurrencyThb(currency, amount);
        // const usdAmount = amount; // Placeholder - implement actual conversion
        return {
          currency,
          amount,
          thbAmount: thbAmount.amount,
          exchangeRate: thbAmount.exchangeRate,
        };
      }),
    );

    const totalUSDAmount = totalPayoutInUSD.reduce(
      (sum, item) => sum + (item.usdAmount || 0),
      0,
    );

    const totalTHBAmount = totalPayoutInTHB.reduce(
      (sum, item) => sum + (item.thbAmount || 0),
      0,
    );
    // Calculate total amount after fee deduction
    const feePercentage = fee.system; // Using system fee rate
    const fee_withdraw_thb = fee.fee_withdraw_thb;
    const fee_withdraw_usd = fee.fee_withdraw_usd;
    const feeAmount = (totalUSDAmount * feePercentage) / 100;
    const netTotalUsd = totalUSDAmount - feeAmount - fee_withdraw_usd;
    const netAmount = isNaN(netTotalUsd) ? 0 : netTotalUsd;

    const feeAmountTHB = (totalTHBAmount * feePercentage) / 100;
    const netTotalThb = totalTHBAmount - feeAmountTHB - fee_withdraw_thb;
    const netAmountTHB = isNaN(netTotalThb) ? 0 : netTotalThb;

    // Check if net amount meets minimum withdrawal threshold
    const minimumWithdrawal = fee.minimum_withdraw_thb; // You can make this configurable
    if (netAmountTHB < minimumWithdrawal) {
      throw new HttpException(
        {
          message: `Minimum withdrawal amount is $${minimumWithdrawal}. Current net amount: $${netAmount.toFixed(2)}`,
          fee,
        },
        400,
      );
    }
    return {
      totalPayoutInUSD,
      netAmount: netAmount.toFixed(2),
      feeAmount: feeAmount.toFixed(2),
      totalUSDAmount: totalUSDAmount.toFixed(2),
      feePercentage,
      totalTHBAmount: totalTHBAmount.toFixed(2),
      feeAmountTHB: feeAmountTHB.toFixed(2),
      netAmountTHB: netAmountTHB.toFixed(2),
      data: approvedList,
      fee,
    };
  }

  async checkWithdraw(id: string) {
    if (!id || !isValidObjectId(id)) {
      throw new UnauthorizedException({ message: 'User not found' });
    }

    const [user, fee] = await Promise.all([
      this.userModel.findOne({
        _id: new Types.ObjectId(id),
      }),
      this.feeRateModel.findOne().exec(),
    ]);
    if (!user) {
      throw new UnauthorizedException({ message: 'User not found' });
    }
    if (!fee) {
      this.logger.error('Withdrawal blocked: no FeeRate document configured.');
      throw new HttpException(
        {
          message:
            'Withdrawals are temporarily unavailable. Please try again later or contact support.',
        },
        400,
      );
    }

    const [allConversions, withdrawList, walletAdjustments] = await Promise.all(
      [
        this.conversionModel
          .find(buildApprovedUserConversionsFilter(user._id))
          .lean(),
        this.withdrawModel
          .find({
            user_id: new Types.ObjectId(user._id),
            mycashback_id: [],
            // 'paid' MUST stay in the deduction set: once markWithdrawPaid flips a
            // withdrawal to 'paid', dropping it here re-credits the balance and
            // allows a second withdrawal of the same funds (double-withdraw).
            status: { $in: ['pending', 'approved', 'paid'] },
          })
          .lean(),
        this.walletAdjustmentModel
          .find({ user_id: new Types.ObjectId(user._id) })
          .lean(),
      ],
    );

    const payoutConversionGroupCurrency = allConversions.reduce(
      (acc, item) => {
        const currency = item.currency || 'USD';
        if (!acc[currency]) {
          acc[currency] = 0;
        }

        const payout =
          item.offer_name === 'reward_conversion_quest'
            ? item.payout
            : item.payout >= fee.max_cap
              ? fee.max_cap
              : item.payout;
        const feePercentage = fee.system;
        const feeAmount = (payout * feePercentage) / 100;
        if (item.offer_name === 'reward_conversion_quest') {
          acc[currency] += payout;
        } else {
          acc[currency] += payout - feeAmount;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    // get withdrawn ---------------------

    const withdrawnAmountByCurrency = withdrawList.reduce(
      (acc, withdraw) => {
        const currency =
          withdraw.currency == 'USDT' || withdraw.currency == 'USDC'
            ? 'USD'
            : withdraw.currency;
        if (!acc[currency]) {
          acc[currency] = 0;
        }
        acc[currency] += withdraw.amount_total || 0;
        return acc;
      },
      {} as Record<string, number>,
    );

    const sumWithdrawInUSD = await Promise.all(
      Object.entries(withdrawnAmountByCurrency).map(
        async ([currency, amount]) => {
          if (currency === 'USD') {
            return { currency, amount, usdAmount: amount };
          }
          const converted = await this.convertCurrencyUsd(currency, amount);
          return {
            currency,
            amount,
            usdAmount: converted.usdAmount,
            exchangeRate: converted.exchangeRate,
          };
        },
      ),
    );

    const sumWithdrawInTHB = await Promise.all(
      Object.entries(withdrawnAmountByCurrency).map(
        async ([currency, amount]) => {
          if (currency === 'THB') {
            return { currency, amount, thbAmount: amount };
          }
          const converted = await this.convertCurrencyThb(currency, amount);
          return {
            currency,
            amount,
            thbAmount: converted.amount,
            exchangeRate: converted.exchangeRate,
          };
        },
      ),
    );

    const availablePayoutByCurrency = Object.entries(
      payoutConversionGroupCurrency,
    ).reduce(
      (acc, [currency, amount]) => {
        // const withdrawn = withdrawnAmountByCurrency[currency] || 0;
        // console.log('withdrawn', withdrawn);
        // acc[currency] = amount - withdrawn;
        acc[currency] = amount;
        return acc;
      },
      {} as Record<string, number>,
    );

    const payoutInUSD = await Promise.all(
      Object.entries(availablePayoutByCurrency).map(
        async ([currency, amount]) => {
          if (currency === 'USD') {
            return { currency, amount, usdAmount: amount };
          }
          const converted = await this.convertCurrencyUsd(currency, amount);
          return {
            currency,
            amount,
            usdAmount: converted.usdAmount,
            exchangeRate: converted.exchangeRate,
          };
        },
      ),
    );

    const payoutInTHB = await Promise.all(
      Object.entries(availablePayoutByCurrency).map(
        async ([currency, amount]) => {
          if (currency === 'THB') {
            return { currency, amount, thbAmount: amount };
          }
          const converted = await this.convertCurrencyThb(currency, amount);
          return {
            currency,
            amount,
            thbAmount: converted.amount,
            exchangeRate: converted.exchangeRate,
          };
        },
      ),
    );

    const _totalPayoutUSD = payoutInUSD.reduce(
      (sum, item) => sum + (item.usdAmount || 0),
      0,
    );

    const _totalPayoutTHB = payoutInTHB.reduce(
      (sum, item) => sum + (item.thbAmount || 0),
      0,
    );

    const _sumWithdrawInUSD = sumWithdrawInUSD.reduce(
      (sum, item) => sum + (item.usdAmount || 0),
      0,
    );

    const _sumWithdrawInTHB = sumWithdrawInTHB.reduce(
      (sum, item) => sum + (item.thbAmount || 0),
      0,
    );

    // Administrative credits/debits are a real ledger, not display-only
    // annotations. Convert each signed entry into both authoritative balance
    // currencies so every withdrawal gate observes the same result.
    const adjustmentAmounts = walletAdjustments.map((adjustment) => {
      const amount = Number(adjustment.amount ?? 0);
      const sign =
        adjustment.type === 'credit' ? 1 : adjustment.type === 'debit' ? -1 : 0;
      return {
        amount: Number.isFinite(amount) && amount > 0 ? sign * amount : 0,
        currency: String(adjustment.currency || 'USD').toUpperCase(),
      };
    });
    const adjustmentInUSD = await Promise.all(
      adjustmentAmounts.map(async ({ amount, currency }) => {
        if (currency === 'USD' || currency === 'USDT' || currency === 'USDC') {
          return amount;
        }
        return (await this.convertCurrencyUsd(currency, amount)).usdAmount || 0;
      }),
    );
    const adjustmentInTHB = await Promise.all(
      adjustmentAmounts.map(async ({ amount, currency }) => {
        if (currency === 'THB') return amount;
        return (await this.convertCurrencyThb(currency, amount)).amount || 0;
      }),
    );
    const walletAdjustmentUSD = adjustmentInUSD.reduce(
      (sum, amount) => sum + amount,
      0,
    );
    const walletAdjustmentTHB = adjustmentInTHB.reduce(
      (sum, amount) => sum + amount,
      0,
    );

    const totalPayoutUSD = isNaN(_totalPayoutUSD)
      ? 0
      : _totalPayoutUSD - _sumWithdrawInUSD + walletAdjustmentUSD;
    const totalPayoutTHB = isNaN(_totalPayoutTHB)
      ? 0
      : _totalPayoutTHB - _sumWithdrawInTHB + walletAdjustmentTHB;

    const MCBCashback = await this.checkWithdrawMyCashback(id, user);

    // Calculate total amount after fee deduction
    // const fee_withdraw_thb = fee.fee_withdraw_thb;
    // const fee_withdraw_usd = fee.fee_withdraw_usd;
    // const payoutTotalCutFeeUSD = totalPayoutUSD;
    // const netTotalUsd = payoutTotalCutFeeUSD - fee_withdraw_usd;
    const netTotalUsd = totalPayoutUSD;

    const availableWithdrawMCBUSD =
      netTotalUsd <= MCBCashback.availableUSD
        ? netTotalUsd
        : MCBCashback && MCBCashback.availableUSD > 0
          ? MCBCashback.availableUSD
          : 0;
    // const netTotalUsdIncludeMVC = netTotalUsd + availableWithdrawMCBUSD;

    const netAmount = isNaN(netTotalUsd)
      ? 0
      : netTotalUsd > 0
        ? netTotalUsd
        : 0;

    // const payoutTotalCutFeeTHB = totalPayoutTHB;
    // const netTotalThb = payoutTotalCutFeeTHB - fee_withdraw_thb;
    const netTotalThb = totalPayoutTHB;

    const availableWithdrawMCBTHB =
      netTotalThb <= MCBCashback.availableTHB
        ? netTotalThb
        : MCBCashback && MCBCashback.availableTHB > 0
          ? MCBCashback.availableTHB
          : 0;
    // const netTotalTHBIncludeMVC = netTotalThb + availableWithdrawMCBTHB;

    const netAmountTHB = isNaN(netTotalThb)
      ? 0
      : netTotalThb > 0
        ? netTotalThb
        : 0;

    return {
      MCBCashback,
      availableWithdrawMCBTHB,
      availableWithdrawMCBUSD,
      // payoutTotalCutFeeUSD,
      // payoutTotalCutFeeTHB,
      totalPayoutTHB,
      totalPayoutUSD,
      walletAdjustmentTHB,
      walletAdjustmentUSD,
      netAmountTHB,
      netAmount,
      feeAmountTHB: fee.fee_withdraw_thb,
      feeAmount: fee.fee_withdraw_usd,
      feePercentage: fee.system,
      data: allConversions,
      fee,
    };
  }

  async listCheckWithdraw(id: string) {
    const user = await this.userModel.findOne({
      _id: new Types.ObjectId(id),
    });
    if (!user) {
      throw new UnauthorizedException({ message: 'User not found' });
    }
    const fee = await this.feeRateModel.findOne().exec();
    if (!fee) {
      this.logger.error('Withdrawal blocked: no FeeRate document configured.');
      throw new HttpException(
        {
          message:
            'Withdrawals are temporarily unavailable. Please try again later or contact support.',
        },
        400,
      );
    }

    const withdrawList = await this.withdrawModel
      .find({
        user_id: user._id, // user._id.toString(),
      })
      .sort({ createdAt: -1 })
      .lean();
    const allConversions = await this.conversionModel
      .find(buildUserConversionScopeFilter(user._id))
      .sort({ createdAt: -1 })
      .lean();

    const groupedByStatus = allConversions.reduce(
      (acc, item) => {
        const status = item.conversion_status || 'unknown';
        if (!acc[status]) {
          acc[status] = {
            count: 0,
            totalPayout: 0,
            items: [],
          };
        }
        acc[status].count += 1;

        const payout =
          item.offer_name === 'reward_conversion_quest'
            ? item.payout
            : item.payout >= fee.max_cap
              ? fee.max_cap
              : item.payout;

        acc[status].totalPayout += payout > 0 ? payout : 0;
        acc[status].items.push(item);
        return acc;
      },
      {} as Record<
        string,
        { count: number; totalPayout: number; items: any[] }
      >,
    );

    const totalsByStatusAndCurrency = await Promise.all(
      Object.entries(groupedByStatus).map(async ([status, statusData]) => {
        const currencyTotals = statusData.items.reduce(
          (acc, item) => {
            const currency = item.currency || 'USD';
            const payoutData =
              item.offer_name === 'reward_conversion_quest'
                ? item.payout
                : item.payout >= fee.max_cap
                  ? fee.max_cap
                  : item.payout;
            const feeAmount = payoutData * (fee.system / 100);

            const payout =
              item.offer_name === 'reward_conversion_quest'
                ? payoutData
                : payoutData - feeAmount;

            if (!acc[currency]) {
              acc[currency] = 0;
            }
            acc[currency] += payout > 0 ? payout : 0;
            return acc;
          },
          {} as Record<string, number>,
        );

        const convertedTotals = await Promise.all(
          Object.entries(currencyTotals).map(async ([currency, amount]) => {
            const toUSD = await this.convertCurrencyUsd(
              currency,
              Number(amount),
            );
            const toTHB = await this.convertCurrencyThb(
              currency,
              Number(amount),
            );
            return {
              currency,
              amount,
              usdAmount: toUSD.usdAmount,
              thbAmount: toTHB.amount,
            };
          }),
        );

        const totalUSD = convertedTotals.reduce(
          (sum, item) => sum + (item.usdAmount || 0),
          0,
        );
        const totalTHB = convertedTotals.reduce(
          (sum, item) => sum + (item.thbAmount || 0),
          0,
        );

        return {
          status,
          count: statusData.count,
          totalPayout: statusData.totalPayout,
          currencyBreakdown: convertedTotals,
          totalUSD,
          totalTHB,
        };
      }),
    );
    const withdrawSumByCurrencyApproved = withdrawList
      ?.filter((item) => item.status === 'approved')
      .reduce(
        (acc, withdraw) => {
          const currency = withdraw.currency || 'unknown';
          if (!acc[currency]) {
            acc[currency] = {
              netAmount: 0,
              count: 0,
            };
          }
          acc[currency].netAmount += withdraw.amount_net || 0;
          acc[currency].count += 1;
          return acc;
        },
        {} as Record<string, { netAmount: number; count: number }>,
      );
    const withdrawSumByCurrencyPending = withdrawList
      .filter((item) => item.status === 'pending')
      .reduce(
        (acc, withdraw) => {
          const currency = withdraw.currency || 'unknown';
          if (!acc[currency]) {
            acc[currency] = {
              netAmount: 0,
              count: 0,
            };
          }
          acc[currency].netAmount += withdraw.amount_net || 0;
          acc[currency].count += 1;
          return acc;
        },
        {} as Record<string, { netAmount: number; count: number }>,
      );

    const withdrawSumThbApproved = await Object.entries(
      withdrawSumByCurrencyApproved,
    ).reduce(
      async (accPromise, [currency, item]) => {
        const acc = await accPromise;
        if (currency === 'THB') {
          acc.netAmount += item.netAmount || 0;
          acc.count += item.count || 0;
        } else if (
          currency === 'USD' ||
          currency === 'USDT' ||
          currency === 'USDC'
        ) {
          const toThb = await this.convertCurrencyThb(currency, item.netAmount);
          acc.netAmount += toThb.amount || 0;
          acc.count += item.count || 0;
        } else if (currency === 'CNY') {
          const toThb = await this.convertCurrencyThb(currency, item.netAmount);
          acc.netAmount += toThb.amount || 0;
          acc.count += item.count || 0;
        }
        return acc;
      },
      Promise.resolve({ netAmount: 0, count: 0 }),
    );

    const withdrawSumUsdApproved = await Object.entries(
      withdrawSumByCurrencyApproved,
    ).reduce(
      async (accPromise, [currency, item]) => {
        const acc = await accPromise;
        if (currency === 'USD' || currency === 'USDT' || currency === 'USDC') {
          acc.netAmount += item.netAmount || 0;
          acc.count += item.count || 0;
        } else if (currency === 'THB') {
          const toUsd = await this.convertCurrencyUsd(currency, item.netAmount);
          acc.netAmount += toUsd.usdAmount || 0;
          acc.count += item.count || 0;
        } else if (currency === 'CNY') {
          const toUsd = await this.convertCurrencyUsd(currency, item.netAmount);
          acc.netAmount += toUsd.usdAmount || 0;
          acc.count += item.count || 0;
        }
        return acc;
      },
      Promise.resolve({ netAmount: 0, count: 0 }),
    );

    const withdrawSumThbPending = await Object.entries(
      withdrawSumByCurrencyPending,
    ).reduce(
      async (accPromise, [currency, item]) => {
        const acc = await accPromise;
        if (currency === 'THB') {
          acc.netAmount += item.netAmount || 0;
          acc.count += item.count || 0;
        } else if (
          currency === 'USD' ||
          currency === 'USDT' ||
          currency === 'USDC'
        ) {
          const toThb = await this.convertCurrencyThb(currency, item.netAmount);
          acc.netAmount += toThb.amount || 0;
          acc.count += item.count || 0;
        } else if (currency === 'CNY') {
          const toThb = await this.convertCurrencyThb(currency, item.netAmount);
          acc.netAmount += toThb.amount || 0;
          acc.count += item.count || 0;
        }
        return acc;
      },
      Promise.resolve({ netAmount: 0, count: 0 }),
    );

    const withdrawSumUsdPending = await Object.entries(
      withdrawSumByCurrencyPending,
    ).reduce(
      async (accPromise, [currency, item]) => {
        const acc = await accPromise;
        if (currency === 'USD' || currency === 'USDT' || currency === 'USDC') {
          acc.netAmount += item.netAmount || 0;
          acc.count += item.count || 0;
        } else if (currency === 'THB') {
          const toUsd = await this.convertCurrencyUsd(currency, item.netAmount);
          acc.netAmount += toUsd.usdAmount || 0;
          acc.count += item.count || 0;
        } else if (currency === 'CNY') {
          const toUsd = await this.convertCurrencyUsd(currency, item.netAmount);
          acc.netAmount += toUsd.usdAmount || 0;
          acc.count += item.count || 0;
        }
        return acc;
      },
      Promise.resolve({ netAmount: 0, count: 0 }),
    );
    return {
      totalsByStatusAndCurrency,
      data: groupedByStatus,
      fee,
      withdrawList,
      withdrawSumByCurrency: {
        pending: withdrawSumByCurrencyPending,
        approved: withdrawSumByCurrencyApproved,
      },
      allConversions,
      user: {
        email: user.email,
        mobile: user.mobile,
      },
      withdrawSumThbApproved,
      withdrawSumUsdApproved,
      withdrawSumThbPending,
      withdrawSumUsdPending,
    };
  }

  async listCheckWithdrawNew(id: string) {
    const user = await this.userModel.findOne({
      _id: new Types.ObjectId(id),
    });
    if (!user) {
      throw new UnauthorizedException({ message: 'User not found' });
    }
    const fee = await this.feeRateModel.findOne().exec();
    if (!fee) {
      this.logger.error('Withdrawal blocked: no FeeRate document configured.');
      throw new HttpException(
        {
          message:
            'Withdrawals are temporarily unavailable. Please try again later or contact support.',
        },
        400,
      );
    }

    const withdrawList = await this.withdrawModel
      .find({
        user_id: user._id, // user._id.toString(),
      })
      .sort({ createdAt: -1 })
      .lean();
    // const allConversions1 = await this.conversionModel
    //   .find({
    //     aff_sub1: { $regex: `user_id:${user._id.toString()}` },
    //   })
    //   .sort({ createdAt: -1 })
    //   .lean();

    const allConversions = await this.conversionModel
      .aggregate([
        {
          $match: buildUserConversionScopeFilter(user._id),
        },
        {
          // Source-constrained lookup: offer_id is only unique WITHIN a source
          // (Involve vs Optimise/Accesstrade can share a numeric offer_id). The
          // old naive localField/foreignField join matched offers regardless of
          // source, so once a second network shares an offer_id, $unwind fans
          // the conversion into multiple rows and the displayed cashback
          // DOUBLES. Pin offer.source to the CONVERSION's own source ($ifNull ->
          // 'involve' for legacy rows) and take a single match. For Involve-only
          // data (every offer carrying source:'involve' after the backfill /
          // next sync) this is byte-identical to the naive join.
          $lookup: {
            from: 'offers',
            let: { oid: '$offer_id', src: { $ifNull: ['$source', 'involve'] } },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: [{ $ifNull: ['$source', 'involve'] }, '$$src'] },
                      { $eq: ['$offer_id', '$$oid'] },
                    ],
                  },
                },
              },
              { $limit: 1 },
            ],
            as: 'offer',
          },
        },
        { $unwind: { path: '$offer', preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            max_cap: { $ifNull: ['$offer.max_cap', fee.max_cap] },
          },
        },
        {
          $addFields: {
            payoutNew: {
              $cond: [
                { $eq: ['$offer_name', 'reward_conversion_quest'] },
                '$payout',
                {
                  $let: {
                    vars: {
                      payoutAfterFee: {
                        $subtract: [
                          '$payout',
                          {
                            $divide: [
                              { $multiply: ['$payout', fee.system] },
                              100,
                            ],
                          },
                        ],
                      },
                    },
                    in: {
                      $cond: [
                        { $gt: ['$$payoutAfterFee', '$max_cap'] },
                        '$max_cap',
                        '$$payoutAfterFee',
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
        {
          $project: {
            conversion_id: 1,
            adv_sub1: 1,
            adv_sub2: 1,
            adv_sub3: 1,
            adv_sub4: 1,
            adv_sub5: 1,
            aff_sub1: 1,
            aff_sub2: 1,
            aff_sub3: 1,
            aff_sub4: 1,
            aff_sub5: 1,
            affiliate_remarks: 1,
            base_payout: 1,
            bonus_payout: 1,
            conversion_status: 1,
            currency: 1,
            datetime_conversion: 1,
            merchant_id: 1,
            offer_id: 1,
            offer_name: 1,
            payout: 1,
            sale_amount: 1,
            add_point: 1,
            payoutNew: 1,
            _id: 1,
          },
        },
        // {
        //   $group: {
        //     _id: {
        //       merchant_id: '$merchant_id',
        //       offer_name: '$offer.offer_name',
        //     },
        //     count: { $sum: 1 },
        //     totalPayout: { $sum: '$payoutNew' },
        //   },
        // },
        {
          $sort: { datetime_conversion: -1 },
        },
      ])
      .exec();
    const groupedByStatus: Record<
      string,
      { count: number; totalPayout: number; items: any[] }
    > = allConversions.reduce(
      (acc, item) => {
        const status = item.conversion_status || 'unknown';
        if (!acc[status]) {
          acc[status] = {
            count: 0,
            totalPayout: 0,
            items: [],
          };
        }
        acc[status].count += 1;

        // const payout =
        //   item.offer_name === 'reward_conversion_quest'
        //     ? item.payout
        //     : item.payout >= fee.max_cap
        //       ? fee.max_cap
        //       : item.payout;
        const payout = item.payoutNew || 0;
        acc[status].totalPayout += payout > 0 ? payout : 0;
        acc[status].items.push(item);
        return acc;
      },
      {} as Record<
        string,
        { count: number; totalPayout: number; items: any[] }
      >,
    );

    const totalsByStatusAndCurrency = await Promise.all(
      Object.entries(groupedByStatus).map(async ([status, statusData]) => {
        const currencyTotals = statusData.items.reduce(
          (acc, item) => {
            const currency = item.currency || 'USD';
            const payoutData =
              item.offer_name === 'reward_conversion_quest'
                ? item.payout
                : item.payout >= fee.max_cap
                  ? fee.max_cap
                  : item.payout;
            const feeAmount = payoutData * (fee.system / 100);

            const payout =
              item.offer_name === 'reward_conversion_quest'
                ? payoutData
                : payoutData - feeAmount;

            if (!acc[currency]) {
              acc[currency] = 0;
            }
            acc[currency] += payout > 0 ? payout : 0;
            return acc;
          },
          {} as Record<string, number>,
        );

        const convertedTotals = await Promise.all(
          Object.entries(currencyTotals).map(async ([currency, amount]) => {
            const toUSD = await this.convertCurrencyUsd(
              currency,
              Number(amount),
            );
            const toTHB = await this.convertCurrencyThb(
              currency,
              Number(amount),
            );
            return {
              currency,
              amount,
              usdAmount: toUSD.usdAmount,
              thbAmount: toTHB.amount,
            };
          }),
        );

        const totalUSD = convertedTotals.reduce(
          (sum, item) => sum + (item.usdAmount || 0),
          0,
        );
        const totalTHB = convertedTotals.reduce(
          (sum, item) => sum + (item.thbAmount || 0),
          0,
        );

        return {
          status,
          count: statusData.count,
          totalPayout: statusData.totalPayout,
          currencyBreakdown: convertedTotals,
          totalUSD,
          totalTHB,
        };
      }),
    );
    const withdrawSumByCurrencyApproved = withdrawList
      ?.filter((item) => item.status === 'approved')
      .reduce(
        (acc, withdraw) => {
          const currency = withdraw.currency || 'unknown';
          if (!acc[currency]) {
            acc[currency] = {
              netAmount: 0,
              count: 0,
            };
          }
          acc[currency].netAmount += withdraw.amount_net || 0;
          acc[currency].count += 1;
          return acc;
        },
        {} as Record<string, { netAmount: number; count: number }>,
      );
    const withdrawSumByCurrencyPending = withdrawList
      .filter((item) => item.status === 'pending')
      .reduce(
        (acc, withdraw) => {
          const currency = withdraw.currency || 'unknown';
          if (!acc[currency]) {
            acc[currency] = {
              netAmount: 0,
              count: 0,
            };
          }
          acc[currency].netAmount += withdraw.amount_net || 0;
          acc[currency].count += 1;
          return acc;
        },
        {} as Record<string, { netAmount: number; count: number }>,
      );

    const withdrawSumThbApproved = await Object.entries(
      withdrawSumByCurrencyApproved,
    ).reduce(
      async (accPromise, [currency, item]) => {
        const acc = await accPromise;
        if (currency === 'THB') {
          acc.netAmount += item.netAmount || 0;
          acc.count += item.count || 0;
        } else if (
          currency === 'USD' ||
          currency === 'USDT' ||
          currency === 'USDC'
        ) {
          const toThb = await this.convertCurrencyThb(currency, item.netAmount);
          acc.netAmount += toThb.amount || 0;
          acc.count += item.count || 0;
        } else if (currency === 'CNY') {
          const toThb = await this.convertCurrencyThb(currency, item.netAmount);
          acc.netAmount += toThb.amount || 0;
          acc.count += item.count || 0;
        }
        return acc;
      },
      Promise.resolve({ netAmount: 0, count: 0 }),
    );

    const withdrawSumUsdApproved = await Object.entries(
      withdrawSumByCurrencyApproved,
    ).reduce(
      async (accPromise, [currency, item]) => {
        const acc = await accPromise;
        if (currency === 'USD' || currency === 'USDT' || currency === 'USDC') {
          acc.netAmount += item.netAmount || 0;
          acc.count += item.count || 0;
        } else if (currency === 'THB') {
          const toUsd = await this.convertCurrencyUsd(currency, item.netAmount);
          acc.netAmount += toUsd.usdAmount || 0;
          acc.count += item.count || 0;
        } else if (currency === 'CNY') {
          const toUsd = await this.convertCurrencyUsd(currency, item.netAmount);
          acc.netAmount += toUsd.usdAmount || 0;
          acc.count += item.count || 0;
        }
        return acc;
      },
      Promise.resolve({ netAmount: 0, count: 0 }),
    );

    const withdrawSumThbPending = await Object.entries(
      withdrawSumByCurrencyPending,
    ).reduce(
      async (accPromise, [currency, item]) => {
        const acc = await accPromise;
        if (currency === 'THB') {
          acc.netAmount += item.netAmount || 0;
          acc.count += item.count || 0;
        } else if (
          currency === 'USD' ||
          currency === 'USDT' ||
          currency === 'USDC'
        ) {
          const toThb = await this.convertCurrencyThb(currency, item.netAmount);
          acc.netAmount += toThb.amount || 0;
          acc.count += item.count || 0;
        } else if (currency === 'CNY') {
          const toThb = await this.convertCurrencyThb(currency, item.netAmount);
          acc.netAmount += toThb.amount || 0;
          acc.count += item.count || 0;
        }
        return acc;
      },
      Promise.resolve({ netAmount: 0, count: 0 }),
    );

    const withdrawSumUsdPending = await Object.entries(
      withdrawSumByCurrencyPending,
    ).reduce(
      async (accPromise, [currency, item]) => {
        const acc = await accPromise;
        if (currency === 'USD' || currency === 'USDT' || currency === 'USDC') {
          acc.netAmount += item.netAmount || 0;
          acc.count += item.count || 0;
        } else if (currency === 'THB') {
          const toUsd = await this.convertCurrencyUsd(currency, item.netAmount);
          acc.netAmount += toUsd.usdAmount || 0;
          acc.count += item.count || 0;
        } else if (currency === 'CNY') {
          const toUsd = await this.convertCurrencyUsd(currency, item.netAmount);
          acc.netAmount += toUsd.usdAmount || 0;
          acc.count += item.count || 0;
        }
        return acc;
      },
      Promise.resolve({ netAmount: 0, count: 0 }),
    );
    return {
      totalsByStatusAndCurrency,
      data: groupedByStatus,
      fee,
      withdrawList,
      withdrawSumByCurrency: {
        pending: withdrawSumByCurrencyPending,
        approved: withdrawSumByCurrencyApproved,
      },
      allConversions,
      user: {
        email: user.email,
        mobile: user.mobile,
      },
      withdrawSumThbApproved,
      withdrawSumUsdApproved,
      withdrawSumThbPending,
      withdrawSumUsdPending,
    };
  }
  async getConversionByUser(id: string) {
    // const conversions = await this.involveService.getConversionAll({
    //   page: 1,
    //   limit: 10,
    // });

    // let allConversions = conversions.data.data;
    // let currentPage = 1;

    // while (conversions.data.nextPage) {
    //   currentPage++;
    //   const nextConversions = await this.involveService.getConversionAll({
    //     page: currentPage,
    //     limit: 10,
    //   });
    //   allConversions = allConversions.concat(nextConversions.data.data);
    //   conversions.data.nextPage = nextConversions.data.nextPage;
    // }
    // const user = await this.userModel.findOne({ _id: new Types.ObjectId(id) });
    // if (!user) {
    //   throw new Error('User not found');
    // }
    // const id_user = user._id.toString();
    // const conversationByUser = allConversions.filter((item) =>
    //   item.aff_sub1?.includes(`user_id:${id_user}`),
    // );
    // return conversationByUser;
    const allConversions = await this.conversionModel
      .find(buildApprovedUserConversionsFilter(id))
      .lean();
    return allConversions;
  }

  async getListCashbackByCurrency(id: string) {
    const allConversions = await this.getConversionByUser(id);

    const filteredConversions = allConversions.filter((item) => {
      return item.conversion_status === 'approved';
    });
    const groupedByCurrency = filteredConversions.reduce(
      (
        acc: Record<string, { items: any[]; totalPayout: number }>,
        item: any,
      ) => {
        const currency = item.currency || 'unknown';
        if (!acc[currency]) {
          acc[currency] = { items: [], totalPayout: 0 };
        }
        acc[currency].items.push({ ...item });
        acc[currency].totalPayout += Number(item.payout || 0);
        return acc;
      },
      {} as Record<string, { items: any[]; totalPayout: number }>,
    );

    return groupedByCurrency;
  }

  async detailWithdraw(id: string, requesterId?: string) {
    return await this.withdrawModel
      .findOne({
        _id: new Types.ObjectId(id),
        // When a requester id is supplied (customer route), constrain to their
        // own withdrawals so the detail can't be enumerated by ObjectId.
        ...(requesterId ? { user_id: new Types.ObjectId(requesterId) } : {}),
      })
      .populate('user_id', 'email mobile')
      .lean();
  }

  async checkWithdrawMyCashback(
    id: string,
    existingUser?: { _id: Types.ObjectId; email?: string; mobile?: string },
  ) {
    const user =
      existingUser ??
      (await this.userModel.findOne({
        _id: new Types.ObjectId(id),
      }));

    if (!user) {
      throw new UnauthorizedException({ message: 'User not found' });
    }

    // if(!user?.mobile) {
    //   throw new UnauthorizedException({ message: 'User mobile not found' });
    // }

    const mobileData = user?.mobile?.includes('+66')
      ? user?.mobile?.slice(3)
      : user?.mobile;
    const mobile = '0' + mobileData;

    // const myCashbackDataList = await this.userMyCashbackModel
    //   .find({
    //     $or: [{ email: user.email }, { phoneNumber: user.mobile }, { phoneNumber: mobile }],
    //   })
    //   .lean();

    let myCashbackDataList = [];
    if (user?.mobile) {
      myCashbackDataList = await this.userMyCashbackModel
        .find({
          $or: [{ phoneNumber: user.mobile }, { phoneNumber: mobile }],
        })
        .lean();
    }

    // Fresh phone-OTP users have no email on the doc; `$regex: undefined`
    // makes MongoDB throw and 500s /withdraw/check for exactly those users.
    if (myCashbackDataList?.length < 1 && user?.email) {
      myCashbackDataList = await this.userMyCashbackModel
        .find({
          email: {
            $regex: `^${escapeRegexLiteral(user.email)}$`,
            $options: 'i',
          },
        })
        .lean();
    }

    if (myCashbackDataList?.length < 1) {
      return {
        totalMyCashbackTHB: 0,
        totalMyCashbackUSD: 0,
        availableUSD: 0,
        availableTHB: 0,
        conversionIdMyCashback: [],
      };
    }
    const myCashbackDataGroupCurrency = myCashbackDataList?.reduce(
      (acc, cashback) => {
        cashback.balance?.forEach((balance) => {
          const currency = balance.currency || 'THB'; // Default to THB if no currency specified
          acc[currency] = {
            ...balance,
            amount: (acc[currency]?.amount || 0) + (balance.amount || 0),
          };
        });
        return acc;
      },
      {} as Record<string, { amount: number; currency: string }>,
    );

    const myCashbackData: { amount: number; currency: string }[] = (
      Object.values(myCashbackDataGroupCurrency) as {
        amount: number;
        currency: string;
      }[]
    )?.map((item) => ({ amount: item.amount, currency: item.currency }));

    const rate = await rateCurrencyUSD();
    const rateTHBtoUSD = rate['THB'];

    const totalMyCashbackUSD = myCashbackData.reduce((sum, b) => {
      if (b.currency === 'USD') {
        return sum + b.amount;
      } else {
        return sum + b.amount / rateTHBtoUSD;
      }
    }, 0);

    const totalMyCashbackTHB = myCashbackData.reduce((sum, b) => {
      if (b.currency === 'THB') {
        return sum + b.amount;
      } else {
        const usd = b.amount * rateTHBtoUSD;
        return sum + usd;
      }
    }, 0);

    const withdrawListApproved = await this.withdrawModel
      .find({
        user_id: new Types.ObjectId(user._id),
        mycashback_id: {
          $in: myCashbackDataList.map((item) => new Types.ObjectId(item?._id)),
        }, //,
        // 'paid' included so settled MyCashback withdrawals stay deducted.
        status: { $in: ['approved', 'pending', 'paid'] },
      })
      .lean();
    const totalWithdrawnUSD = withdrawListApproved.reduce((sum, w) => {
      if (w.currency === 'USD') {
        return sum + (w.amount_net || 0);
      } else {
        return sum + (w.amount_net || 0) / rateTHBtoUSD;
      }
    }, 0);

    const totalWithdrawnTHB = withdrawListApproved.reduce((sum, w) => {
      if (w.currency === 'THB') {
        return sum + (w.amount_net || 0);
      } else {
        return sum + (w.amount_net || 0) * rateTHBtoUSD;
      }
    }, 0);

    const availableUSD = totalMyCashbackUSD - totalWithdrawnUSD;
    const availableTHB = totalMyCashbackTHB - totalWithdrawnTHB;
    const data = {
      totalMyCashbackTHB,
      totalMyCashbackUSD,
      availableUSD,
      availableTHB,
      conversionIdMyCashback: myCashbackDataList.map((item) => item?._id),
    };
    return data;
  }

  // ── FX conversion (P1-FX): cached, timeout-bounded, fail-closed ─────────────
  private readonly fxCache = new Map<
    string,
    { rate: number; expiresAt: number }
  >();
  private readonly FX_TTL_MS = 10 * 60 * 1000; // 10 min — FX moves little intraday
  private readonly FX_TIMEOUT_MS = 5000;

  /** Test seam: force every cached rate stale so the next call refetches. */
  expireFxCacheForTest(): void {
    for (const entry of this.fxCache.values()) {
      entry.expiresAt = 0;
    }
  }

  /**
   * Fetch the `base -> target` exchange rate. Cached for FX_TTL_MS so the hot
   * balance path (which converts the same currency ~20x per request) makes at
   * most one upstream call per window, and so we have a value to fall back on.
   *
   * FAIL-CLOSED: on a fresh-fetch failure we serve the last known rate if we
   * have one; only with a cold cache do we THROW. We never return null — callers
   * do `value || 0`, so a null would silently zero a foreign-currency amount and
   * corrupt the balance (under-counting withdrawals = over-stating available).
   */
  private async fetchRate(base: string, target: string): Promise<number> {
    const key = `${base}->${target}`;
    const now = Date.now();
    const cached = this.fxCache.get(key);
    if (cached && cached.expiresAt > now) {
      return cached.rate;
    }
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.FX_TIMEOUT_MS);
      let rate: number | undefined;
      try {
        const response = await fetch(
          `https://api.exchangerate-api.com/v4/latest/${base}`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          throw new Error(`FX ${base} upstream HTTP ${response.status}`);
        }
        const data = await response.json();
        rate = data?.rates?.[target];
      } finally {
        clearTimeout(timer);
      }
      if (!rate || !Number.isFinite(rate)) {
        throw new Error(`FX rate ${key} missing in upstream response`);
      }
      this.fxCache.set(key, { rate, expiresAt: now + this.FX_TTL_MS });
      return rate;
    } catch {
      if (cached) return cached.rate;
      throw new HttpException(
        { message: `Currency conversion temporarily unavailable (${base})` },
        503,
      );
    }
  }

  async convertCurrencyUsd(
    currency: string,
    amount: number,
  ): Promise<{ usdAmount: number | null; exchangeRate: number | null }> {
    if (currency === 'USD') {
      return { usdAmount: amount, exchangeRate: 1 };
    }
    const exchangeRate = await this.fetchRate(currency, 'USD');
    return { usdAmount: amount * exchangeRate, exchangeRate };
  }

  async convertCurrencyThb(
    currency: string,
    amount: number,
  ): Promise<{ amount: number | null; exchangeRate: number | null }> {
    if (currency === 'THB') {
      return { amount: amount, exchangeRate: 1 };
    }
    const exchangeRate = await this.fetchRate(currency, 'THB');
    return { amount: amount * exchangeRate, exchangeRate };
  }

  // async createFeeRate() {
  //   return await this.feeRateModel.create({
  //     system: 5,
  //     store: 5,
  //   });
  // }

  async createRecordOnChain(
    userId: string,
    chainId: number,
    conversionIds: number[],
    onBroadcast?: (transactionHash: string) => Promise<void>,
  ): Promise<string> {
    const abi = [
      {
        inputs: [
          { internalType: 'string', name: 'userid', type: 'string' },
          {
            internalType: 'uint256[]',
            name: 'conversionIds',
            type: 'uint256[]',
          },
        ],
        name: 'recordConversionId',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
      },
    ];
    const chain = resolveWithdrawChainConfig(chainId);

    // console.log('Using contract address:', contractAddress);
    // console.log('Using contract address:', rpc);

    const provider = new ethers.JsonRpcProvider(chain.rpc);
    // const provider = new ethers.JsonRpcProvider(process.env.RPC_URL_POLYGON);
    const wallet = new ethers.Wallet(
      process.env.PRIVATE_KEY_WITHDRAW,
      provider,
    );
    const contract = new ethers.Contract(chain.contract, abi, wallet);
    const submission = await contract.recordConversionId(userId, conversionIds);
    const broadcastHash = requireCanonicalEvmTransactionHash(submission.hash);
    await onBroadcast?.(broadcastHash);
    return requireSuccessfulChainRecord(submission);
  }

  async getChainRecordReceiptState(
    chainId: number,
    transactionHash: string,
  ): Promise<'pending' | 'recorded' | 'rejected'> {
    const chain = resolveWithdrawChainConfig(chainId);
    const hash = requireCanonicalEvmTransactionHash(transactionHash);
    let receipt: Awaited<
      ReturnType<ethers.JsonRpcProvider['getTransactionReceipt']>
    >;
    try {
      receipt = await new ethers.JsonRpcProvider(
        chain.rpc,
      ).getTransactionReceipt(hash);
    } catch {
      throw new HttpException(
        {
          message:
            'The chain-record transaction is still being verified. Your balance remains reserved.',
        },
        503,
      );
    }
    if (!receipt) return 'pending';
    if (
      requireCanonicalEvmTransactionHash(receipt.hash) !==
      requireCanonicalEvmTransactionHash(hash)
    ) {
      throw new HttpException(
        {
          message:
            'The chain-record receipt did not match the submitted transaction. Your balance remains reserved.',
        },
        503,
      );
    }
    if (Number(receipt.status) === 1) return 'recorded';
    if (Number(receipt.status) === 0) return 'rejected';
    throw new HttpException(
      {
        message:
          'The chain-record transaction returned an unknown receipt state. Your balance remains reserved.',
      },
      503,
    );
  }
  /**
   * Server-side balance gate shared by the on-chain `create` and `bank-transfer`
   * withdraw paths (V-2). Re-derives the user's available balance via
   * {@link checkWithdraw} — which already reconciles pending/approved/paid
   * withdrawals — and refuses any request above it, so a client-supplied
   * `amount_net` can never forge a payout larger than the funds actually owed.
   * Currency-aware: THB compares against the THB payout, all $-pegged tokens
   * (USD/USDT/USDC) against the USD payout. The 1e-6 epsilon absorbs float dust.
   */
  private async assertWithinBalance(
    userId: string,
    amount: number | undefined,
    currency: string | undefined,
  ) {
    const balance = await this.checkWithdraw(userId);
    const available =
      currency === 'THB'
        ? Number(balance?.netAmountTHB ?? 0)
        : Number(balance?.netAmount ?? 0);
    const requested = Number(amount ?? 0);
    if (
      !Number.isFinite(requested) ||
      requested <= 0 ||
      requested > available + 1e-6
    ) {
      throw new HttpException(
        {
          message: `Requested amount exceeds available balance (${available.toFixed(2)} ${currency === 'THB' ? 'THB' : 'USD'})`,
        },
        400,
      );
    }
    return balance;
  }

  async create(
    createWithdrawDto: CreateWithdrawDto,
    id: string,
    idempotencyKeyRaw?: string,
  ) {
    const chainId = Number(createWithdrawDto.chain);
    const chain = resolveWithdrawChainConfig(chainId);
    const user = await this.userModel.findOne({
      _id: new Types.ObjectId(id),
    });
    if (!user) {
      throw new UnauthorizedException({ message: 'User not found' });
    }
    const amountNet = Number(createWithdrawDto.amount_net ?? 0);
    const transactionHash = createWithdrawDto.tx_hash
      ? requireCanonicalEvmTransactionHash(createWithdrawDto.tx_hash)
      : '';
    const suppliedIdempotencyKey = idempotencyKeyRaw?.trim();
    // Legacy web3 callers already carry stable transaction evidence. Preserve
    // that compatibility while requiring a durable command key for the newer
    // reserve-before-chain path when no tx hash exists.
    const idempotencyKey = suppliedIdempotencyKey
      ? requireTrimmedString(
          suppliedIdempotencyKey,
          128,
          'Idempotency-Key header',
        )
      : transactionHash
        ? `tx:${transactionHash}`
        : null;
    if (!idempotencyKey) {
      throw new BadRequestException(
        'Idempotency-Key header is required for an on-chain withdrawal.',
      );
    }
    if (!/^[A-Za-z0-9._:-]+$/.test(idempotencyKey)) {
      throw new BadRequestException(
        'The Idempotency-Key header you provided is not valid.',
      );
    }
    const normalizedConversionIds = [
      ...new Set(createWithdrawDto.conversion_ids ?? []),
    ].sort((left, right) => left - right);
    if (normalizedConversionIds.length === 0) {
      throw new BadRequestException(
        'At least one conversion id is required for an on-chain withdrawal.',
      );
    }
    const method = requireTrimmedString(
      createWithdrawDto.method || 'on_chain',
      64,
      'withdraw method',
    ).toLowerCase();
    if (method === 'bank_transfer' || method === 'minipay_manual') {
      throw new BadRequestException(
        'This withdrawal method is not valid for the on-chain endpoint.',
      );
    }
    const idempotencyEffectHash = createHash('sha256')
      .update(
        JSON.stringify({
          address: String(createWithdrawDto.address ?? '')
            .trim()
            .toLowerCase(),
          amount_net: amountNet,
          chain: chainId,
          conversion_ids: normalizedConversionIds,
          currency: String(createWithdrawDto.currency ?? '').toUpperCase(),
          method,
          tx_hash: transactionHash,
        }),
      )
      .digest('hex');

    // P1-TX + #41: reserve balance in a per-user serialized transaction BEFORE
    // any on-chain call. Two concurrent on-chain withdraw requests contend on
    // withdraw_lock_seq; the loser retries and re-evaluates balance against the
    // now-committed pending record from the winner — closing the TOCTOU where
    // both pass assertWithinBalance then both call createRecordOnChain.
    const reservation = await this.runSerializedWithdraw(
      id,
      async (session) => {
        const existingCommand = await this.withdrawModel
          .findOne({
            user_id: new Types.ObjectId(user._id),
            idempotency_key: idempotencyKey,
          })
          .session(session)
          .exec();
        if (existingCommand) {
          if (
            existingCommand.idempotency_effect_hash !== idempotencyEffectHash
          ) {
            throw new ConflictException(
              'This Idempotency-Key is already bound to a different withdrawal.',
            );
          }
          return {
            record: existingCommand,
            autoRecordId: undefined,
            replayed: true,
          };
        }

        const activeAuthorization = await this.withdrawModel
          .findOne({
            user_id: new Types.ObjectId(user._id),
            authorization_slot_active: true,
            authorization_state: {
              $in: ['issued', 'expired_unverified', 'executed_unclaimed'],
            },
            status: 'pending',
          })
          .session(session)
          .exec();
        if (activeAuthorization) {
          if (!transactionHash) {
            throw new ConflictException(
              'A signed withdrawal must include its on-chain transaction hash.',
            );
          }
          let submittedAmountAtomic: bigint;
          try {
            submittedAmountAtomic = ethers.parseUnits(
              String(amountNet),
              chain.decimal,
            );
          } catch {
            throw new BadRequestException('Invalid withdrawal amount.');
          }
          const authorizationConversionIds = (
            activeAuthorization.conversion_id ?? []
          )
            .map(canonicalUint256)
            .filter((conversionId): conversionId is string =>
              Boolean(conversionId),
            )
            .sort((left, right) => (BigInt(left) < BigInt(right) ? -1 : 1));
          const submittedConversionIds = normalizedConversionIds.map(String);
          const submittedAddress = createWithdrawDto.address
            ? ethers.getAddress(createWithdrawDto.address)
            : ethers.getAddress(activeAuthorization.address);
          if (
            activeAuthorization.authorization_chain_id !== chainId ||
            String(activeAuthorization.authorization_contract).toLowerCase() !==
              chain.contract.toLowerCase() ||
            String(activeAuthorization.authorization_amount_atomic) !==
              submittedAmountAtomic.toString() ||
            ethers.getAddress(activeAuthorization.address) !==
              submittedAddress ||
            authorizationConversionIds.length !==
              submittedConversionIds.length ||
            authorizationConversionIds.some(
              (conversionId, index) =>
                conversionId !== submittedConversionIds[index],
            )
          ) {
            throw new ConflictException(
              'The submitted withdrawal does not match the active signed authorization.',
            );
          }
          const reusedEvidence = await this.withdrawModel
            .findOne({
              _id: { $ne: activeAuthorization._id },
              tx_hash: { $regex: `^${transactionHash}$`, $options: 'i' },
            })
            .session(session)
            .exec();
          if (reusedEvidence) {
            throw new ConflictException(
              'This tx_hash is already recorded on another withdrawal',
            );
          }
          const alreadyRecorded =
            activeAuthorization.authorization_state === 'executed_unclaimed';
          const submittedCurrency = String(
            createWithdrawDto.currency || 'USD',
          ).toUpperCase();
          if (!['USD', 'USDT', 'USDC'].includes(submittedCurrency)) {
            throw new ConflictException(
              'The submitted currency does not match the signed USD authorization.',
            );
          }
          const promoted = await this.withdrawModel.findOneAndUpdate(
            {
              _id: activeAuthorization._id,
              user_id: new Types.ObjectId(user._id),
              authorization_slot_active: true,
              authorization_state: activeAuthorization.authorization_state,
              status: 'pending',
            },
            {
              $set: {
                address: submittedAddress,
                amount_total: amountNet,
                amount_net: amountNet,
                method,
                currency: submittedCurrency,
                tx_hash: transactionHash,
                idempotency_key: idempotencyKey,
                idempotency_effect_hash: idempotencyEffectHash,
                authorization_state: 'submitted',
                authorization_slot_active: false,
                chain_record_state: alreadyRecorded ? 'recorded' : 'reserved',
                chain_record_chain_id: chainId,
                chain_record_attempts: 0,
                ...(alreadyRecorded
                  ? { chain_record_confirmed_at: new Date() }
                  : {}),
              },
              $unset: {
                chain_record_lease_until: 1,
                chain_record_lease_owner: 1,
              },
            },
            { new: true, session },
          );
          if (!promoted) {
            throw new ConflictException(
              'The signed withdrawal changed before it could be submitted.',
            );
          }
          const myCashback = await this.checkWithdrawMyCashback(id);
          const autoFields = buildAutoMyCashbackWithdrawFields(
            {
              ...createWithdrawDto,
              amount_total: amountNet,
              method,
              tx_hash: transactionHash,
            },
            new Types.ObjectId(user._id),
            myCashback,
            promoted._id,
          );
          const [autoRecord] = autoFields
            ? await this.withdrawModel.create([autoFields], { session })
            : [undefined];
          return {
            record: promoted,
            autoRecordId: autoRecord?._id,
            replayed: false,
          };
        }
        const balance = await this.assertWithinBalance(
          id,
          amountNet,
          createWithdrawDto.currency,
        );
        const eligibleConversionIds = new Set(
          (balance.data ?? [])
            .map((conversion) => canonicalUint256(conversion.conversion_id))
            .filter((conversionId): conversionId is string =>
              Boolean(conversionId),
            ),
        );
        if (
          normalizedConversionIds.some(
            (conversionId) => !eligibleConversionIds.has(String(conversionId)),
          )
        ) {
          throw new ConflictException(
            'One or more conversions are not available to this account.',
          );
        }
        const reservedConversions = await this.withdrawModel
          .findOne({
            user_id: new Types.ObjectId(user._id),
            status: { $in: ['pending', 'approved', 'paid'] },
            conversion_id: { $in: normalizedConversionIds },
          })
          .session(session)
          .exec();
        if (reservedConversions) {
          throw new ConflictException(
            'One or more conversions are already reserved by another withdrawal.',
          );
        }
        if (transactionHash) {
          const reusedEvidence = await this.withdrawModel
            .findOne({
              tx_hash: { $regex: `^${transactionHash}$`, $options: 'i' },
            })
            .session(session)
            .exec();
          if (reusedEvidence) {
            throw new ConflictException(
              'This tx_hash is already recorded on another withdrawal',
            );
          }
        }
        const [record] = await this.withdrawModel.create(
          [
            {
              user_id: new Types.ObjectId(user._id),
              // V-2b: always 'pending'. The server no longer self-approves from a
              // client-supplied tx_hash — an admin confirms on-chain settlement via
              // approveWithdrawRequest. Balance is already reserved either way:
              // checkWithdraw counts 'pending' against available, same as 'approved'.
              status: 'pending',
              address: createWithdrawDto.address || '',
              account_name: createWithdrawDto.account_name || '',
              bank_name: createWithdrawDto.bank_name || '',
              account_number: createWithdrawDto.account_number || '',
              tx_hash: transactionHash,
              tx_hash_record: '',
              percent_fee: createWithdrawDto.percent_fee || 0,
              amount_total: amountNet,
              amount_net: amountNet,
              method,
              currency: createWithdrawDto.currency || '',
              conversion_id: normalizedConversionIds,
              rate: createWithdrawDto?.rate || 0,
              mycashback_id: [],
              idempotency_key: idempotencyKey,
              idempotency_effect_hash: idempotencyEffectHash,
              // `reserved` proves no external submission owner has claimed the
              // command yet. Only this state may transition into a broadcast.
              chain_record_state: 'reserved',
              chain_record_chain_id: chainId,
              chain_record_attempts: 0,
            },
          ],
          { session },
        );
        const myCashback = await this.checkWithdrawMyCashback(id);
        const autoFields = buildAutoMyCashbackWithdrawFields(
          {
            ...createWithdrawDto,
            amount_total: amountNet,
            method,
            tx_hash: transactionHash,
          },
          new Types.ObjectId(user._id),
          myCashback,
          record._id,
        );
        const [autoRecord] = autoFields
          ? await this.withdrawModel.create([autoFields], { session })
          : [undefined];
        return { record, autoRecordId: autoRecord?._id, replayed: false };
      },
    );
    const dt = reservation.record;

    const completedResponse = (record: WithdrawDocument, reused: boolean) => ({
      message: 'Withdraw request created',
      data: record,
      status: 'success',
      reused,
    });
    const processingResponse = (record: WithdrawDocument) => ({
      message: 'Withdraw request is still processing',
      data: record,
      status: 'processing',
      reused: true,
    });
    if (dt.status === 'rejected' || dt.chain_record_state === 'failed') {
      throw new HttpException(
        {
          message:
            'This withdrawal command previously failed. Start a new withdrawal to retry.',
        },
        409,
      );
    }
    if (dt.tx_hash_record || dt.chain_record_state === 'recorded') {
      return completedResponse(dt, reservation.replayed);
    }

    const markChainRecordConfirmed = async (
      record: WithdrawDocument,
      confirmedHash?: string,
    ) =>
      this.withdrawModel.findOneAndUpdate(
        {
          _id: record._id,
          status: 'pending',
          idempotency_key: idempotencyKey,
          chain_record_state: { $ne: 'failed' },
        },
        {
          $set: {
            ...(confirmedHash ? { tx_hash_record: confirmedHash } : {}),
            chain_record_state: 'recorded',
            chain_record_confirmed_at: new Date(),
          },
          $unset: {
            chain_record_lease_until: 1,
            chain_record_lease_owner: 1,
          },
        },
        { new: true },
      );

    const throwDefinitiveChainFailure = async (
      record: WithdrawDocument,
    ): Promise<never> => {
      if (String(record.tx_hash ?? '').trim()) {
        await this.withdrawModel.findOneAndUpdate(
          {
            _id: record._id,
            status: 'pending',
            tx_hash: String(record.tx_hash),
            chain_record_state: { $in: ['processing', 'broadcast'] },
          },
          {
            $set: {
              chain_record_state: 'failed',
              flagged: true,
              flag_reason: 'chain_record_failed_after_external_submission',
            },
            $unset: {
              chain_record_lease_until: 1,
              chain_record_lease_owner: 1,
            },
          },
          { new: true },
        );
        throw new HttpException(
          {
            message:
              'The payout evidence is preserved, but its chain record failed. The balance remains reserved for manual review.',
          },
          502,
        );
      }
      const rollbackSession = await this.connection.startSession();
      let rolledBack = false;
      try {
        await rollbackSession.withTransaction(async () => {
          const primary = await this.withdrawModel.findOneAndUpdate(
            {
              _id: record._id,
              status: 'pending',
              tx_hash_record: { $in: ['', null] },
              chain_record_state: { $in: ['processing', 'broadcast'] },
            },
            {
              $set: {
                status: 'rejected',
                chain_record_state: 'failed',
                flag_reason: 'on_chain_record_failed',
              },
              $unset: {
                chain_record_lease_until: 1,
                chain_record_lease_owner: 1,
              },
            },
            { new: true, session: rollbackSession },
          );
          if (!primary) return;
          await this.withdrawModel.updateMany(
            { parent_withdraw_id: record._id, status: 'pending' },
            {
              $set: {
                status: 'rejected',
                flag_reason: 'on_chain_record_failed',
              },
            },
            { session: rollbackSession },
          );
          rolledBack = true;
        });
      } finally {
        await rollbackSession.endSession();
      }
      if (!rolledBack) {
        throw new ConflictException(
          'The withdrawal outcome changed while chain recording failed. It has been left reserved for manual review.',
        );
      }
      throw new HttpException(
        {
          message:
            "We couldn't complete your withdrawal right now. No funds were moved — please try again shortly or contact support.",
        },
        502,
      );
    };

    let workRecord = dt;
    let leaseOwner: string | null = null;
    if (reservation.replayed && dt.chain_record_state !== 'reserved') {
      const now = new Date();
      const leaseUntil = dt.chain_record_lease_until
        ? new Date(dt.chain_record_lease_until)
        : null;
      if (
        dt.chain_record_state === 'processing' &&
        leaseUntil &&
        leaseUntil > now
      ) {
        return processingResponse(dt);
      }

      if (dt.chain_record_broadcast_hash) {
        const receiptState = await this.getChainRecordReceiptState(
          chainId,
          dt.chain_record_broadcast_hash,
        );
        if (receiptState === 'rejected') {
          return throwDefinitiveChainFailure(dt);
        }
        if (receiptState === 'recorded') {
          const reconciled = await markChainRecordConfirmed(
            dt,
            dt.chain_record_broadcast_hash,
          );
          if (reconciled) return completedResponse(reconciled, true);
        }
      }

      // Positive contract state can recover a process that died immediately
      // after broadcast. Negative state is UNKNOWN: lease expiry is never
      // permission to send a second blockchain transaction.
      const onChainIds = new Set(
        await this.getConversionIdsWithdrawedByUserId(id, chainId, true),
      );
      if (
        normalizedConversionIds.every((conversionId) =>
          onChainIds.has(String(conversionId)),
        )
      ) {
        const reconciled = await markChainRecordConfirmed(
          dt,
          dt.chain_record_broadcast_hash,
        );
        if (reconciled) return completedResponse(reconciled, true);
      }

      const pending = await this.withdrawModel.findOneAndUpdate(
        {
          _id: dt._id,
          status: 'pending',
          idempotency_key: idempotencyKey,
          chain_record_state: { $in: ['processing', 'broadcast'] },
        },
        {
          $set: {
            flagged: true,
            flag_reason: dt.chain_record_broadcast_hash
              ? 'chain_record_receipt_pending'
              : 'chain_record_broadcast_unknown',
            chain_record_lease_until: new Date(
              Date.now() + CHAIN_RECORD_LEASE_MS,
            ),
          },
        },
        { new: true },
      );
      return processingResponse(pending ?? dt);
    }

    // Only a never-claimed `reserved` command may acquire a submission owner.
    // A stale `processing` lease is deliberately not reclaimable.
    leaseOwner = randomUUID();
    const claimed = await this.withdrawModel.findOneAndUpdate(
      {
        _id: dt._id,
        status: 'pending',
        idempotency_key: idempotencyKey,
        chain_record_state: 'reserved',
      },
      {
        $set: {
          chain_record_state: 'processing',
          chain_record_chain_id: chainId,
          chain_record_lease_owner: leaseOwner,
          chain_record_lease_until: new Date(
            Date.now() + CHAIN_RECORD_LEASE_MS,
          ),
        },
        $inc: { chain_record_attempts: 1 },
      },
      { new: true },
    );
    if (!claimed) {
      const current = await this.withdrawModel.findById(dt._id);
      if (
        current?.tx_hash_record ||
        current?.chain_record_state === 'recorded'
      ) {
        return completedResponse(current, true);
      }
      if (
        current?.status === 'rejected' ||
        current?.chain_record_state === 'failed'
      ) {
        throw new ConflictException(
          'This withdrawal command previously failed.',
        );
      }
      return processingResponse(current ?? dt);
    }
    workRecord = claimed;

    let hashRecord: string;
    try {
      hashRecord = await this.createRecordOnChain(
        user._id.toString(),
        chainId,
        normalizedConversionIds,
        async (broadcastHash) => {
          const broadcast = await this.withdrawModel.findOneAndUpdate(
            {
              _id: workRecord._id,
              status: 'pending',
              chain_record_state: 'processing',
              chain_record_lease_owner: leaseOwner,
            },
            {
              $set: {
                chain_record_state: 'broadcast',
                chain_record_chain_id: chainId,
                chain_record_broadcast_hash: broadcastHash,
                chain_record_broadcast_at: new Date(),
              },
              $unset: {
                chain_record_lease_until: 1,
                chain_record_lease_owner: 1,
              },
            },
            { new: true },
          );
          if (!broadcast) {
            const current = await this.withdrawModel.findById(workRecord._id);
            if (current?.chain_record_state === 'recorded') return;
            if (
              current?.status === 'rejected' ||
              current?.chain_record_state === 'failed'
            ) {
              throw new ChainRecordRejectedError(
                'The chain-record transaction was rejected during reconciliation.',
              );
            }
            throw new ConflictException(
              'The chain transaction was submitted, but its evidence could not be attached. The balance remains reserved for reconciliation.',
            );
          }
          workRecord = broadcast;
        },
      );
    } catch (error) {
      this.logger.error(
        `Withdrawal on-chain record failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      if (!(error instanceof ChainRecordRejectedError)) {
        throw new HttpException(
          {
            message:
              'The chain-record outcome is still being verified. Your balance remains reserved; retry this same request shortly.',
          },
          503,
        );
      }
      return throwDefinitiveChainFailure(workRecord);
    }
    const evidenced = await this.withdrawModel.findOneAndUpdate(
      {
        _id: workRecord._id,
        status: 'pending',
        tx_hash_record: { $in: ['', null] },
        chain_record_state: { $in: ['processing', 'broadcast'] },
      },
      {
        $set: {
          tx_hash_record: hashRecord,
          chain_record_state: 'recorded',
          chain_record_confirmed_at: new Date(),
        },
        $unset: {
          chain_record_lease_until: 1,
          chain_record_lease_owner: 1,
        },
      },
      { new: true },
    );
    if (!evidenced) {
      const current = await this.withdrawModel.findById(workRecord._id);
      if (
        current?.tx_hash_record ||
        current?.chain_record_state === 'recorded'
      ) {
        return completedResponse(current, true);
      }
      throw new ConflictException(
        'The withdrawal changed before chain evidence could be attached. It requires manual review.',
      );
    }
    return completedResponse(evidenced, reservation.replayed);
  }

  /**
   * MiniPay manual withdraw request.
   *
   * No on-chain call — the user's wallet is custodial (MiniPay) and they can
   * not sign contract calls. Admin fulfils the request externally, then
   * marks the record paid via {@link markWithdrawPaid}.
   *
   * Rejects if the user already has a pending manual request (one-at-a-time)
   * or if their session doesn't carry an email (tight coupling with the
   * blocking email modal on the client — server enforces the same contract).
   */
  async createManualWithdrawRequest(
    dto: CreateManualWithdrawRequestDto,
    userId: string,
  ) {
    const user = await this.userModel.findOne({
      _id: new Types.ObjectId(userId),
    });
    if (!user) {
      throw new UnauthorizedException({ message: 'User not found' });
    }
    if (!user.email || user.email.trim().length === 0) {
      throw new HttpException(
        { message: 'Email required before requesting a withdrawal' },
        400,
      );
    }
    await this.reconcileExpiredSignatureReservations(userId);

    try {
      const record = await this.runSerializedWithdraw(
        userId,
        async (session) => {
          // USDT/USDC are $1-pegged. This read occurs only after acquiring the
          // shared user lock, so every withdrawal mode sees prior reservations.
          const balance = await this.checkWithdraw(userId);
          const availableUsd = Number(balance?.netAmount ?? 0);
          if (
            !Number.isFinite(availableUsd) ||
            dto.amount > availableUsd + 1e-6
          ) {
            throw new HttpException(
              {
                message: `Requested amount exceeds available balance (${availableUsd.toFixed(2)} USD)`,
              },
              400,
            );
          }

          const [created] = await this.withdrawModel.create(
            [
              {
                user_id: user._id,
                status: 'pending',
                address: dto.address,
                account_name: user.username || '',
                bank_name: '',
                account_number: '',
                tx_hash: '',
                tx_hash_record: '',
                percent_fee: 0,
                amount_total: dto.amount,
                amount_net: dto.amount,
                method: 'minipay_manual',
                currency: dto.currency,
                chain: 'CELO',
                conversion_id: [],
                mycashback_id: [],
                rate: 0,
                withdraw_mode: 'manual',
              },
            ],
            { session },
          );
          return created;
        },
      );
      return { success: true, data: record };
    } catch (err: unknown) {
      // Duplicate-key error from the partial unique index on
      // (user_id, withdraw_mode: "manual", status: "pending") means another
      // request for this user slipped through concurrently.
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code?: number }).code === 11000
      ) {
        throw new HttpException(
          {
            message:
              'You already have a pending withdrawal request. Please wait for it to be processed.',
          },
          409,
        );
      }
      throw err;
    }
  }

  /**
   * Admin action: record that the MiniPay manual payout has been sent on-chain.
   * Idempotent — if the record is already paid, returns it unchanged rather
   * than double-paying.
   */
  async markWithdrawPaid(
    withdrawId: string,
    dto: MarkWithdrawPaidDto,
    actor: AdminActor,
  ) {
    if (!Types.ObjectId.isValid(withdrawId)) {
      throw new HttpException({ message: 'Invalid withdraw id' }, 400);
    }
    const withdrawObjectId = new Types.ObjectId(withdrawId);
    const canonicalTxHash = requireCanonicalEvmTransactionHash(dto.tx_hash);
    const before = await this.withdrawModel.findById(withdrawObjectId);
    if (!before) {
      throw new HttpException({ message: 'Withdraw not found' }, 404);
    }
    if (before.withdraw_mode !== 'manual') {
      throw new HttpException(
        { message: 'Only manual withdrawals can be marked paid' },
        400,
      );
    }
    if (
      before.status === 'paid' &&
      String(before.tx_hash ?? '').toLowerCase() === canonicalTxHash
    ) {
      return { success: true, data: before };
    }
    if (before.status !== 'pending') {
      throw new HttpException(
        {
          message:
            before.status === 'paid'
              ? 'This withdrawal was already paid with different payout evidence.'
              : `This withdrawal can only be marked paid while it is pending (it is currently ${before.status}).`,
        },
        409,
      );
    }

    let updated: WithdrawDocument | null;
    try {
      updated = await this.runSerializedWithdraw(
        String(before.user_id),
        async (session) => {
          const reusedEvidence = await this.withdrawModel
            .findOne({
              _id: { $ne: withdrawObjectId },
              tx_hash: { $regex: `^${canonicalTxHash}$`, $options: 'i' },
            })
            .session(session)
            .exec();
          if (reusedEvidence) {
            throw new ConflictException(
              'This tx_hash is already recorded on another withdrawal',
            );
          }
          return this.withdrawModel.findOneAndUpdate(
            {
              _id: withdrawObjectId,
              user_id: before.user_id,
              status: 'pending',
              withdraw_mode: 'manual',
            },
            {
              $set: {
                status: 'paid',
                tx_hash: canonicalTxHash,
                paid_by: actor.id,
                paid_at: new Date(),
              },
            },
            { new: true, session },
          );
        },
      );
    } catch (err: unknown) {
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code?: number }).code === 11000
      ) {
        throw new HttpException(
          { message: 'This tx_hash is already recorded on another withdrawal' },
          409,
        );
      }
      throw err;
    }

    if (updated) {
      await this.adminActivity.append({
        actor_type: 'admin',
        actor_id: actor.id,
        actor_label: actor.label,
        action: 'withdraw.marked_paid',
        entity_type: 'withdraw',
        entity_id: withdrawId,
        summary: 'Marked manual withdrawal paid',
        metadata: {
          tx_hash: canonicalTxHash,
          amount_net: updated.amount_net,
          currency: updated.currency,
        },
      });
      return { success: true, data: updated };
    }

    // The CAS did not win. Re-read only to classify the authoritative state;
    // never issue a second mutation from this branch.
    const existing = await this.withdrawModel.findById(withdrawObjectId);
    if (!existing) {
      throw new HttpException({ message: 'Withdraw not found' }, 404);
    }
    if (
      existing.status === 'paid' &&
      String(existing.tx_hash ?? '').toLowerCase() === canonicalTxHash
    ) {
      return { success: true, data: existing };
    }
    throw new HttpException(
      {
        message:
          existing.status === 'paid'
            ? 'This withdrawal was already paid with different payout evidence.'
            : `This withdrawal can only be marked paid while it is pending (it is currently ${existing.status}).`,
      },
      409,
    );
  }

  /**
   * Admin action (V-2b): approve a pending withdrawal — e.g. confirm the
   * on-chain withdrawal tx actually settled. Replaces the old client-tx_hash ->
   * 'approved' self-promotion. Idempotent on already-approved; refuses any other
   * terminal state so a paid/rejected row cannot be flipped back to approved.
   */
  async approveWithdrawRequest(withdrawId: string, actor: AdminActor) {
    if (!isValidObjectId(withdrawId)) {
      throw new HttpException({ message: 'Invalid withdraw id' }, 400);
    }
    const withdrawObjectId = new Types.ObjectId(withdrawId);
    const before = await this.withdrawModel.findById(withdrawObjectId);
    if (!before) {
      throw new HttpException({ message: 'Withdraw not found' }, 404);
    }
    if (before.withdraw_mode === 'manual') {
      throw new HttpException(
        { message: 'Manual withdrawals must be completed with mark-paid.' },
        409,
      );
    }
    if (before.method === 'bank_transfer') {
      throw new HttpException(
        {
          message:
            'Bank transfers must be approved through the evidence-verified admin workflow.',
        },
        409,
      );
    }
    if (before.status === 'approved') {
      await this.withdrawModel.updateMany(
        { parent_withdraw_id: withdrawObjectId, status: 'pending' },
        { $set: { status: 'approved' } },
      );
      return { success: true, data: before };
    }
    if (before.status !== 'pending') {
      throw new HttpException(
        {
          message: `Only pending withdrawals can be approved (current: ${before.status})`,
        },
        409,
      );
    }
    if (
      !String(before.tx_hash_record ?? '').trim() &&
      before.chain_record_state !== 'recorded'
    ) {
      throw new HttpException(
        {
          message:
            'Chain-record evidence must be attached before this withdrawal can be approved.',
        },
        409,
      );
    }
    const approval = await this.runSerializedWithdraw(
      String(before.user_id),
      async (session) => {
        const primary = await this.withdrawModel.findOneAndUpdate(
          {
            _id: withdrawObjectId,
            user_id: before.user_id,
            status: 'pending',
            withdraw_mode: { $ne: 'manual' },
            ...(before.chain_record_state === 'recorded'
              ? { chain_record_state: 'recorded' }
              : { tx_hash_record: String(before.tx_hash_record) }),
          },
          {
            $set: {
              status: 'approved',
              approved_by: actor.id,
              approved_at: new Date(),
            },
          },
          { new: true, session },
        );
        if (!primary) return { companionCount: 0, primary: null };
        const companions = await this.withdrawModel.updateMany(
          { parent_withdraw_id: withdrawObjectId, status: 'pending' },
          { $set: { status: 'approved' } },
          { session },
        );
        return {
          companionCount: Number(companions.modifiedCount ?? 0),
          primary,
        };
      },
    );
    const updated = approval.primary;
    if (updated) {
      await this.adminActivity.append({
        actor_type: 'admin',
        actor_id: actor.id,
        actor_label: actor.label,
        action: 'withdraw.approved',
        entity_type: 'withdraw',
        entity_id: withdrawId,
        summary: 'Approved withdrawal payout',
        metadata: {
          amount_net: updated.amount_net,
          currency: updated.currency,
          method: updated.method,
          companion_status_changes: approval.companionCount,
        },
      });
      return { success: true, data: updated };
    }

    const existing = await this.withdrawModel.findById(withdrawObjectId);
    if (!existing) {
      throw new HttpException({ message: 'Withdraw not found' }, 404);
    }
    if (existing.withdraw_mode === 'manual') {
      throw new HttpException(
        { message: 'Manual withdrawals must be completed with mark-paid.' },
        409,
      );
    }
    if (existing.status === 'approved') {
      return { success: true, data: existing };
    }
    throw new HttpException(
      {
        message: `Only pending withdrawals can be approved (current: ${existing.status})`,
      },
      409,
    );
  }

  /**
   * Runs a withdraw balance-check + insert inside a per-user serialized Mongo
   * transaction (P1-TX). The $inc on the user doc is a pure serialization point:
   * two concurrent withdrawals for the same user contend on it, so the loser
   * hits a WriteConflict, retries the whole callback, and re-evaluates the
   * balance against the now-committed first withdrawal — closing the TOCTOU
   * where both reads see the same balance and both insert. Requires a replica
   * set (confirmed for staging/prod).
   */
  private async runSerializedWithdraw<T>(
    userId: string,
    work: (session: ClientSession, lockedUser: User) => Promise<T>,
  ): Promise<T> {
    const session = await this.connection.startSession();
    try {
      let result: T | undefined;
      await session.withTransaction(async () => {
        const userObjectId = new Types.ObjectId(userId);
        const user = await this.userModel.findOneAndUpdate(
          { _id: userObjectId, wallet_frozen: { $ne: true } },
          { $inc: { withdraw_lock_seq: 1 } },
          { session },
        );
        if (!user) {
          const existing = await this.userModel.findOne(
            { _id: userObjectId },
            { _id: 1, wallet_frozen: 1 },
            { session },
          );
          if (existing) {
            throw new ForbiddenException({
              message:
                'Your wallet is frozen. Contact support before withdrawing.',
            });
          }
          throw new UnauthorizedException({ message: 'User not found' });
        }
        result = await work(session, user);
      });
      return result as T;
    } finally {
      await session.endSession();
    }
  }

  async createBankTransfer(
    createWithdrawDto: CreateWithdrawDto,
    id: string,
    idempotencyKeyRaw?: string,
  ) {
    // console.log(createWithdrawDto);
    const user = await this.userModel.findOne({
      _id: new Types.ObjectId(id),
    });
    if (!user) {
      throw new UnauthorizedException({ message: 'User not found' });
    }
    // const chek = createWithdrawDto?.mycashback_id
    //   ? {
    //       mycashback_id: {
    //         $in: createWithdrawDto.mycashback_id?.map(
    //           (id) => new Types.ObjectId(id),
    //         ),
    //       },
    //     }
    //   : { conversion_id: createWithdrawDto.conversion_ids };
    // const conversionIdsWithdrawed = await this.withdrawModel
    //   .find({
    //     user_id: new Types.ObjectId(user._id),
    //     ...chek,
    //   })
    //   .lean();
    // New clients persist a command key. Older installed clients are reconciled
    // by effect inside the same per-user serialized transaction for a bounded
    // retry window, so a lost response does not create a second payout.
    const suppliedIdempotencyKey = idempotencyKeyRaw?.trim()
      ? requireTrimmedString(idempotencyKeyRaw, 128, 'Idempotency-Key header')
      : null;
    const idempotencyKey = suppliedIdempotencyKey ?? `legacy:${randomUUID()}`;
    if (!/^[A-Za-z0-9._:-]+$/.test(idempotencyKey)) {
      throw new BadRequestException(
        'The Idempotency-Key header you provided is not valid.',
      );
    }
    const currency = requireOneOf(
      String(createWithdrawDto.currency || 'THB')
        .trim()
        .toUpperCase(),
      ['THB', 'USD'] as const,
      'withdraw currency',
    );
    const amountNet = Number(createWithdrawDto.amount_net ?? 0);
    const accountName = requireTrimmedString(
      createWithdrawDto.account_name,
      160,
      'account name',
    );
    const accountNumber = requireTrimmedString(
      createWithdrawDto.account_number,
      64,
      'account number',
    );
    const bankName = requireTrimmedString(
      createWithdrawDto.bank_name,
      160,
      'bank name',
    );
    const couponCodeRaw = createWithdrawDto.coupon_code?.trim();
    const couponCode = couponCodeRaw
      ? normalizeWithdrawFeeCouponCode(couponCodeRaw)
      : null;
    const idempotencyEffectHash = createHash('sha256')
      .update(
        JSON.stringify({
          account_name: accountName,
          account_number: accountNumber,
          amount_net: amountNet,
          bank_name: bankName,
          coupon_code: couponCode,
          currency,
        }),
      )
      .digest('hex');
    await this.reconcileExpiredSignatureReservations(id);

    // V-2 + P1-TX: balance gate, coupon eligibility, inventory, and writes all
    // run inside the per-user serialized transaction so concurrent redeems cannot
    // bypass usage_per_user / quantity checks with a stale pre-txn count.
    const command = await this.runSerializedWithdraw(id, async (session) => {
      const existingCommand = await this.withdrawModel
        .findOne(
          suppliedIdempotencyKey
            ? {
                user_id: new Types.ObjectId(user._id),
                idempotency_key: suppliedIdempotencyKey,
              }
            : {
                user_id: new Types.ObjectId(user._id),
                idempotency_key: /^legacy:/,
                idempotency_effect_hash: idempotencyEffectHash,
                status: { $ne: 'rejected' },
                createdAt: {
                  $gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                },
              },
        )
        .session(session)
        .exec();
      if (existingCommand) {
        if (existingCommand.idempotency_effect_hash !== idempotencyEffectHash) {
          throw new ConflictException(
            'This Idempotency-Key is already bound to a different withdrawal.',
          );
        }
        return { record: existingCommand, replayed: true };
      }

      const fee = await this.feeRateModel.findOne().exec();
      if (!fee) {
        this.logger.error(
          'Withdrawal blocked: no FeeRate document configured.',
        );
        throw new HttpException(
          {
            message:
              'Withdrawals are temporarily unavailable. Please try again later or contact support.',
          },
          400,
        );
      }

      await this.assertWithinBalance(id, amountNet, currency);

      const balance = await this.checkWithdraw(id);
      const availableBalance =
        currency === 'THB'
          ? Number(balance.netAmountTHB || 0)
          : Number(balance.netAmount || 0);

      let couponDoc: WithdrawFeeCouponDocument | null = null;
      let userRedemptionCount = 0;
      if (couponCodeRaw) {
        couponDoc = await this.withdrawFeeCouponModel
          .findOne({ code: couponCode })
          .session(session)
          .exec();
        if (!couponDoc) {
          throw new HttpException({ message: 'Coupon code not found.' }, 400);
        }
        userRedemptionCount = await this.withdrawFeeCouponRedemptionModel
          .countDocuments({
            coupon_id: couponDoc._id,
            user_id: new Types.ObjectId(id),
          })
          .session(session)
          .exec();
      }

      const preview = resolveWithdrawFeePreview({
        feeRate: fee,
        amount: amountNet,
        availableBalance,
        currency,
        method: 'bank_transfer',
        coupon: couponDoc ? this.toCouponLike(couponDoc) : null,
        userRedemptionCount,
      });
      if (preview.ok === false) {
        throw new HttpException(
          { message: this.previewFailureMessage(preview.reason) },
          400,
        );
      }

      if (couponDoc && !couponDoc.unlimited_quantity) {
        const fresh = await this.withdrawFeeCouponModel
          .findOneAndUpdate(
            {
              _id: couponDoc._id,
              disabled: { $ne: true },
              $expr: {
                $lt: ['$quantity_used', { $ifNull: ['$quantity', 0] }],
              },
            },
            { $inc: { quantity_used: 1 } },
            { new: true, session },
          )
          .exec();
        if (!fresh) {
          throw new HttpException(
            { message: 'This coupon has no remaining uses.' },
            400,
          );
        }
      } else if (couponDoc) {
        const freshUnlimited = await this.withdrawFeeCouponModel
          .findOneAndUpdate(
            { _id: couponDoc._id, disabled: { $ne: true } },
            { $inc: { quantity_used: 1 } },
            { new: true, session },
          )
          .exec();
        if (!freshUnlimited) {
          throw new HttpException({ message: 'This coupon is disabled.' }, 400);
        }
      }

      const [record] = await this.withdrawModel.create(
        [
          {
            user_id: new Types.ObjectId(user._id),
            status: 'pending',
            address: '',
            account_name: accountName,
            bank_name: bankName,
            account_number: accountNumber,
            tx_hash: '',
            tx_hash_record: '',
            percent_fee: 0,
            // amount_total reserves balance in checkWithdraw(), so it must be
            // derived from the amount the server just validated. Trusting the
            // body here lets amount_net=500 + amount_total=0 reserve nothing.
            amount_total: amountNet,
            amount_net: amountNet,
            method: 'bank_transfer',
            currency,
            conversion_id: createWithdrawDto.conversion_ids || [],
            mycashback_id: [],
            idempotency_key: idempotencyKey,
            idempotency_effect_hash: idempotencyEffectHash,
            withdraw_fee_base: preview.base_fee,
            withdraw_fee_discount: preview.discount,
            withdraw_fee_final: preview.final_fee,
            ...(couponDoc
              ? {
                  coupon_id: couponDoc._id,
                  coupon_code: normalizeWithdrawFeeCouponCode(couponDoc.code),
                }
              : {}),
          },
        ],
        { session },
      );

      if (couponDoc) {
        await this.withdrawFeeCouponRedemptionModel.create(
          [
            {
              coupon_id: couponDoc._id,
              user_id: new Types.ObjectId(user._id),
              withdraw_id: record._id,
              code_snapshot: normalizeWithdrawFeeCouponCode(couponDoc.code),
              base_fee: preview.base_fee,
              discount_amount: preview.discount,
              final_fee: preview.final_fee,
            },
          ],
          { session },
        );
      }
      const myCashback = await this.checkWithdrawMyCashback(id);
      const autoFields = buildAutoMyCashbackWithdrawFields(
        {
          ...createWithdrawDto,
          amount_total: amountNet,
          method: 'bank_transfer',
        },
        new Types.ObjectId(user._id),
        myCashback,
        record._id,
      );
      if (autoFields) {
        await this.withdrawModel.create([autoFields], { session });
      }
      return { record, replayed: false };
    });
    const dt = command.record;

    if (!command.replayed)
      await this.adminActivity.append({
        actor_type: 'customer',
        actor_id: String(user._id),
        actor_label: user.username || user.email || String(user._id),
        action: 'withdraw.created',
        entity_type: 'withdraw',
        entity_id: String(dt._id),
        summary: `Bank transfer withdraw ${amountNet} ${currency}`,
        metadata: {
          amount_net: amountNet,
          currency,
          method: 'bank_transfer',
          coupon_code: couponCodeRaw
            ? normalizeWithdrawFeeCouponCode(couponCodeRaw)
            : undefined,
          withdraw_fee_final: dt.withdraw_fee_final,
        },
      });
    if (!command.replayed && couponCodeRaw && dt.coupon_id) {
      await this.adminActivity.append({
        actor_type: 'customer',
        actor_id: String(user._id),
        actor_label: user.username || user.email || String(user._id),
        action: 'withdraw.fee_coupon.redeemed',
        entity_type: 'withdraw_fee_coupon',
        entity_id: String(dt.coupon_id),
        summary: `Redeemed fee coupon ${normalizeWithdrawFeeCouponCode(couponCodeRaw)}`,
        metadata: {
          withdraw_id: String(dt._id),
          discount: dt.withdraw_fee_discount,
          final_fee: dt.withdraw_fee_final,
        },
      });
    }

    return {
      message: 'Withdraw request created',
      data: dt,
      status: 'success',
      reused: command.replayed,
    };
  }

  async findAll(params: GetWithdrawTransactionsDTO, id: string) {
    const user = await this.userModel.findOne({ _id: new Types.ObjectId(id) });
    if (!user) {
      throw new UnauthorizedException({ message: 'User not found' });
    }
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 10;
    const skip = (page - 1) * limit;

    const query: any = { user_id: new Types.ObjectId(user._id) };

    if (params.search) {
      query.$or = [
        { address: { $regex: params.search, $options: 'i' } },
        { account_name: { $regex: params.search, $options: 'i' } },
        { bank_name: { $regex: params.search, $options: 'i' } },
        { account_number: { $regex: params.search, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.withdrawModel
        .find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      this.withdrawModel.countDocuments(query),
    ]);
    const totalAmount = data.reduce((acc, item) => acc + item.amount_net, 0);
    const dataall = {
      pending: await this.withdrawModel.countDocuments({
        user_id: new Types.ObjectId(user._id),
        status: 'pending',
      }),
      approved: await this.withdrawModel.countDocuments({
        user_id: new Types.ObjectId(user._id),
        status: 'approved',
      }),
      rejected: await this.withdrawModel.countDocuments({
        user_id: new Types.ObjectId(user._id),
        status: 'rejected',
      }),
    };

    return {
      data: data.sort(
        (a, b) =>
          new Date((b as any).createdAt).getTime() -
          new Date((a as any).createdAt).getTime(),
      ),
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      totalAmount,
      ...dataall,
    };
  }

  findOne(id: number) {
    return `This action returns a #${id} withdraw`;
  }

  async update(id: string, updateWithdrawDto: UpdateWithdrawDto) {
    void updateWithdrawDto;
    void id;
    // const dt = await this.withdrawModel.findByIdAndUpdate(
    //   new Types.ObjectId(id),
    //   updateWithdrawDto,
    //   { new: true },
    // );
    return {
      message: 'Withdraw request updated',
      data: 'dt',
      status: 'success',
    };
  }

  remove(id: number) {
    return `This action removes a #${id} withdraw`;
  }

  async createWithdrawMethod(
    createWithdrawMethod: CreateWithdrawMethod,
    id: string,
  ) {
    if (typeof id !== 'string') {
      throw new BadRequestException('The user id you provided is not valid.');
    }
    const authenticatedUserId = requireObjectId(id, 'user id');

    const rawAccountNo: unknown = createWithdrawMethod?.account_no;
    if (typeof rawAccountNo !== 'string') {
      throw new BadRequestException(
        'The account number you provided is not valid.',
      );
    }
    const accountNo = requireTrimmedString(
      rawAccountNo,
      rawAccountNo.length,
      'account number',
    );
    if (accountNo !== rawAccountNo || !/^[0-9]+$/.test(accountNo)) {
      throw new BadRequestException(
        'The account number you provided is not valid.',
      );
    }

    const user = await this.userModel.findOne({
      _id: authenticatedUserId,
    });
    if (!user) {
      throw new UnauthorizedException({ message: 'User not found' });
    }
    const ownerId = new Types.ObjectId(user._id);
    const checkDup = await this.withdrawMethodModel.findOne({
      account_no: mongoEq(accountNo),
      user_id: ownerId,
    });
    if (checkDup) {
      throw new HttpException(
        { message: 'Account number already exists' },
        400,
      );
    }
    const dt = await this.withdrawMethodModel.create({
      account_no: accountNo,
      account_name: createWithdrawMethod.account_name,
      bank_name: createWithdrawMethod.bank_name,
      bank_code: createWithdrawMethod.bank_code,
      is_default: createWithdrawMethod.is_default,
      user_id: ownerId,
    });
    return {
      message: 'Withdraw method created',
      data: dt,
      status: 'success',
    };
  }

  getBankList() {
    return thaiBanks;
  }

  // V-3: scope by owner so a member can only read their OWN saved payout method
  // (was findById on a raw id — any user could read another's bank details).
  getMethodId(id: string, userId: string) {
    if (!isValidObjectId(id)) return null;
    return this.withdrawMethodModel.findOne({
      _id: new Types.ObjectId(id),
      user_id: new Types.ObjectId(userId),
    });
  }

  async getMethodList(id: string) {
    const user = await this.userModel.findOne({
      _id: new Types.ObjectId(id),
    });
    if (!user) {
      throw new UnauthorizedException({ message: 'User not found' });
    }
    return this.withdrawMethodModel.find({
      user_id: new Types.ObjectId(user._id),
    });
  }

  // V-3: scope the delete to the owner so a member cannot delete another user's
  // saved payout method by guessing its _id (atomic findOneAndDelete).
  deleteMethodData(id: string, userId: string) {
    if (!isValidObjectId(id)) return null;
    return this.withdrawMethodModel.findOneAndDelete({
      _id: new Types.ObjectId(id),
      user_id: new Types.ObjectId(userId),
    });
  }

  // V-3: scope the update to the owner so a member cannot overwrite another
  // user's bank details (payout-redirect) by guessing its _id.
  updateMethodData(
    id: string,
    userId: string,
    updateData: Partial<CreateWithdrawMethod>,
  ) {
    if (!isValidObjectId(id)) return null;
    const patch: Partial<CreateWithdrawMethod> = {};
    if (updateData.account_no !== undefined) {
      patch.account_no = updateData.account_no;
    }
    if (updateData.account_name !== undefined) {
      patch.account_name = updateData.account_name;
    }
    if (updateData.bank_name !== undefined) {
      patch.bank_name = updateData.bank_name;
    }
    if (updateData.bank_code !== undefined) {
      patch.bank_code = updateData.bank_code;
    }
    if (updateData.is_default !== undefined) {
      patch.is_default = updateData.is_default;
    }
    return this.withdrawMethodModel.findOneAndUpdate(
      mongoFilter({
        _id: requireObjectId(id),
        user_id: requireObjectId(userId, 'user id'),
      }),
      mongoSetUpdate(patch),
      { new: true },
    );
  }

  private async assertLegacyRankPayoutWinner(
    payoutKey: string,
    expected: {
      questId: string;
      userId: string;
      rank: number;
      amount: number;
      currency: string;
    },
  ) {
    const winner = await this.conversionModel
      .findOne({ quest_payout_key: payoutKey })
      .lean();
    const matches =
      winner &&
      String(winner.user_id ?? '') === expected.userId &&
      winner.aff_sub1 === affSub1ForUserId(expected.userId) &&
      winner.offer_name === 'reward_conversion_quest' &&
      String(winner.adv_sub3 ?? '') === expected.questId &&
      String(winner.adv_sub5 ?? '') === String(expected.rank) &&
      Number(winner.payout) === expected.amount &&
      String(winner.currency || 'THB') === expected.currency &&
      String(winner.source || 'involve') === 'involve' &&
      String(winner.provider_account || '') === 'legacy-quest' &&
      String(winner.provider_conversion_id || '') === payoutKey &&
      winner.quest_synthetic_reward === true;
    if (!matches) {
      throw new HttpException(
        {
          message: 'Legacy rank payout identity conflicts with existing effect',
        },
        409,
      );
    }
    return winner;
  }

  async adminAddRewardConversionForQuest() {
    const now = new Date();
    const questDate = await this.questModel.findOne({
      status: 'close',
      legacy_payout_reconciliation_status: 'ready',
      legacy_payout_reconciliation_version: 1,
      legacy_rank_payout_completed_at: { $exists: false },
      $and: [
        legacyQuestRewardFilter(),
        {
          $or: [
            { reward_distribution_mode: { $exists: false } },
            { reward_distribution_mode: 'campaign_end' },
            {
              reward_distribution_mode: 'after_days',
              reward_distribution_scheduled_at: { $lte: now },
            },
          ],
        },
      ],
    });

    if (!questDate) {
      // throw new HttpException({ message: 'Quest date not found' }, 400);
      console.log('Quest date not found for adminAddRewardConversionForQuest');
      return;
    }
    const manifestCollection =
      this.questModel.db.collection<LegacyRewardManifest>(
        'legacyrewardmanifests',
      );
    const manifest = await manifestCollection.findOne({
      manifest_key: legacyRewardManifestKey(questDate._id, 'rank'),
    });
    const questConfigChecksum = legacyQuestPayoutConfigChecksum(
      questDate.toObject?.() ?? questDate,
    );
    if (questDate.legacy_payout_config_checksum !== questConfigChecksum) {
      throw new HttpException(
        { message: 'Legacy rank quest configuration checksum mismatch' },
        409,
      );
    }
    assertLegacyRewardManifest(
      manifest,
      questDate._id,
      'rank',
      Number(questDate.legacy_payout_reconciliation_version),
      questConfigChecksum,
    );
    const userReceivedReward = manifest.recipients;

    const questRewards = [...((questDate as any).rewards ?? [])]
      .filter((item) => Number(item?.rank) >= 1)
      .sort((a, b) => Number(a.rank) - Number(b.rank));
    const rewardList =
      questRewards.length > 0 ? { name: 'quest', data: questRewards } : null;

    const payableRecipients = userReceivedReward.filter(
      (recipient) => !recipient.excluded,
    );
    if (!rewardList && payableRecipients.length > 0) {
      throw new HttpException(
        {
          message:
            'This legacy quest has no immutable reward snapshot. Reconcile it before enabling payouts.',
        },
        409,
      );
    }

    const list = [];
    const rewardsByRank = new Map(
      (rewardList?.data ?? []).map((item) => [Number(item.rank), item]),
    );
    for (let i = 0; i < userReceivedReward.length; i++) {
      if (userReceivedReward[i].excluded) continue;
      const rank = Number(userReceivedReward[i].rank);
      const rankReward =
        rewardsByRank.get(rank) ?? rewardList?.data?.[rank - 1] ?? null;
      if (
        !rankReward ||
        Number(rankReward.reward) !== Number(userReceivedReward[i].amount) ||
        String(rankReward.currency || 'THB') !==
          String(userReceivedReward[i].currency || 'THB')
      ) {
        throw new HttpException(
          { message: 'Legacy rank recipient manifest economics mismatch' },
          409,
        );
      }
      const user = userReceivedReward[i];
      const payoutKey = legacyRankPayoutKey(questDate._id, user.user_id, rank);
      if (user.payout_key !== payoutKey) {
        throw new HttpException(
          { message: 'Legacy rank recipient manifest identity mismatch' },
          409,
        );
      }
      const data = {
        conversion_id: legacySyntheticConversionId(payoutKey),
        provider_conversion_id: payoutKey,
        provider_account: 'legacy-quest',
        quest_payout_key: payoutKey,
        offer_id: 0,
        offer_name: 'reward_conversion_quest',
        merchant_id: 0,
        aff_sub2: '',
        aff_sub3: '',
        aff_sub4: '',
        aff_sub5: '',
        adv_sub1: `${questDate.start_date.toLocaleDateString('en-CA')} - ${questDate.end_date.toLocaleDateString('en-CA')}`, // "Reward Quest 2024-01-01 - 2024-01-31"
        adv_sub2: `Reward Quest ${questDate.start_date.toLocaleDateString('en-CA')} - ${questDate.end_date.toLocaleDateString('en-CA')}`,
        adv_sub3: questDate?._id.toString() || '', // quest ID
        adv_sub4: 0,
        adv_sub5: String(rank),
        conversion_status: 'approved',
        datetime_conversion: now,
        affiliate_remarks: '',
        base_payout: 0,
        bonus_payout: 0,
        // change data
        aff_sub1: `user_id:${user.user_id}`, // "user_id:68bf99fed9667685c1637607"
        // P1-COLLSCAN: persist the indexed user_id alongside the legacy aff_sub1.
        ...(isValidObjectId(user.user_id)
          ? { user_id: new Types.ObjectId(user.user_id) }
          : {}),
        currency: user.currency || 'THB',
        payout: Number(user.amount),
        sale_amount: 0,
        source: 'involve',
        quest_synthetic_reward: true,
      };
      const payoutData = Number(user.amount);

      data.payout = payoutData;

      // console.log('data', data);
      try {
        const payoutWrite = await this.conversionModel.updateOne(
          { quest_payout_key: payoutKey },
          { $setOnInsert: data },
          { upsert: true },
        );
        if (payoutWrite.matchedCount === 1 && !payoutWrite.upsertedCount) {
          await this.assertLegacyRankPayoutWinner(payoutKey, {
            questId: questDate._id.toString(),
            userId: String(user.user_id),
            rank,
            amount: Number(user.amount),
            currency: String(user.currency || 'THB'),
          });
        }
      } catch (error) {
        if ((error as { code?: number })?.code !== 11000) throw error;
        await this.assertLegacyRankPayoutWinner(payoutKey, {
          questId: questDate._id.toString(),
          userId: String(user.user_id),
          rank,
          amount: Number(user.amount),
          currency: String(user.currency || 'THB'),
        });
      }
      list.push(data);
    }
    const manifestCompletion = await manifestCollection.updateOne(
      {
        manifest_key: manifest.manifest_key,
        manifest_hash: manifest.manifest_hash,
        quest_config_checksum: questConfigChecksum,
        status: { $in: ['ready', 'completed'] },
      },
      { $set: { status: 'completed', completed_at: new Date() } },
    );
    if (manifestCompletion.matchedCount !== 1) {
      throw new HttpException(
        { message: 'Legacy rank manifest completion fence was lost' },
        409,
      );
    }
    await this.questModel.findOneAndUpdate(
      {
        _id: questDate._id,
        legacy_payout_reconciliation_status: 'ready',
        legacy_payout_reconciliation_version: 1,
        legacy_payout_config_checksum: questConfigChecksum,
        legacy_rank_payout_completed_at: { $exists: false },
      },
      {
        $set: {
          legacy_rank_payout_completed_at: new Date(),
          reward_status: true,
        },
      },
      { new: true },
    );
    return rewardList;
  }

  async createRewardList(payload: RequestCreateRewardList) {
    const has = await this.rewardListModel.findOne({ name: 'quest' });
    if (has) {
      await this.rewardListModel.deleteOne({ name: 'quest' });
    }
    const data = await this.rewardListModel.create({
      name: 'quest',
      data: payload.list,
    });
    return data;
  }

  async createConversionReward({
    reward_type,
    reward_amount,
    reward_currency,
    user,
  }: RequestCreateConversionReward) {
    const filterUSer = {};
    if (user?.includes('@')) {
      filterUSer['email'] = user;
    } else {
      if (user?.startsWith('0')) {
        user = '+66' + user.slice(1);
      }
      filterUSer['mobile'] = user;
    }
    const userData = await this.userModel.findOne({ ...filterUSer });
    if (!userData) {
      throw new HttpException({ message: 'User not found' }, 400);
    }
    const user_id = userData._id.toString();
    const data = {
      conversion_id: new Date().getTime(), // Use timestamp as unique ID for simplicity
      offer_id: 0,
      offer_name: 'reward_conversion_quest',
      merchant_id: 0,
      aff_sub2: '',
      aff_sub3: '',
      aff_sub4: '',
      aff_sub5: '',
      adv_sub1: reward_type, // "Reward Quest 2024-01-01 - 2024-01-31"
      adv_sub2: reward_type,
      adv_sub3: '', // quest ID
      adv_sub4: '',
      adv_sub5: '',
      conversion_status: 'approved',
      datetime_conversion: new Date(),
      affiliate_remarks: '',
      base_payout: 0,
      bonus_payout: 0,
      aff_sub1: affSub1ForUserId(user_id),
      // P1-COLLSCAN: persist the indexed user_id alongside the legacy aff_sub1.
      user_id: userData._id,
      currency: reward_currency || 'THB',
      payout: Number(reward_amount) || 0,
      sale_amount: 0,
      source: 'involve',
      // This admin grant is a quest/reward payout, not an affiliate sale. The
      // explicit marker keeps all analytics and task consumers fail-closed;
      // legacy rows remain recognizable by the reserved offer_name above.
      quest_synthetic_reward: true,
    };

    return await this.conversionModel.create(data);
  }
}
