/* eslint-disable prettier/prettier */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto, UpdateCountryDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { Model, Types } from 'mongoose';
import { UserMyCashback } from './schemas/user-my-cashback.schema';
import { toIso2Server } from 'src/utils/country';

/**
 * Coerce any `country` field on an arbitrary DTO to canonical ISO-2 in place
 * (returns a new object — never mutates the input). Defence-in-depth: even if
 * a caller forgets to canonicalise upstream, persisted documents stay clean.
 */
function withCanonicalCountry<T extends { country?: string | null }>(dto: T): T {
  if (dto?.country === undefined) return dto;
  return { ...dto, country: toIso2Server(dto.country) };
}

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(UserMyCashback.name)
    private userMyCashbacksModel: Model<UserMyCashback>,
  ) {}

  async createFromCrossmint(createUserDto: CreateUserDto) {
    // Find or create the user in the database
    const user = await this.userModel.findOneAndUpdate(
      { id_crossmint: createUserDto.id_crossmint },
      withCanonicalCountry(createUserDto),
      { upsert: true, new: true },
    );

    return user;
  }
  async createFromFirebase(createUserDto: CreateUserDto) {
    // Find or create the user in the database
    const user = await this.userModel.findOneAndUpdate(
      { id_firebase: createUserDto.id_firebase },
      withCanonicalCountry(createUserDto),
      { upsert: true, new: true },
    );

    return user;
  }

  async findAll(page: number = 1, limit: number = 10, search?: string) {
    const skip = (page - 1) * limit;

    const query = search
      ? {
          $or: [
            { username: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { address: { $regex: search, $options: 'i' } },
            { mobile: { $regex: search, $options: 'i' } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.userModel.find(query).skip(skip).limit(limit).exec(),
      this.userModel.countDocuments(query).exec(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  findOne(data: { [key: string]: string | Types.ObjectId }) {
    return this.userModel.findOne(data);
  }
  async update(id: Types.ObjectId, updateUserDto: UpdateUserDto) {
    // delete updateUserDto.mobile; // prevent updating mobile directly;
    return this.userModel.findByIdAndUpdate(
      id,
      withCanonicalCountry(updateUserDto),
      { new: true },
    );
  }

  updateCountry(updateCountryDto: UpdateCountryDto, id: string) {
    return this.userModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id) },
      { country: toIso2Server(updateCountryDto.country) },
      { new: true },
    );
  }

  async getBalanceMyCashback(userId: string) {
    const user = await this.userModel.findOne({
      _id: new Types.ObjectId(userId),
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    if (!user.email || !user?.mobile) {
      throw new Error('User email or mobile not found');
    }
    // let userMyCashback: UserMyCashback[] = null;
    // if (user?.mobile) {
    //   userMyCashback = await this.userMyCashbacksModel
    //     .find({
    //       phoneNumber: user.mobile,
    //     })
    //     .lean();
    // }
    // if (userMyCashback?.length < 1) {
    //   if (user?.email) {
    //     userMyCashback = await this.userMyCashbacksModel
    //       .find({
    //         email: user.email,
    //       })
    //       .lean();
    //   }
    // }
    // const mobileData = user?.mobile?.includes('+66')
    //   ? user?.mobile?.slice(3)
    //   : user?.mobile;
    // const mobile = '0' + mobileData;
    // if (userMyCashback?.length < 1) {
    //   userMyCashback = await this.userMyCashbacksModel
    //     .find({
    //       phoneNumber: mobile,
    //     })
    //     .lean();
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
      myCashbackDataList = await this.userMyCashbacksModel
        .find({
          $or: [{ phoneNumber: user.mobile }, { phoneNumber: mobile }],
        })
        .lean();
    }

    if (myCashbackDataList?.length < 1) {
      myCashbackDataList = await this.userMyCashbacksModel
        .find({
            email: { $regex: user.email }, 
          // email: { $regex: user.email, $options: 'i' }, // Use $regex for case-insensitive search on user.email
          // $or: [{ email: user.email }, { phoneNumber: user.mobile }, { phoneNumber: mobile }],
        })
        .lean();
    }
    

    if (
      myCashbackDataList[0]?.email === user.email ||
      myCashbackDataList[0]?.phoneNumber === user.mobile ||
      myCashbackDataList[0]?.phoneNumber === mobile
    ) {
      // const balanceByCurrency = userMyCashback?.reduce((acc, cashback) => {
      //   cashback.balance?.forEach((balance) => {
      //     const currency = balance.currency || 'THB'; // Default to THB if no currency specified
      //     acc[currency] = {
      //       ...balance,
      //       amount: (acc[currency]?.amount || 0) + (balance.amount || 0),
      //     };
      //   });
      //   return acc;
      // }, {});
      // console.log('balanceByCurrency', balanceByCurrency);

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
      return { userMyCashback: myCashbackDataList, sumBalance: myCashbackDataGroupCurrency, user };
    }
    return { userMyCashback: null, user };
  }
}
