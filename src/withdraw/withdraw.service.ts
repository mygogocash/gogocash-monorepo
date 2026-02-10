/* eslint-disable prettier/prettier */
import {
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  CreateWithdrawDto,
  GETSignDTO,
  GetWithdrawTransactionsDTO,
} from './dto/create-withdraw.dto';
import {
  CreateWithdrawMethod,
  UpdateWithdrawDto,
} from './dto/update-withdraw.dto';
import { ethers, keccak256, solidityPacked } from 'ethers';
import { InjectModel } from '@nestjs/mongoose';
import { User } from 'src/user/schemas/user.schema';
import { Model, Types } from 'mongoose';
import { InvolveService } from 'src/involve/involve.service';
import { Withdraw } from './schemas/withdraw.schema';
import { FeeRate } from './schemas/feeRate.schema';
import { Offer } from 'src/offer/schemas/offer.schema';
import { WithdrawMethod } from './schemas/withdrawMethod.schema';
import { rateCurrencyUSD, thaiBanks } from 'src/utils/helper';
import { UserMyCashback } from 'src/user/schemas/user-my-cashback.schema';
import { Conversion } from './schemas/conversion.schema';

@Injectable()
export class WithdrawService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Withdraw.name) private withdrawModel: Model<Withdraw>,
    @InjectModel(FeeRate.name) private feeRateModel: Model<FeeRate>,
    @InjectModel(Offer.name) private offerModel: Model<Offer>,
    @InjectModel(Conversion.name) private conversionModel: Model<Conversion>,
    @InjectModel(WithdrawMethod.name)
    private withdrawMethodModel: Model<WithdrawMethod>,
    @InjectModel(UserMyCashback.name)
    private userMyCashbackModel: Model<UserMyCashback>,
    private readonly involveService: InvolveService,
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

    const allConversions = await this.conversionModel
      .find({
        conversion_status: 'approved',
        aff_sub1: { $regex: `user_id:${user._id.toString()}` },
      })
      .lean();

    const payoutConversionGroupCurrency = allConversions.reduce(
      (acc, item) => {
        const currency = item.currency || 'USD';
        if (!acc[currency]) {
          acc[currency] = 0;
        }
        const feePercentage = fee.system;
        const feeAmount = (Number(item.payout || 0) * feePercentage) / 100;
        acc[currency] += Number(item.payout || 0) - feeAmount;
        return acc;
      },
      {} as Record<string, number>,
    );

    // get withdrawn ---------------------

    const withdrawList = await this.withdrawModel
      .find({
        user_id: new Types.ObjectId(user._id),
        mycashback_id: [],
        // status: { $in: ['pending', 'approved', 'rejected'] },
      })
      .lean();
    console.log('user._id', user._id);

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

    const MCBCashback = await this.checkWithdrawMyCashback(id);

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
      .find({
        aff_sub1: { $regex: `user_id:${user._id.toString()}` },
      })
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
        const payout = Number(item.payout || 0);
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
            const feeAmount = Number(item.payout || 0) * (fee.system / 100);
            const payout = Number(item.payout || 0) - feeAmount;

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
    const withdrawSumByCurrencyApproved = withdrawList?.filter((item) => item.status === 'approved').reduce(
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
     const withdrawSumByCurrencyPending = withdrawList.filter((item) => item.status === 'pending').reduce(
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
      }
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
      .find({
        conversion_status: 'approved',
        aff_sub1: { $regex: `user_id:${id}` },
      })
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
  async checkWithdrawMyCashback(id: string) {
    const user = await this.userModel.findOne({
      _id: new Types.ObjectId(id),
    });

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
console.log('user.email', user.email);

    if (myCashbackDataList?.length < 1) {
      myCashbackDataList = await this.userMyCashbackModel
        .find({
          // email: user.email,
          email: { $regex: user.email }, // Use $regex for case-insensitive search on user.email
          // $or: [{ email: user.email }, { phoneNumber: user.mobile }, { phoneNumber: mobile }],
        })
        .lean();
    }
    console.log('2myCashbackDataList', myCashbackDataList);

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
      {},
    );

    const myCashbackData = Object.values(myCashbackDataGroupCurrency)?.map(
      ({ amount, currency }) => ({ amount, currency }),
    );

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
        status: { $in: ['approved', 'pending'] },
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

  async convertCurrencyUsd(
    currency: string,
    amount: number,
  ): Promise<{ usdAmount: number | null; exchangeRate: number | null }> {
    if (currency === 'USD') {
      return { usdAmount: amount, exchangeRate: 1 };
    }

    try {
      // Using a free currency conversion API (you can replace with your preferred service)
      const response = await fetch(
        `https://api.exchangerate-api.com/v4/latest/${currency}`,
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch exchange rate for ${currency}`);
      }

      const data = await response.json();
      const exchangeRate = data.rates.USD;

      if (!exchangeRate) {
        throw new Error(`USD exchange rate not found for ${currency}`);
      }

      return { usdAmount: amount * exchangeRate, exchangeRate }; // Return the converted amount * exchangeRate;
    } catch (error) {
      console.error(`Error converting ${currency} to USD:`, error);
      // Return original amount as fallback
      return { usdAmount: null, exchangeRate: null };
    }
  }

  async convertCurrencyThb(
    currency: string,
    amount: number,
  ): Promise<{ amount: number | null; exchangeRate: number | null }> {
    if (currency === 'THB') {
      return { amount: amount, exchangeRate: 1 };
    }

    try {
      // Using a free currency conversion API (you can replace with your preferred service)
      const response = await fetch(
        `https://api.exchangerate-api.com/v4/latest/${currency}`,
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch exchange rate for ${currency}`);
      }

      const data = await response.json();
      const exchangeRate = data.rates.THB;

      if (!exchangeRate) {
        throw new Error(`THB exchange rate not found for ${currency}`);
      }

      return { amount: amount * exchangeRate, exchangeRate }; // Return the converted amount * exchangeRate;
    } catch (error) {
      console.error(`Error converting ${currency} to THB:`, error);
      // Return original amount as fallback
      return { amount: null, exchangeRate: null };
    }
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
  async create(createWithdrawDto: CreateWithdrawDto, id: string) {
    const user = await this.userModel.findOne({
      _id: new Types.ObjectId(id),
    });
    if (!user) {
      throw new UnauthorizedException({ message: 'User not found' });
    }
    //TODO create record shop on contract
    const hash_record = await this.createRecordOnChain(
      user._id.toString(),
      createWithdrawDto.chain,
      createWithdrawDto.conversion_ids || [],
    );
    const dt = await this.withdrawModel.create({
      user_id: new Types.ObjectId(user._id),
      status: createWithdrawDto.tx_hash ? 'approved' : 'pending',
      address: createWithdrawDto.address || '',
      account_name: createWithdrawDto.account_name || '',
      bank_name: createWithdrawDto.bank_name || '',
      account_number: createWithdrawDto.account_number || '',
      tx_hash: createWithdrawDto.tx_hash || '',
      tx_hash_record: hash_record || '',
      percent_fee: createWithdrawDto.percent_fee || 0,
      amount_total: createWithdrawDto.amount_net || 0,
      amount_net: createWithdrawDto.amount_net || 0,
      method: createWithdrawDto.method || '',
      currency: createWithdrawDto.currency || '',
      conversion_id: createWithdrawDto.conversion_ids || [],
      rate: createWithdrawDto?.rate || 0,
      mycashback_id: [],
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
        rate: createWithdrawDto?.rate || 0,
        conversion_id: [],
        mycashback_id: createWithdrawDto.mycashback_id
          ? createWithdrawDto.mycashback_id.map((id) => new Types.ObjectId(id))
          : undefined,
      });
    }
    return { message: 'Withdraw request created', data: dt, status: 'success' };
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
    // if (conversionIdsWithdrawed.length > 0) {
    //   throw new HttpException(
    //     {
    //       message: `Some conversion IDs have already been withdrawn.`,
    //     },
    //     400,
    //   );
    // }
    const dt = await this.withdrawModel.create({
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
    console.log(updateWithdrawDto, id);
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
      account_no: createWithdrawMethod.account_no,
      user_id: new Types.ObjectId(user._id),
    });
    if (checkDup) {
      throw new HttpException(
        { message: 'Account number already exists' },
        400,
      );
    }
    createWithdrawMethod['user_id'] = new Types.ObjectId(user._id);
    const dt = await this.withdrawMethodModel.create(createWithdrawMethod);
    return {
      message: 'Withdraw method created',
      data: dt,
      status: 'success',
    };
  }

  getBankList() {
    return thaiBanks;
  }

  getMethodId(id: string) {
    return this.withdrawMethodModel.findById(id);
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

  deleteMethodData(id: string) {
    return this.withdrawMethodModel.findByIdAndDelete(id);
  }

  updateMethodData(id: string, updateData: Partial<CreateWithdrawMethod>) {
    return this.withdrawMethodModel.findByIdAndUpdate(id, updateData, {
      new: true,
    });
  }
}
