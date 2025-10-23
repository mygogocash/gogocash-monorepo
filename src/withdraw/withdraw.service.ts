import {
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateWithdrawDto, GETSignDTO } from './dto/create-withdraw.dto';
import { UpdateWithdrawDto } from './dto/update-withdraw.dto';
import { ethers, keccak256, toUtf8Bytes } from 'ethers';
import { InjectModel } from '@nestjs/mongoose';
import { User } from 'src/user/schemas/user.schema';
import { Model, Types } from 'mongoose';
import { InvolveService } from 'src/involve/involve.service';
import { Withdraw } from './schemas/withdraw.schema';
import { FeeRate } from './schemas/feeRate.schema';

@Injectable()
export class WithdrawService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Withdraw.name) private withdrawModel: Model<Withdraw>,
    @InjectModel(FeeRate.name) private feeRateModel: Model<FeeRate>,
    private readonly involveService: InvolveService,
  ) {}
  async getSign(msg: GETSignDTO): Promise<string> {
    const domain = {
      name: 'CashbackLedger',
      version: '1',
      chainId: Number(process.env.CHAIN_ID_WITHDRAW)!,
      verifyingContract: process.env.CONTRACT_WITHDRAW_ADDRESS!,
    };

    const types = {
      WithdrawCashbackMessage: [
        { name: 'userid', type: 'string' },
        { name: 'userAddress', type: 'address' },
        { name: 'totalCashbackAmount', type: 'uint256' },
        { name: 'conversionIdHashes', type: 'bytes32[]' },
        { name: 'expireAt', type: 'uint64' },
      ],
    };

    const conversionIdHashes: `0x${string}`[] = msg.conversionIdHashes.map(
      (id) => keccak256(toUtf8Bytes(id)) as `0x${string}`,
    );
    const value = {
      userid: msg.userid,
      userAddress: msg.userAddress,
      totalCashbackAmount: ethers
        .parseUnits(msg.totalCashbackAmount, 6)
        .toString(),
      conversionIdHashes: conversionIdHashes,
      expireAt: BigInt(msg.expireAt),
    };

    // console.log('value:', value);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY_WITHDRAW);
    const signature = await wallet.signTypedData(domain, types, value);
    // console.log('EIP-712 Signature:', signature);
    return signature;
  }

  async getConversionIdsWithdrawedByUserId(userId: string): Promise<string[]> {
    const abi = [
      {
        inputs: [{ internalType: 'string', name: 'userid', type: 'string' }],
        name: 'getConversionIdStringsByUserId',
        outputs: [{ internalType: 'string[]', name: '', type: 'string[]' }],
        stateMutability: 'view',
        type: 'function',
      },
    ];
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const contract = new ethers.Contract(
      process.env.CONTRACT_WITHDRAW_ADDRESS!,
      abi,
      provider,
    );
    const conversionIds = await contract.getConversionIdStringsByUserId(userId);
    const conversionIdsStringArray: string[] = conversionIds.map((id) =>
      Number(id),
    );
    return conversionIdsStringArray;
  }
  async checkWithdraw(id_crossmint: string) {
    const user = await this.userModel.findOne({
      id_crossmint,
    });
    if (!user) {
      throw new UnauthorizedException({ message: 'User not found' });
    }
    const fee = await this.feeRateModel.findOne().exec();
    if (!fee) {
      throw new HttpException({ message: 'Fee rate not found' }, 400);
    }
    const conversionIdsWithdrawed =
      await this.getConversionIdsWithdrawedByUserId(user._id.toString());
    // console.log('conversionIdsWithdrawed:', conversionIdsWithdrawed);

    const conversions = await this.involveService.getConversionAll(
      { page: '1', limit: '10' },
      user._id.toString(),
    );

    let allConversions = conversions.data.data;
    let currentPage = 1;

    while (conversions.data.nextPage) {
      currentPage++;
      const nextConversions = await this.involveService.getConversionAll(
        { page: currentPage.toString(), limit: '10' },
        user._id.toString(),
      );
      allConversions = allConversions.concat(nextConversions.data.data);
      conversions.data.nextPage = nextConversions.data.nextPage;
    }

    const withdrawList = await this.withdrawModel
      .find({ user_id: new Types.ObjectId(user._id) })
      .lean();

    const withdrawnConversionIds = withdrawList.flatMap(
      (withdraw) => withdraw.conversion_id,
    );

    const approvedList = allConversions.filter(
      (item) =>
        item.conversion_status === 'approved' &&
        item.aff_sub1?.includes(`user_id:${user._id.toString()}`) &&
        !withdrawnConversionIds.includes(item.conversion_id) &&
        !conversionIdsWithdrawed.includes(item.conversion_id),
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
        const usdAmount = await this.convertToUSD(currency, amount);
        // const usdAmount = amount; // Placeholder - implement actual conversion
        return {
          currency,
          amount,
          usdAmount: usdAmount.usdAmount,
          exchangeRate: usdAmount.exchangeRate,
        };
      }),
    );

    const totalUSDAmount = totalPayoutInUSD.reduce(
      (sum, item) => sum + (item.usdAmount || 0),
      0,
    );
    // Calculate total amount after fee deduction
    const feePercentage = fee.system + fee.store; // Using system fee rate
    const feeAmount = (totalUSDAmount * feePercentage) / 100;
    const netAmount = totalUSDAmount - feeAmount;

    // Check if net amount meets minimum withdrawal threshold
    const minimumWithdrawal = fee.minimum_withdraw; // You can make this configurable
    if (netAmount < minimumWithdrawal) {
      throw new HttpException(
        {
          message: `Minimum withdrawal amount is $${minimumWithdrawal}. Current net amount: $${netAmount.toFixed(2)}`,
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
      data: approvedList,
    };
  }

  async convertToUSD(
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

  async createFeeRate() {
    return await this.feeRateModel.create({
      system: 5,
      store: 5,
    });
  }
  async create(createWithdrawDto: CreateWithdrawDto, id_crossmint: string) {
    // console.log(createWithdrawDto);
    const user = await this.userModel.findOne({
      id_crossmint,
    });
    if (!user) {
      throw new UnauthorizedException({ message: 'User not found' });
    }
    const dt = await this.withdrawModel.create({
      user_id: new Types.ObjectId(user._id),
      status: createWithdrawDto.tx_hash ? 'approved' : 'pending',
      address: createWithdrawDto.address || '',
      account_name: createWithdrawDto.account_name || '',
      bank_name: createWithdrawDto.bank_name || '',
      account_number: createWithdrawDto.account_number || '',
      tx_hash: createWithdrawDto.tx_hash || '',
      percent_fee: createWithdrawDto.percent_fee || 0,
      amount_total: createWithdrawDto.amount_total || 0,
      amount_net: createWithdrawDto.amount_net || 0,
      method: createWithdrawDto.method || '',
      currency: createWithdrawDto.currency || '',
      conversion_id: createWithdrawDto.conversion_ids || [],
    });
    return { message: 'Withdraw request created', data: dt, status: 'success' };
  }

  findAll() {
    return `This action returns all withdraw`;
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
}
