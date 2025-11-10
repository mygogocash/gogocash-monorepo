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
import { UpdateWithdrawDto } from './dto/update-withdraw.dto';
import { ethers, keccak256, solidityPacked } from 'ethers';
import { InjectModel } from '@nestjs/mongoose';
import { User } from 'src/user/schemas/user.schema';
import { Model, Types } from 'mongoose';
import { InvolveService } from 'src/involve/involve.service';
import { Withdraw } from './schemas/withdraw.schema';
import { FeeRate } from './schemas/feeRate.schema';
import { Offer } from 'src/offer/schemas/offer.schema';

@Injectable()
export class WithdrawService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Withdraw.name) private withdrawModel: Model<Withdraw>,
    @InjectModel(FeeRate.name) private feeRateModel: Model<FeeRate>,
    @InjectModel(Offer.name) private offerModel: Model<Offer>,
    private readonly involveService: InvolveService,
  ) {}
  async getSign(msg: GETSignDTO): Promise<string> {
    // console.log('Generating EIP-712 signature for message:', msg);
    const chainId =
      msg.chain === Number(process.env.CHAIN_ID_WITHDRAW_POLYGON)
        ? Number(process.env.CHAIN_ID_WITHDRAW_POLYGON)
        : msg.chain === Number(process.env.CHAIN_ID_WITHDRAW_BNB)
          ? Number(process.env.CHAIN_ID_WITHDRAW_BNB)
          : Number(process.env.CHAIN_ID_WITHDRAW_SONIC);

    const contract =
      msg.chain === Number(process.env.CHAIN_ID_WITHDRAW_POLYGON)
        ? process.env.CONTRACT_WITHDRAW_ADDRESS_POLYGON!
        : msg.chain === Number(process.env.CHAIN_ID_WITHDRAW_BNB)
          ? process.env.CONTRACT_WITHDRAW_ADDRESS_BNB!
          : process.env.CONTRACT_WITHDRAW_ADDRESS_SONIC!;
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
          : process.env.RPC_URL_BNB;
    const contractAddress =
      chainId === Number(process.env.CHAIN_ID_WITHDRAW_POLYGON)
        ? process.env.CONTRACT_WITHDRAW_ADDRESS_POLYGON!
        : chainId === Number(process.env.CHAIN_ID_WITHDRAW_BNB)
          ? process.env.CONTRACT_WITHDRAW_ADDRESS_BNB!
          : process.env.CONTRACT_WITHDRAW_ADDRESS_BNB!;

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
    // const conversionIdsWithdrawedSonic =
    //   await this.getConversionIdsWithdrawedByUserId(
    //     user._id.toString(),
    //     Number(process.env.CHAIN_ID_WITHDRAW_SONIC),
    //   );
    // console.log('conversionIdsWithdrawed:', conversionIdsWithdrawed);
    const conversionIdsWithdrawed = [
      ...conversionIdsWithdrawedPolygon,
      ...conversionIdsWithdrawedBNB,
      // ...conversionIdsWithdrawedSonic,
    ];
    // console.log('conversionIdsWithdrawed total:', conversionIdsWithdrawed);
    const conversions = await this.involveService.getConversionAll({
      page: '1',
      limit: '10',
    });

    let allConversions = conversions.data.data;
    let currentPage = 1;

    while (conversions.data.nextPage) {
      currentPage++;
      const nextConversions = await this.involveService.getConversionAll({
        page: currentPage.toString(),
        limit: '10',
      });
      allConversions = allConversions.concat(nextConversions.data.data);
      conversions.data.nextPage = nextConversions.data.nextPage;
    }

    const withdrawList = await this.withdrawModel
      .find({ user_id: new Types.ObjectId(user._id) })
      .lean();

    const withdrawnConversionIds = withdrawList.flatMap(
      (withdraw) => withdraw.conversion_id,
    );
    // console.log('withdrawnConversionIds', withdrawnConversionIds);

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
      data: approvedList,
      fee,
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
  async create(createWithdrawDto: CreateWithdrawDto, id_crossmint: string) {
    // console.log(createWithdrawDto);
    const user = await this.userModel.findOne({
      id_crossmint,
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
      amount_total: createWithdrawDto.amount_total || 0,
      amount_net: createWithdrawDto.amount_net || 0,
      method: createWithdrawDto.method || '',
      currency: createWithdrawDto.currency || '',
      conversion_id: createWithdrawDto.conversion_ids || [],
    });
    return { message: 'Withdraw request created', data: dt, status: 'success' };
  }

  async createBankTransfer(
    createWithdrawDto: CreateWithdrawDto,
    id_crossmint: string,
  ) {
    // console.log(createWithdrawDto);
    const user = await this.userModel.findOne({
      id_crossmint,
    });
    if (!user) {
      throw new UnauthorizedException({ message: 'User not found' });
    }
    const conversionIdsWithdrawed = await this.withdrawModel
      .find({
        user_id: new Types.ObjectId(user._id),
        conversion_id: createWithdrawDto.conversion_ids,
      })
      .lean();
    if (conversionIdsWithdrawed.length > 0) {
      throw new HttpException(
        {
          message: `Some conversion IDs have already been withdrawn.`,
        },
        400,
      );
    }
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
    });
    return { message: 'Withdraw request created', data: dt, status: 'success' };
  }

  async findAll(params: GetWithdrawTransactionsDTO, id_crossmint: string) {
    const user = await this.userModel.findOne({ id_crossmint });
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
    return {
      data,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      totalAmount,
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
}
