import {
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  CreateManualWithdrawRequestDto,
  CreateWithdrawDto,
  GETSignDTO,
  GetWithdrawTransactionsDTO,
  MarkWithdrawPaidDto,
  RequestCreateRewardList,
} from './dto/create-withdraw.dto';
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
import { Withdraw } from './schemas/withdraw.schema';
import { FeeRate } from './schemas/feeRate.schema';
import { Offer } from 'src/offer/schemas/offer.schema';
import { WithdrawMethod } from './schemas/withdrawMethod.schema';
import { rateCurrencyUSD, thaiBanks } from 'src/utils/helper';
import { UserMyCashback } from 'src/user/schemas/user-my-cashback.schema';
import { Conversion } from './schemas/conversion.schema';
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
  mongoFilter,
  mongoSetUpdate,
  requireObjectId,
} from 'src/common/mongo-query';

@Injectable()
export class WithdrawService {
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
    private readonly involveService: InvolveService,
    private readonly pointService: PointService,
    @InjectConnection() private readonly connection: Connection,
  ) {}
  async getSign(msg: GETSignDTO): Promise<string> {
    // console.log('Generating EIP-712 signature for message:', msg);
    const chainId =
      msg.chain === Number(process.env.CHAIN_ID_WITHDRAW_POLYGON)
        ? Number(process.env.CHAIN_ID_WITHDRAW_POLYGON)
        : msg.chain === Number(process.env.CHAIN_ID_WITHDRAW_BNB)
          ? Number(process.env.CHAIN_ID_WITHDRAW_BNB)
          : msg.chain === Number(process.env.CHAIN_ID_WITHDRAW_SONIC)
            ? Number(process.env.CHAIN_ID_WITHDRAW_SONIC)
            : Number(process.env.CHAIN_ID_WITHDRAW_CELO);

    const contract =
      msg.chain === Number(process.env.CHAIN_ID_WITHDRAW_POLYGON)
        ? process.env.CONTRACT_WITHDRAW_ADDRESS_POLYGON!
        : msg.chain === Number(process.env.CHAIN_ID_WITHDRAW_BNB)
          ? process.env.CONTRACT_WITHDRAW_ADDRESS_BNB!
          : msg.chain === Number(process.env.CHAIN_ID_WITHDRAW_SONIC)
            ? process.env.CONTRACT_WITHDRAW_ADDRESS_SONIC!
            : process.env.CONTRACT_WITHDRAW_ADDRESS_CELO!;
    // console.log(msg.chain, Number(process.env.CHAIN_ID_WITHDRAW_BNB));
    // console.log(msg.chain === Number(process.env.CHAIN_ID_WITHDRAW_BNB));

    // console.log('Using contract address for signing:', contract);
    // console.log('Using chainId address for signing:', chainId);

    const domain = {
      name: 'CashbackLedger',
      version: '1',
      chainId: chainId,
      verifyingContract: contract,
    };

    // ---------- 2) Batch Withdraw ----------
    const types = {
      WithdrawAuthBatch: [
        { name: 'userid', type: 'string' },
        { name: 'userAddress', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'expireAt', type: 'uint64' },
        { name: 'conversionIdsHash', type: 'bytes32' },
      ],
    };

    let rolling = ethers.ZeroHash;
    for (const id of msg.conversionIdHashes) {
      rolling = keccak256(
        solidityPacked(['bytes32', 'uint256'], [rolling, id]),
      );
    }

    const decimal =
      msg.chain === Number(process.env.CHAIN_ID_WITHDRAW_BNB) ? 18 : 6;
    const conversionIdsHash = rolling;
    const value = {
      userid: msg.userid,
      userAddress: msg.userAddress,
      amount: ethers.parseUnits(msg.totalCashbackAmount, decimal).toString(),
      expireAt: BigInt(msg.expireAt),
      conversionIdsHash: conversionIdsHash,
    };

    // console.log('value:', value);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY_WITHDRAW);
    const signature = await wallet.signTypedData(domain, types, value);
    // console.log('EIP-712 Signature:', signature);
    return signature;
  }

  async getConversionIdsWithdrawedByUserId(
    userId: string,
    chainId: number,
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
      const rpc =
        chainId === Number(process.env.CHAIN_ID_WITHDRAW_POLYGON)
          ? process.env.RPC_URL_POLYGON
          : chainId === Number(process.env.CHAIN_ID_WITHDRAW_BNB)
            ? process.env.RPC_URL_BNB
            : chainId === Number(process.env.CHAIN_ID_WITHDRAW_CELO)
              ? process.env.RPC_URL_CELO
              : process.env.RPC_URL_SONIC;
      const contractAddress =
        chainId === Number(process.env.CHAIN_ID_WITHDRAW_POLYGON)
          ? process.env.CONTRACT_WITHDRAW_ADDRESS_POLYGON!
          : chainId === Number(process.env.CHAIN_ID_WITHDRAW_BNB)
            ? process.env.CONTRACT_WITHDRAW_ADDRESS_BNB!
            : chainId === Number(process.env.CHAIN_ID_WITHDRAW_CELO)
              ? process.env.CONTRACT_WITHDRAW_ADDRESS_CELO!
              : process.env.CONTRACT_WITHDRAW_ADDRESS_SONIC!;

      // console.log('Using contract address:', contractAddress);
      // console.log('Using contract address:', rpc);

      const provider = new ethers.JsonRpcProvider(rpc);
      // const provider = new ethers.JsonRpcProvider(process.env.RPC_URL_POLYGON);
      const contract = new ethers.Contract(contractAddress!, abi, provider);
      const conversionIds = await contract.getConversionIdsByUserId(userId);
      const conversionIdsStringArray: string[] = conversionIds.map((id) =>
        Number(id),
      );
      return conversionIdsStringArray;
    } catch (error) {
      console.log('Error getting conversion IDs by user ID:', error);
      return [];
    }
  }
  async checkWithdraw2(id: string) {
    const user = await this.userModel.findOne({
      _id: new Types.ObjectId(id),
    });
    if (!user) {
      throw new UnauthorizedException({ message: 'User not found' });
    }
    const fee = await this.feeRateModel.findOne().exec();
    if (!fee) {
      throw new HttpException({ message: 'Fee rate not found' }, 400);
    }
    // console.log('Checking withdraw for user:', user._id.toString());
    const conversionIdsWithdrawedPolygon =
      await this.getConversionIdsWithdrawedByUserId(
        user._id.toString(),
        Number(process.env.CHAIN_ID_WITHDRAW_POLYGON),
      );

    const conversionIdsWithdrawedBNB =
      await this.getConversionIdsWithdrawedByUserId(
        user._id.toString(),
        Number(process.env.CHAIN_ID_WITHDRAW_BNB),
      );

    const conversionIdsWithdrawedSonic =
      await this.getConversionIdsWithdrawedByUserId(
        user._id.toString(),
        Number(process.env.CHAIN_ID_WITHDRAW_SONIC),
      );

    const conversionIdsWithdrawedCelo =
      await this.getConversionIdsWithdrawedByUserId(
        user._id.toString(),
        Number(process.env.CHAIN_ID_WITHDRAW_CELO),
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
      .find({
        conversion_status: 'approved',
      })
      .lean();
    const withdrawList = await this.withdrawModel
      .find({ user_id: new Types.ObjectId(user._id) })
      .lean();

    const withdrawnConversionIds = withdrawList.flatMap(
      (withdraw) => withdraw.conversion_id,
    );
    // console.log('withdrawnConversionIds', withdrawnConversionIds);

    const approvedList = allConversions.filter(
      (item) =>
        item.aff_sub1?.includes(`user_id:${user._id.toString()}`) &&
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
      throw new HttpException({ message: 'Fee rate not found' }, 400);
    }

    const [allConversions, withdrawList] = await Promise.all([
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
    ]);

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

    const totalPayoutUSD = isNaN(_totalPayoutUSD)
      ? 0
      : _totalPayoutUSD - _sumWithdrawInUSD;
    const totalPayoutTHB = isNaN(_totalPayoutTHB)
      ? 0
      : _totalPayoutTHB - _sumWithdrawInTHB;

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
      throw new HttpException({ message: 'Fee rate not found' }, 400);
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
      throw new HttpException({ message: 'Fee rate not found' }, 400);
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
          $lookup: {
            from: 'offers',
            localField: 'offer_id',
            foreignField: 'offer_id',
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
          // email: user.email,
          email: { $regex: user.email }, // Use $regex for case-insensitive search on user.email
          // $or: [{ email: user.email }, { phoneNumber: user.mobile }, { phoneNumber: mobile }],
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
        return (sum + b.amount) / rateTHBtoUSD;
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
    const rpc =
      chainId === Number(process.env.CHAIN_ID_WITHDRAW_POLYGON)
        ? process.env.RPC_URL_POLYGON
        : chainId === Number(process.env.CHAIN_ID_WITHDRAW_BNB)
          ? process.env.RPC_URL_BNB
          : process.env.RPC_URL_SONIC;
    const contractAddress =
      chainId === Number(process.env.CHAIN_ID_WITHDRAW_POLYGON)
        ? process.env.CONTRACT_WITHDRAW_ADDRESS_POLYGON!
        : chainId === Number(process.env.CHAIN_ID_WITHDRAW_BNB)
          ? process.env.CONTRACT_WITHDRAW_ADDRESS_BNB!
          : process.env.CONTRACT_WITHDRAW_ADDRESS_SONIC!;

    // console.log('Using contract address:', contractAddress);
    // console.log('Using contract address:', rpc);

    const provider = new ethers.JsonRpcProvider(rpc);
    // const provider = new ethers.JsonRpcProvider(process.env.RPC_URL_POLYGON);
    const wallet = new ethers.Wallet(
      process.env.PRIVATE_KEY_WITHDRAW,
      provider,
    );
    const contract = new ethers.Contract(contractAddress!, abi, wallet);
    const receipt = await contract.recordConversionId(userId, conversionIds);
    // console.log('receipt:', receipt);

    return receipt.hash;
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
  ): Promise<void> {
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
  }

  async create(createWithdrawDto: CreateWithdrawDto, id: string) {
    const user = await this.userModel.findOne({
      _id: new Types.ObjectId(id),
    });
    if (!user) {
      throw new UnauthorizedException({ message: 'User not found' });
    }
    // P1-TX + #41: reserve balance in a per-user serialized transaction BEFORE
    // any on-chain call. Two concurrent on-chain withdraw requests contend on
    // withdraw_lock_seq; the loser retries and re-evaluates balance against the
    // now-committed pending record from the winner — closing the TOCTOU where
    // both pass assertWithinBalance then both call createRecordOnChain.
    const dt = await this.runSerializedWithdraw(id, async (session) => {
      await this.assertWithinBalance(
        id,
        createWithdrawDto.amount_net,
        createWithdrawDto.currency,
      );
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
            tx_hash: createWithdrawDto.tx_hash || '',
            tx_hash_record: '',
            percent_fee: createWithdrawDto.percent_fee || 0,
            amount_total: createWithdrawDto.amount_net || 0,
            amount_net: createWithdrawDto.amount_net || 0,
            method: createWithdrawDto.method || '',
            currency: createWithdrawDto.currency || '',
            conversion_id: createWithdrawDto.conversion_ids || [],
            rate: createWithdrawDto?.rate || 0,
            mycashback_id: [],
          },
        ],
        { session },
      );
      return record;
    });

    try {
      const hash_record = await this.createRecordOnChain(
        user._id.toString(),
        createWithdrawDto.chain,
        createWithdrawDto.conversion_ids || [],
      );
      await this.withdrawModel.findByIdAndUpdate(dt._id, {
        $set: { tx_hash_record: hash_record || '' },
      });
    } catch {
      await this.withdrawModel.findByIdAndUpdate(dt._id, {
        $set: {
          status: 'rejected',
          flag_reason: 'on_chain_record_failed',
        },
      });
      throw new HttpException(
        { message: 'Failed to record withdrawal on chain' },
        502,
      );
    }

    const MCBCashback = await this.checkWithdrawMyCashback(id);
    let availableMCB = 0;

    if (createWithdrawDto.currency === 'THB') {
      availableMCB =
        createWithdrawDto.amount_total <= MCBCashback.availableTHB
          ? createWithdrawDto.amount_total
          : MCBCashback && MCBCashback.availableTHB > 0
            ? MCBCashback.availableTHB
            : 0;
    } else {
      availableMCB =
        createWithdrawDto.amount_total <= MCBCashback.availableUSD
          ? createWithdrawDto.amount_total
          : MCBCashback && MCBCashback.availableUSD > 0
            ? MCBCashback.availableUSD
            : 0;
    }
    if (availableMCB > 0) {
      await this.withdrawModel.create({
        user_id: new Types.ObjectId(user._id),
        status: 'pending',
        address: createWithdrawDto.address || '',
        account_name: createWithdrawDto.account_name || '',
        bank_name: createWithdrawDto.bank_name || '',
        account_number: createWithdrawDto.account_number || '',
        tx_hash: createWithdrawDto.tx_hash || '',
        tx_hash_record: '',
        percent_fee: 0,
        amount_total: availableMCB,
        amount_net: availableMCB,
        method: createWithdrawDto.method || '',
        currency: createWithdrawDto.currency || '',
        rate: createWithdrawDto?.rate || 0,
        conversion_id: [],
        mycashback_id: createWithdrawDto.mycashback_id
          ? createWithdrawDto.mycashback_id.map((id) => new Types.ObjectId(id))
          : undefined,
      });
    }
    return { message: 'Withdraw request created', data: dt, status: 'success' };
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

    // Hard balance gate: USDT and USDC are both $1-pegged, so compare the
    // request to the user's available USD payout. `checkWithdraw` already
    // reconciles against pending+approved withdrawals so we don't
    // double-count outstanding requests.
    const balance = await this.checkWithdraw(userId);
    const availableUsd = Number(balance?.netAmount ?? 0);
    if (!Number.isFinite(availableUsd) || dto.amount > availableUsd + 1e-6) {
      throw new HttpException(
        {
          message: `Requested amount exceeds available balance (${availableUsd.toFixed(2)} USD)`,
        },
        400,
      );
    }

    try {
      const record = await this.withdrawModel.create({
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
      });
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
    adminId: string,
  ) {
    if (!Types.ObjectId.isValid(withdrawId)) {
      throw new HttpException({ message: 'Invalid withdraw id' }, 400);
    }
    const existing = await this.withdrawModel.findById(withdrawId);
    if (!existing) {
      throw new HttpException({ message: 'Withdraw not found' }, 404);
    }
    if (existing.withdraw_mode !== 'manual') {
      throw new HttpException(
        { message: 'Only manual withdrawals can be marked paid' },
        400,
      );
    }
    // Idempotent on already-paid; hard block on any other terminal state so a
    // rejected/approved row cannot be silently flipped back to paid.
    if (existing.status === 'paid') {
      return { success: true, data: existing };
    }
    if (existing.status !== 'pending') {
      throw new HttpException(
        {
          message: `Only pending withdrawals can be marked paid (current: ${existing.status})`,
        },
        409,
      );
    }
    try {
      const updated = await this.withdrawModel.findByIdAndUpdate(
        withdrawId,
        {
          $set: {
            status: 'paid',
            tx_hash: dto.tx_hash,
            paid_by: adminId,
            paid_at: new Date(),
          },
        },
        { new: true },
      );
      return { success: true, data: updated };
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
  }

  /**
   * Admin action (V-2b): approve a pending withdrawal — e.g. confirm the
   * on-chain withdrawal tx actually settled. Replaces the old client-tx_hash ->
   * 'approved' self-promotion. Idempotent on already-approved; refuses any other
   * terminal state so a paid/rejected row cannot be flipped back to approved.
   */
  async approveWithdrawRequest(withdrawId: string, adminId: string) {
    if (!isValidObjectId(withdrawId)) {
      throw new HttpException({ message: 'Invalid withdraw id' }, 400);
    }
    const existing = await this.withdrawModel.findById(withdrawId);
    if (!existing) {
      throw new HttpException({ message: 'Withdraw not found' }, 404);
    }
    if (existing.status === 'approved') {
      return { success: true, data: existing };
    }
    if (existing.status !== 'pending') {
      throw new HttpException(
        {
          message: `Only pending withdrawals can be approved (current: ${existing.status})`,
        },
        409,
      );
    }
    const updated = await this.withdrawModel.findByIdAndUpdate(
      withdrawId,
      {
        $set: {
          status: 'approved',
          approved_by: adminId,
          approved_at: new Date(),
        },
      },
      { new: true },
    );
    return { success: true, data: updated };
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
    work: (session: ClientSession) => Promise<T>,
  ): Promise<T> {
    const session = await this.connection.startSession();
    try {
      let result: T | undefined;
      await session.withTransaction(async () => {
        result = await work(session);
        const user = await this.userModel.findOneAndUpdate(
          { _id: new Types.ObjectId(userId) },
          { $inc: { withdraw_lock_seq: 1 } },
          { session },
        );
        if (!user) {
          throw new UnauthorizedException({ message: 'User not found' });
        }
      });
      return result as T;
    } finally {
      await session.endSession();
    }
  }

  async createBankTransfer(createWithdrawDto: CreateWithdrawDto, id: string) {
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
    const fee = await this.feeRateModel.findOne().exec();
    if (!fee) {
      throw new HttpException({ message: 'Fee rate not found' }, 400);
    }
    const feeRateMinimum =
      createWithdrawDto.currency === 'THB'
        ? fee.minimum_withdraw_thb
        : fee.minimum_withdraw_usd;
    if (createWithdrawDto.amount_net < feeRateMinimum) {
      throw new HttpException(
        {
          message: `Minimum withdrawal amount for bank transfer is ${feeRateMinimum}.`,
        },
        400,
      );
    }
    // V-2 + P1-TX: gate the balance AND persist the record inside a per-user
    // serialized transaction, so two concurrent bank-transfer requests can't
    // both pass the balance check and double-withdraw.
    const dt = await this.runSerializedWithdraw(id, async (session) => {
      await this.assertWithinBalance(
        id,
        createWithdrawDto.amount_net,
        createWithdrawDto.currency,
      );
      const [record] = await this.withdrawModel.create(
        [
          {
            user_id: new Types.ObjectId(user._id),
            status: 'pending',
            address: '',
            account_name: createWithdrawDto.account_name || '',
            bank_name: createWithdrawDto.bank_name || '',
            account_number: createWithdrawDto.account_number || '',
            tx_hash: '',
            tx_hash_record: '',
            percent_fee: createWithdrawDto.percent_fee || 0,
            amount_total: createWithdrawDto.amount_total || 0,
            amount_net: createWithdrawDto.amount_net || 0,
            method: 'bank_transfer',
            currency: createWithdrawDto.currency || '',
            conversion_id: createWithdrawDto.conversion_ids || [],
            mycashback_id: [],
          },
        ],
        { session },
      );
      return record;
    });

    const MCBCashback = await this.checkWithdrawMyCashback(id);
    let availableMCB = 0;

    if (createWithdrawDto.currency === 'THB') {
      availableMCB =
        createWithdrawDto.amount_total <= MCBCashback.availableTHB
          ? createWithdrawDto.amount_total
          : MCBCashback && MCBCashback.availableTHB > 0
            ? MCBCashback.availableTHB
            : 0;
    } else {
      availableMCB =
        createWithdrawDto.amount_total <= MCBCashback.availableUSD
          ? createWithdrawDto.amount_total
          : MCBCashback && MCBCashback.availableUSD > 0
            ? MCBCashback.availableUSD
            : 0;
    }
    if (availableMCB > 0) {
      await this.withdrawModel.create({
        user_id: new Types.ObjectId(user._id),
        status: 'pending',
        address: createWithdrawDto.address || '',
        account_name: createWithdrawDto.account_name || '',
        bank_name: createWithdrawDto.bank_name || '',
        account_number: createWithdrawDto.account_number || '',
        tx_hash: createWithdrawDto.tx_hash || '',
        tx_hash_record: '',
        percent_fee: 0,
        amount_total: availableMCB,
        amount_net: availableMCB,
        method: createWithdrawDto.method || '',
        currency: createWithdrawDto.currency || '',
        conversion_id: [],
        mycashback_id: createWithdrawDto.mycashback_id
          ? createWithdrawDto.mycashback_id.map((id) => new Types.ObjectId(id))
          : undefined,
      });
    }
    return { message: 'Withdraw request created', data: dt, status: 'success' };
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
    const user = await this.userModel.findOne({
      _id: new Types.ObjectId(id),
    });
    if (!user) {
      throw new UnauthorizedException({ message: 'User not found' });
    }
    const checkDup = await this.withdrawMethodModel.findOne({
      // account_no is number on the DTO but string on the schema; normalise to
      // string (mongoose already cast number→string, so this matches stored rows).
      account_no: String(createWithdrawMethod.account_no),
      user_id: new Types.ObjectId(user._id),
    });
    if (checkDup) {
      throw new HttpException(
        { message: 'Account number already exists' },
        400,
      );
    }
    createWithdrawMethod['user_id'] = new Types.ObjectId(user._id);
    const dt = await this.withdrawMethodModel.create({
      ...createWithdrawMethod,
      account_no: String(createWithdrawMethod.account_no),
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

  async adminAddRewardConversionForQuest() {
    const questDate = await this.questModel.findOne({
      status: 'close',
      reward_status: { $ne: true },
    });

    if (!questDate) {
      // throw new HttpException({ message: 'Quest date not found' }, 400);
      console.log('Quest date not found for adminAddRewardConversionForQuest');
      return;
    }
    const userReceivedReward = await this.pointService.getQuestRankListOfPoint(
      new Date(questDate.start_date).toLocaleDateString('en-CA'),
      new Date(questDate.end_date).toLocaleDateString('en-CA'),
    );

    const questRewards = [...((questDate as any).rewards ?? [])]
      .filter((item) => Number(item?.rank) >= 1)
      .sort((a, b) => Number(a.rank) - Number(b.rank));
    const rewardList =
      questRewards.length > 0
        ? { name: 'quest', data: questRewards }
        : await this.rewardListModel.findOne({ name: 'quest' });

    if (!rewardList) {
      throw new HttpException({ message: 'Reward list not found' }, 400);
    }

    const list = [];
    const rewardsByRank = new Map(
      (rewardList?.data ?? []).map((item) => [Number(item.rank), item]),
    );
    for (let i = 0; i < userReceivedReward.length; i++) {
      if (userReceivedReward[i]?.point <= 0) {
        continue; // Skip users with 0 or negative points
      }
      const rank = i + 1;
      const rankReward =
        rewardsByRank.get(rank) ?? rewardList?.data?.[i] ?? null;
      if (!rankReward || Number(rankReward.reward) <= 0) continue;
      const user = userReceivedReward[i];
      const data = {
        conversion_id: new Date().getTime() + i, // Use timestamp as unique ID for simplicity
        offer_id: 0,
        offer_name: 'reward_conversion_quest',
        merchant_id: 0,
        aff_sub2: user?.email || '',
        aff_sub3: user?.username || '',
        aff_sub4: '',
        aff_sub5: '',
        adv_sub1: `${questDate.start_date.toLocaleDateString('en-CA')} - ${questDate.end_date.toLocaleDateString('en-CA')}`, // "Reward Quest 2024-01-01 - 2024-01-31"
        adv_sub2: `Reward Quest ${questDate.start_date.toLocaleDateString('en-CA')} - ${questDate.end_date.toLocaleDateString('en-CA')}`,
        adv_sub3: questDate?._id.toString() || '', // quest ID
        adv_sub4: user?.point || 0,
        adv_sub5: '',
        conversion_status: 'approved',
        datetime_conversion: new Date(),
        affiliate_remarks: '',
        base_payout: 0,
        bonus_payout: 0,
        // change data
        aff_sub1: `user_id:${user.user_id}`, // "user_id:68bf99fed9667685c1637607"
        // P1-COLLSCAN: persist the indexed user_id alongside the legacy aff_sub1.
        ...(isValidObjectId(user.user_id)
          ? { user_id: new Types.ObjectId(user.user_id) }
          : {}),
        currency: rankReward?.currency || 'THB',
        payout: Number(rankReward?.reward) || 0,
        sale_amount: 0,
      };
      const payoutData = Number(rankReward?.reward) || 0;

      data.payout = payoutData;

      // console.log('data', data);
      await this.conversionModel.create(data);
      list.push(data);
    }
    await this.questModel
      .findByIdAndUpdate(questDate._id, { reward_status: true })
      .exec();
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
    };

    return await this.conversionModel.create(data);
  }
}
