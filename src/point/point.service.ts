import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CreatePointDto } from './dto/create-point.dto';
import { UpdatePointDto } from './dto/update-point.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from 'src/user/schemas/user.schema';
import { Model, Types } from 'mongoose';
import { Point } from './schemas/point.schema';
import { Conversion } from 'src/withdraw/schemas/conversion.schema';
import { convertToTHB } from 'src/utils/helper';
import { GroupedConversion } from './interface/point.interface';

@Injectable()
export class PointService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Point.name) private pointModel: Model<Point>,
    @InjectModel(Conversion.name) private conversionModel: Model<Conversion>,
  ) {}

  async addPointsToUser(
    userId: string,
    points: number,
    conversion_id: number,
  ): Promise<Point> {
    const pointDup = await this.pointModel
      .findOne({
        user_id: new Types.ObjectId(userId),
        conversion_id,
        type: 'add',
        action: 'purchase',
      })
      .exec();
    console.log('pointDup', pointDup);

    if (!pointDup) {
      const pointEntry = new this.pointModel({
        user_id: new Types.ObjectId(userId),
        point: points,
        conversion_id,
        type: 'add',
        action: 'purchase',
      });
      return pointEntry.save();
    }
  }
  create(createPointDto: CreatePointDto) {
    console.log(createPointDto);
    return 'This action adds a new point';
  }

  findAll() {
    return `This action returns all point`;
  }

  async getPoint(id: string) {
    const user = await this.userModel.findOne({ _id: new Types.ObjectId(id) });
    if (!user) {
      return { point: 0 };
    }
    const resultAdd = await this.pointModel.aggregate([
      {
        $match: {
          user_id: user._id,
          type: 'add',
        },
      },
      {
        $group: {
          _id: null,
          totalPoints: { $sum: '$point' },
        },
      },
    ]);
    const resultRemove = await this.pointModel.aggregate([
      {
        $match: {
          user_id: user._id,
          type: 'remove',
        },
      },
      {
        $group: {
          _id: null,
          totalPoints: { $sum: '$point' },
        },
      },
    ]);
    const result = [...resultAdd];
    const totalPointsAdd = result.length > 0 ? result[0].totalPoints : 0;
    const totalPointsRemove =
      resultRemove.length > 0 ? resultRemove[0].totalPoints : 0;
    const totalPoints =
      totalPointsAdd - totalPointsRemove > -1
        ? totalPointsAdd - totalPointsRemove
        : 0;
    return { point: totalPoints };
  }

  update(id: number, updatePointDto: UpdatePointDto) {
    console.log(updatePointDto);
    return `This action updates a #${id} point`;
  }

  remove(id: number) {
    return `This action removes a #${id} point`;
  }

  async getListReferral(id: string) {
    const user = await this.userModel.findOne({ _id: new Types.ObjectId(id) });
    if (!user) {
      return [];
    }
    return this.pointModel
      .find({ user_id: user._id, action: 'referral' })
      .populate({
        path: 'user_id',
        model: 'User',
        // select: 'id_crossmint',
      })
      .populate({
        path: 'referral_id',
        model: 'User',
        // select: 'id_crossmint',
      })
      .exec();
  }

  async getQuestRankList(userId?: string) {
    const filter = {};
    if (userId) {
      filter['aff_sub1'] = { $regex: `user_id:${userId}` };
    } else {
      filter['aff_sub1'] = { $regex: '^user_id:' };
    }
    const groupedConversion = await this.conversionModel.aggregate([
      {
        $match: {
          aff_sub1: filter['aff_sub1'],
          conversion_status: 'approved',
        },
      },
      {
        $group: {
          _id: '$aff_sub1',
          // _id: '$currency',
        },
      },
      {
        $project: {
          user_id: { $substr: ['$_id', 8, -1] },
        },
      },
      // {
      //   $sort: { sale_amount: -1 },
      // },
    ]);
    // console.log('groupedConversion', groupedConversion.length);

    const listsUserConversion = await Promise.all(
      groupedConversion.map(async (item) => {
        const user = await this.userModel.findOne({
          _id: new Types.ObjectId(item.user_id),
        });
        const conversion = await this.conversionModel
          .find({
            aff_sub1: `user_id:${item.user_id}`,
            conversion_status: 'approved',
          })
          .lean();
        return {
          user_id: item.user_id,
          username: user?.username || '',
          email: user?.email || '',
          conversion: conversion || [],
        };
      }),
    );
    const groupedByCurrency = listsUserConversion.map(async (item) => {
      const group = await item.conversion.reduce(async (acc, conv) => {
        const currency = conv.currency;
        if (!acc[currency]) {
          acc[currency] = {
            currencyOld: currency,
            currency: currency,
            totalSaleAmount: 0,
            items: [],
            rate: 0,
            saleAmount: 0,
          };
        }
        if (currency === 'THB') {
          acc[currency].totalSaleAmount += conv.sale_amount || 0;
          acc[currency].rate += 1;
          acc[currency].saleAmount += conv.sale_amount || 0;
          acc[currency].currencyOld = 'THB';
          acc[currency].currency = 'THB';
        } else if (currency === 'USD') {
          const converted = await convertToTHB(currency, conv.sale_amount || 0);
          acc[currency].saleAmount += conv.sale_amount || 0;

          acc[currency].totalSaleAmount += converted.amount || 0;
          acc[currency].rate += converted.exchangeRate || 0;
          acc[currency].currencyOld = 'USD';
          acc[currency].currency = 'THB';
        }
        // acc[currency].items.push(conv);
        return acc;
      }, {});
      const data = await Promise.all(Object.values(group));
      return {
        ...item,
        conversion: data,
      };
    });
    const dataAll = (await Promise.all(
      Object.values(groupedByCurrency),
    )) as GroupedConversion[];
    const sortedData = dataAll.sort((a, b) => {
      const totalA = a.conversion.reduce(
        (sum, conv) => sum + (conv.totalSaleAmount || 0),
        0,
      );
      const totalB = b.conversion.reduce(
        (sum, conv) => sum + (conv.totalSaleAmount || 0),
        0,
      );
      return totalB - totalA; // Sort in descending order
    });
    return sortedData;
  }

  async getMyQuestRankList(userId: string) {
    const user = await this.userModel.findOne({
      _id: new Types.ObjectId(userId),
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const conversion = await this.getQuestRankList();
    const myConversion = conversion.find((item) => item.user_id === userId);
    return {
      ...myConversion,
      rank: conversion.findIndex((item) => item.user_id === userId) + 1,
    };
  }
}
