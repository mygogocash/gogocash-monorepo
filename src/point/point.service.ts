import {
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { CreatePointDto } from './dto/create-point.dto';
import { UpdatePointDto } from './dto/update-point.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from 'src/user/schemas/user.schema';
import { Model, Types } from 'mongoose';
import { Point } from './schemas/point.schema';
import { Conversion } from 'src/withdraw/schemas/conversion.schema';
import { convertToTHB } from 'src/utils/helper';
import { GroupedConversion } from './interface/point.interface';
import { Offer } from 'src/offer/schemas/offer.schema';
import { AnalyticsService } from 'src/analytics/analytics.service';
import { Quest } from './schemas/quest.schema';
import { CloseQuestDto, CreateQuestDto } from './dto/create-quest.dto';
import { SocialReward } from './schemas/social-reward.schema';
import { GoogleDriveService } from 'src/google-drive/google-drive.service';

@Injectable()
export class PointService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Point.name) private pointModel: Model<Point>,
    @InjectModel(Conversion.name) private conversionModel: Model<Conversion>,
    @InjectModel(Offer.name) private offerModel: Model<Offer>,
    private readonly analytics: AnalyticsService,
    @InjectModel(Quest.name) private questModel: Model<Quest>,
    @InjectModel(SocialReward.name)
    private socialRewardModel: Model<SocialReward>,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  async addPointsToUser(
    userId: string,
    points: number,
    conversion_id: number,
    action?: string,
  ): Promise<Point> {
    const pointDup = await this.pointModel
      .findOne({
        user_id: new Types.ObjectId(userId),
        conversion_id,
        type: 'add',
        action: action || 'purchase',
      })
      .exec();
    // console.log('pointDup', pointDup);

    if (!pointDup) {
      const pointEntry = new this.pointModel({
        user_id: new Types.ObjectId(userId),
        point: points,
        conversion_id,
        type: 'add',
        action: action || 'purchase',
      });
      const savedPoint = await pointEntry.save();

      await this.analytics.capture(
        'points_granted',
        {
          userId,
          distinctId: userId,
          platform: 'api',
        },
        {
          points,
          conversion_id,
          action: 'purchase',
          source_flow: 'conversion_approval',
        },
      );

      return savedPoint;
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

  async getQuestRankList(startDate: string, endDate: string, userId?: string) {
    let filter = {};
    if (userId) {
      filter = {
        aff_sub1: { $regex: `user_id:${userId}` },
        conversion_status: 'approved',
      };
    } else {
      filter = {
        conversion_status: 'approved',
        aff_sub1: { $regex: '^user_id' },
      };
    }

    if (startDate && endDate) {
      filter['datetime_conversion'] = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }
    const groupedConversion = await this.conversionModel.aggregate([
      {
        $match: filter,
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
    // console.log('groupedConversion', groupedConversion);

    const listsUserConversion = await Promise.all(
      groupedConversion.map(async (item) => {
        const userId = item.user_id;
        const user = await this.userModel.findOne({
          _id: new Types.ObjectId(userId),
        });
        const conversion = await this.conversionModel
          .find({
            aff_sub1: `user_id:${userId}`,
            conversion_status: 'approved',
            datetime_conversion: {
              $gte: new Date(startDate),
              $lte: new Date(endDate),
            },
          })
          .lean();
        return {
          user_id: userId,
          username: user?.username || '',
          email: user?.email || '',
          conversion: conversion || [],
        };
      }),
    );
    // console.log('listsUserConversion', listsUserConversion);

    const groupedByCurrency: GroupedConversion[] = await Promise.all(
      listsUserConversion.map(async (item) => {
        const group: Record<string, any> = {};

        for (const conv of item.conversion) {
          const currency = conv.currency;
          if (!group[currency]) {
            group[currency] = {
              currencyOld: currency,
              currency: currency,
              totalSaleAmount: 0,
              items: [],
              rate: 0,
              saleAmount: 0,
            };
          }
          if (currency === 'THB') {
            group[currency].totalSaleAmount += conv.sale_amount || 0;
            group[currency].rate = 1;
            group[currency].saleAmount += conv.sale_amount || 0;
            group[currency].currencyOld = 'THB';
            group[currency].currency = 'THB';
          } else if (currency === 'USD') {
            const converted = await convertToTHB(
              currency,
              conv.sale_amount || 0,
            );
            group[currency].saleAmount += conv.sale_amount || 0;
            group[currency].totalSaleAmount += converted.amount || 0;
            group[currency].rate = converted.exchangeRate || 0;
            group[currency].currencyOld = 'USD';
            group[currency].currency = 'THB';
          }
          // group[currency].items.push(conv);
        }
        return {
          ...item,
          point: Object.values(group).reduce(
            (sum, conv) => sum + (conv.totalSaleAmount || 0),
            0,
          ),
          conversion: Object.values(group),
        };
      }),
    );
    // console.log('groupedByCurrency', groupedByCurrency);
    const sortedData = groupedByCurrency.sort((a, b) => {
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

  async getMyQuestRankList(
    userId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const user = await this.userModel.findOne({
      _id: new Types.ObjectId(userId),
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const conversion = await this.getQuestRankList(startDate, endDate, userId);
    const myConversion = conversion.find((item) => item.user_id === userId);
    return {
      ...myConversion,
      rank: conversion.findIndex((item) => item.user_id === userId) + 1,
    };
  }

  async getQuestRankListOfPoint(
    startDate: string,
    endDate: string,
    userId?: string,
  ) {
    let filter = {};
    if (userId) {
      filter = {
        user_id: new Types.ObjectId(userId),
        type: 'add',
        conversion_id: { $ne: null },
      };
    } else {
      filter = {
        type: 'add',
        conversion_id: { $ne: null },
      };
    }
    const extraOffer = await this.offerModel
      .find({ extra_point: { $gt: 1 } })
      .select('merchant_id extra_point')
      .lean();

    const extraPointReference = await this.pointModel.aggregate([
      {
        $match: {
          action: 'referral',
          type: 'add',
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          },
        },
      },
      {
        $group: {
          _id: '$user_id',
          totalExtraPoints: { $sum: '$point' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' }, // แตก array user ออกมา
    ]);
    // console.log('extraPointReference', extraPointReference);
    const extraPointsLogic =
      extraOffer.length > 0
        ? {
            $sum: extraOffer.map((offer) => ({
              $cond: [
                { $in: [offer.merchant_id, '$unique_merchants'] }, // ถ้า User เคยซื้อร้านนี้
                offer.extra_point, // ให้แต้มพิเศษ (ครั้งเดียว)
                0, // ถ้าไม่เคย ให้ 0
              ],
            })),
          }
        : 0;

    const pointsList = await this.pointModel.aggregate([
      {
        $match: filter,
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user_id',
          foreignField: '_id',
          as: 'user_id',
        },
      },
      {
        $unwind: '$user_id',
      },
      {
        $lookup: {
          from: 'conversions',
          localField: 'conversion_id',
          foreignField: 'conversion_id',
          as: 'conversion_id',
        },
      },
      {
        $unwind: '$conversion_id',
      },
      {
        $match: {
          'conversion_id.datetime_conversion': {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          },
        },
      },
      {
        $group: {
          _id: '$user_id._id',
          user_id: { $first: '$user_id._id' },
          username: { $first: '$user_id.username' },
          email: { $first: '$user_id.email' },
          point: { $sum: '$point' },
          // 🟢 พระเอกอยู่ตรงนี้: เก็บ merchant_id ทั้งหมดที่ User เคยซื้อแบบไม่ซ้ำลง Array
          unique_merchants: { $addToSet: '$conversion_id.merchant_id' },
          conversion: {
            $addToSet: {
              currencyOld: '$conversion_id.currency',
              currency: 'THB',
              totalSaleAmount: '$point',
              items: [],
              rate: 1,
              saleAmount: '$point',
              merchant_id: '$conversion_id.merchant_id',
            },
          },
          // conversion: { $push: '$conversion_id' },
        },
      },
      {
        $addFields: {
          // ใช้ logic ที่เราสร้างไว้ข้างบน มาเช็คกับ array $unique_merchants
          extra_point_received: extraPointsLogic,

          // เอาแต้มพื้นฐาน + แต้มพิเศษ
          point: { $add: ['$point', extraPointsLogic] },
        },
      },
      // -------------------------------------------------------------------
      // 🟢 2. เพิ่ม $addFields รอบสองตรงนี้ (เช็คว่าถ้ายอดเกิน 300 ให้บวกอีก 50)
      // -------------------------------------------------------------------
      {
        $addFields: {
          point: {
            $cond: {
              if: { $gte: ['$point', 300] }, // เงื่อนไข: ถ้าแต้มรวมปัจจุบัน มากกว่าหรือเท่ากับ (>=) 300
              then: { $add: ['$point', 50] }, // ถ้าจริง: เอาแต้มปัจจุบัน + 50
              else: '$point', // ถ้าไม่จริง: ใช้แต้มเท่าเดิม ไม่ต้องบวก
            },
          },
          // แถม: สร้างฟิลด์ไว้บอกว่ารายการนี้ได้โบนัส 50 ด้วยไหม (เผื่อใช้ตรวจสอบหรือโชว์ในหน้าเว็บ)
          bonus_over_300_received: {
            $cond: {
              if: { $gte: ['$point', 300] },
              then: 50,
              else: 0,
            },
          },
        },
      },
    ]);

    const addPointSocial = await this.pointModel.aggregate([
      {
        $match: {
          action: { $regex: '^reward_quest_social' }, // ตัวอย่าง: 'reward_quest_social',
          type: 'add',
          updatedAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user_id',
          foreignField: '_id',
          as: 'user_id',
        },
      },
      {
        $unwind: '$user_id',
      },
      {
        $group: {
          _id: '$user_id._id',
          user_id: { $first: '$user_id._id' },
          username: { $first: '$user_id.username' },
          email: { $first: '$user_id.email' },
          totalAddPointSocial: { $sum: '$point' },
        },
      },
    ]);
    // แปลง pointsList เป็น Map เพื่อให้ค้นหา User ได้ไวขึ้น (O(1))
    const pointsMap = new Map();
    // console.log('point', addPointSocial);
    pointsList.forEach((p) => pointsMap.set(p._id.toString(), p));

    // วนลูปรายชื่อคนที่ได้แต้ม Referral
    extraPointReference.forEach((ref) => {
      const userIdStr = ref._id.toString();

      if (pointsMap.has(userIdStr)) {
        // กรณีที่ 1: User มีอยู่ใน pointsList อยู่แล้ว -> เอาแต้มบวกเพิ่มเข้าไป
        const existingUser = pointsMap.get(userIdStr);
        existingUser.point += ref.totalExtraPoints;
        existingUser.extra_point_referral = ref.totalExtraPoints; // เก็บ record ไว้ว่าได้แต้ม referral เท่าไหร่
      } else {
        // กรณีที่ 2: User ไม่เคยมีใน pointsList เลย (ได้แต่แต้ม Referral อย่างเดียว) -> เพิ่มข้อมูลใหม่เข้าไปเลย
        const newUserObj = {
          _id: ref._id,
          user_id: ref._id,
          username: ref.user.username, // ได้มาจาก $lookup ใน extraPointReference
          email: ref.user.email,
          point: ref.totalExtraPoints, // คะแนนรวมมีแค่จาก referral
          extra_point_referral: ref.totalExtraPoints,
          conversion: [], // ไม่มีประวัติการซื้อ
          extra_point_received: 0,
          bonus_over_300_received: 0,
          point_social_reward:
            addPointSocial.find(
              (item) => item._id.toString() === ref._id.toString(),
            )?.totalAddPointSocial || 0, // เพิ่มแต้มจาก Social Reward ถ้ามี
        };

        pointsList.push(newUserObj); // ดันใส่ Array หลัก
      }
    });

    addPointSocial.forEach((social) => {
      const userIdStr = social._id.toString();
      if (pointsMap.has(userIdStr)) {
        const existingUser = pointsMap.get(userIdStr);
        existingUser.point += social.totalAddPointSocial;
        existingUser.point_social_reward = social.totalAddPointSocial; // เก็บ record ไว้ว่าได้แต้มจาก Social Reward เท่าไหร่
      } else {
        const newUserObj = {
          _id: social._id,
          user_id: social._id,
          username: social.username,
          email: social.email,
          point: social.totalAddPointSocial, // คะแนนรวมมีแค่จาก Social Reward
          extra_point_referral: 0,
          conversion: [], // ไม่มีประวัติการซื้อ
          extra_point_received: 0,
          bonus_over_300_received: 0,
          point_social_reward: social.totalAddPointSocial,
        };

        pointsList.push(newUserObj);
      }
    });

    // 4. 🟢 จัดเรียงคะแนน (Sort) ใหม่ทั้งหมด จากมากไปน้อย
    pointsList.sort((a, b) => b.point - a.point);

    return pointsList;
  }

  async getMyQuestRankListOfPoint(
    userId: string,
    startDate: string,
    endDate: string,
  ) {
    const user = await this.userModel.findOne({
      _id: new Types.ObjectId(userId),
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const conversion = await this.getQuestRankListOfPoint(
      startDate,
      endDate,
      // userId,
    );
    const rank =
      conversion.findIndex((item) => item.user_id?.toString() === userId) + 1;
    const myConversion = conversion.find((item) => {
      return item.user_id?.toString() === userId;
    });
    return {
      ...myConversion,
      rank,
    };
  }

  async createQuest(
    createQuestDto: CreateQuestDto,
    files: {
      banner_en?: Express.Multer.File[];
      banner_th?: Express.Multer.File[];
      sub_banner_en?: Express.Multer.File[];
      sub_banner_th?: Express.Multer.File[];
    },
  ) {
    const filter = createQuestDto._id
      ? { _id: new Types.ObjectId(createQuestDto._id) }
      : { status: 'open' };

    const existingOpenQuest = await this.questModel.findOne(filter);

    const folderId = '1YQtWms0kVZOs-1W2AA3m8rGnxO5EJoQX';
    let banner_en;
    if (files.banner_en?.length > 0) {
      banner_en = await this.googleDriveService.uploadFile(
        files.banner_en[0],
        folderId,
      );
      if (existingOpenQuest?.banner_en) {
        await this.googleDriveService.deleteFile(existingOpenQuest.banner_en);
      }
    }

    let banner_th;
    if (files.banner_th?.length > 0) {
      banner_th = await this.googleDriveService.uploadFile(
        files.banner_th[0],
        folderId,
      );
      if (existingOpenQuest?.banner_th) {
        await this.googleDriveService.deleteFile(existingOpenQuest.banner_th);
      }
    }

    let sub_banner_en;
    if (files.sub_banner_en?.length > 0) {
      sub_banner_en = await this.googleDriveService.uploadFile(
        files.sub_banner_en[0],
        folderId,
      );
      if (existingOpenQuest?.sub_banner_en) {
        await this.googleDriveService.deleteFile(
          existingOpenQuest.sub_banner_en,
        );
      }
    }

    let sub_banner_th;
    if (files.sub_banner_th?.length > 0) {
      sub_banner_th = await this.googleDriveService.uploadFile(
        files.sub_banner_th[0],
        folderId,
      );
      if (existingOpenQuest?.sub_banner_th) {
        await this.googleDriveService.deleteFile(
          existingOpenQuest.sub_banner_th,
        );
      }
    }
    return this.questModel.findOneAndUpdate(
      filter,
      {
        ...createQuestDto,
        banner_en: banner_en
          ? banner_en?.id
          : existingOpenQuest?.banner_en || null,
        banner_th: banner_th
          ? banner_th?.id
          : existingOpenQuest?.banner_th || null,
        sub_banner_en: sub_banner_en
          ? sub_banner_en?.id
          : existingOpenQuest?.sub_banner_en || null,
        sub_banner_th: sub_banner_th
          ? sub_banner_th?.id
          : existingOpenQuest?.sub_banner_th || null,
      },
      {
        upsert: true,
        new: true,
      },
    );
  }

  async closeQuest(closeQuestDto: CloseQuestDto) {
    return this.questModel.updateOne(
      { status: 'open' },
      { ...closeQuestDto },
      {
        upsert: true,
      },
    );
  }

  async getQuestOpen() {
    const filter = {
      status: 'open',
      // start_date: {
      //   $gte: new Date(startDate),
      //   $lte: new Date(endDate),
      // },
    };
    return this.questModel.findOne(filter).lean();
  }

  async getQuestAdmin() {
    const filter = {
      // status: 'open',
      // start_date: {
      //   $gte: new Date(startDate),
      //   $lte: new Date(endDate),
      // },
    };
    return this.questModel.find(filter).lean();
  }

  async getQuestSocial(userId: string) {
    const quest = await this.questModel.findOne({ status: 'open' }).lean();
    if (!quest) {
      throw new HttpException('No open quest available', 400);
    }
    const socialRewards = await this.socialRewardModel
      .find({
        user_id: new Types.ObjectId(userId),
      })
      .lean();
    return {
      quest,
      socialRewards,
    };
  }
  async questSocial(userId: string, type: string, action: string) {
    const quest = await this.questModel.findOne({ status: 'open' }).lean();
    if (!quest) {
      throw new HttpException('No open quest available', 400);
    }
    const filter = {
      user_id: new Types.ObjectId(userId),
      type,
      action,
    };
    if (action != 'follow' && action != 'add_friend') {
      filter['quest_id'] = quest?._id;
    }
    const socialReward = await this.socialRewardModel.findOne(filter).lean();
    if (socialReward) {
      return {
        ...socialReward,
      };
    } else {
      const newSocialReward = await this.socialRewardModel.create({
        user_id: new Types.ObjectId(userId),
        quest_id: new Types.ObjectId(quest?._id),
        reward_status: false,
        type,
        action,
      });
      return {
        ...newSocialReward.toObject(),
      };
    }
  }

  async updateQuestSocial(userId: string, id: string) {
    const socialReward = await this.socialRewardModel.findOne({
      _id: new Types.ObjectId(id),
      user_id: new Types.ObjectId(userId),
    });
    if (!socialReward) {
      throw new HttpException('Social reward not found', 404);
    }
    await this.addPointsToUser(
      userId,
      50,
      0,
      `reward_quest_social:${socialReward.type}:${socialReward.action}:${socialReward._id.toString()}`,
    );
    socialReward.reward_status = true;
    const result = await socialReward.save();
    // console.log('re', result);
    return result;
  }
}
