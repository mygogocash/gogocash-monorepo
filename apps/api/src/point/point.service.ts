import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
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
import { buildApprovedUserConversionsFilter } from 'src/withdraw/conversion-user-id.util';
import {
  Quest,
  QuestReward,
  QuestRewardDistributionMode,
  QuestTask,
} from './schemas/quest.schema';
import {
  CloseQuestDto,
  CreateQuestDto,
  UpdateQuestRewardsDto,
  UpdateQuestTasksDto,
} from './dto/create-quest.dto';
import { SocialReward } from './schemas/social-reward.schema';
import { StoredMediaService } from 'src/media/stored-media.service';
import { MEDIA_FOLDER } from 'src/media/media-folders.config';
import { Deeplink } from 'src/involve/schemas/deeplink.schema';
import { requireObjectId, requireOneOf } from 'src/common/mongo-query';
import { deriveQuestStatus, withDerivedQuestStatus } from './quest-status';

const ACTIVE_OFFER_FILTER = {
  disabled: { $ne: true },
  status: { $nin: ['pending_review', 'rejected'] },
};

const QUEST_TASK_OFFER_SELECT =
  'offer_id merchant_id offer_name offer_name_display logo logo_circle logo_mobile logo_desktop tracking_link preview_url disabled status extra_point';

const QUEST_BANNER_FIELDS = [
  { key: 'banner_en', label: 'Banner EN' },
  { key: 'banner_th', label: 'Banner TH' },
  { key: 'sub_banner_en', label: 'Sub banner EN' },
  { key: 'sub_banner_th', label: 'Sub banner TH' },
] as const;

type QuestBannerKey = (typeof QUEST_BANNER_FIELDS)[number]['key'];
type QuestBannerFiles = Partial<Record<QuestBannerKey, Express.Multer.File[]>>;

type NormalizedQuestTask = {
  offer: Types.ObjectId;
  offer_id: number;
  merchant_id: number;
  extra_point: number;
  sort_order: number;
  enabled: boolean;
  wording: string;
  wording_en: string;
  wording_th: string;
  notes: string;
};

type NormalizedQuestReward = {
  rank: number;
  reward: number;
  currency: string;
};

type NormalizedQuestRewardDistribution = {
  reward_distribution_mode: QuestRewardDistributionMode;
  reward_distribution_delay_days: number;
  reward_distribution_scheduled_at: Date | null;
};

@Injectable()
export class PointService {
  private readonly logger = new Logger(PointService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Point.name) private pointModel: Model<Point>,
    @InjectModel(Conversion.name) private conversionModel: Model<Conversion>,
    @InjectModel(Offer.name) private offerModel: Model<Offer>,
    private readonly analytics: AnalyticsService,
    @InjectModel(Quest.name) private questModel: Model<Quest>,
    @InjectModel(SocialReward.name)
    private socialRewardModel: Model<SocialReward>,
    @InjectModel(Deeplink.name) private deeplinkModel: Model<Deeplink>,
    private readonly storedMediaService: StoredMediaService,
  ) {}

  private activeQuestFilter(now = new Date()) {
    return {
      $and: [
        {
          $or: [
            { start_date: { $exists: false } },
            { start_date: null },
            { start_date: { $lte: now } },
          ],
        },
        {
          $or: [
            { end_date: { $exists: false } },
            { end_date: null },
            { end_date: { $gte: now } },
          ],
        },
      ],
    };
  }

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

    // Idempotent: a grant for this (user, conversion, action) tuple already
    // exists. Return the existing Point so the Promise<Point> contract holds
    // (it previously fell through to undefined) and a retried conversion
    // approval resolves to the same record instead of double-paying.
    return pointDup;
  }
  create(_createPointDto: CreatePointDto) {
    void _createPointDto;
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

  update(id: number, _updatePointDto: UpdatePointDto) {
    void _updatePointDto;
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
      })
      .populate({
        path: 'referral_id',
        model: 'User',
      })
      .exec();
  }

  async getQuestRankList(startDate: string, endDate: string, userId?: string) {
    let filter: Record<string, unknown> = {};
    if (userId) {
      filter = buildApprovedUserConversionsFilter(userId);
    } else {
      filter = {
        conversion_status: 'approved',
        user_id: { $exists: true, $ne: null },
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
            ...buildApprovedUserConversionsFilter(userId),
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
    const extraOffer = await this.getQuestExtraPointTasksForRange(
      startDate,
      endDate,
    );

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
        $unwind: {
          path: '$conversion_id',
          // preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          $or: [
            {
              'conversion_id.datetime_conversion': {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
              },
            },
            // { conversion_id: { $eq: null } },
          ],
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

  private questTaskOfferObjectId(
    task: Partial<QuestTask> | any,
  ): Types.ObjectId | null {
    const raw = task?.offer?._id ?? task?.offer;
    if (!raw) return null;
    const value =
      raw instanceof Types.ObjectId ? raw.toHexString() : String(raw);
    return Types.ObjectId.isValid(value) ? new Types.ObjectId(value) : null;
  }

  private normalizeQuestTasks(
    payload: UpdateQuestTasksDto,
  ): NormalizedQuestTask[] {
    const seenOffers = new Set<string>();

    return (payload.tasks ?? []).map((task, index) => {
      if (!Types.ObjectId.isValid(task.offer)) {
        throw new HttpException('Invalid quest task offer id', 400);
      }
      const offer = new Types.ObjectId(task.offer);
      const offerKey = offer.toHexString();
      if (seenOffers.has(offerKey)) {
        throw new HttpException(
          'Quest tasks cannot contain duplicate offers',
          400,
        );
      }
      seenOffers.add(offerKey);

      const extraPoint = Number(task.extra_point);
      if (
        !Number.isInteger(extraPoint) ||
        extraPoint < 2 ||
        extraPoint > 10000
      ) {
        throw new HttpException(
          'Quest task extra_point must be between 2 and 10000',
          400,
        );
      }

      const offerId = Number(task.offer_id);
      const merchantId = Number(task.merchant_id);
      if (!Number.isInteger(offerId) || !Number.isInteger(merchantId)) {
        throw new HttpException(
          'Quest task offer_id and merchant_id are required',
          400,
        );
      }

      return {
        offer,
        offer_id: offerId,
        merchant_id: merchantId,
        extra_point: extraPoint,
        sort_order: index,
        enabled: task.enabled ?? true,
        wording: task.wording_en?.trim() ?? task.wording?.trim() ?? '',
        wording_en: task.wording_en?.trim() ?? task.wording?.trim() ?? '',
        wording_th: task.wording_th?.trim() ?? '',
        notes: task.notes?.trim() ?? '',
      };
    });
  }

  private normalizeQuestRewards(
    payload: UpdateQuestRewardsDto,
  ): NormalizedQuestReward[] {
    const seenRanks = new Set<number>();

    return [...(payload.rewards ?? [])]
      .map((item) => {
        const rank = Number(item.rank);
        const reward = Number(item.reward);
        const currency = (item.currency?.trim() || 'THB').toUpperCase();

        if (!Number.isInteger(rank) || rank < 1 || rank > 1000) {
          throw new HttpException(
            'Quest reward rank must be between 1 and 1000',
            400,
          );
        }
        if (!Number.isFinite(reward) || reward < 0 || reward > 1000000) {
          throw new HttpException(
            'Quest reward amount must be between 0 and 1000000',
            400,
          );
        }
        if (!currency || currency.length > 12) {
          throw new HttpException('Quest reward currency is invalid', 400);
        }
        if (seenRanks.has(rank)) {
          throw new HttpException(
            'Quest rewards cannot contain duplicate ranks',
            400,
          );
        }
        seenRanks.add(rank);

        return { rank, reward, currency };
      })
      .sort((a, b) => a.rank - b.rank);
  }

  private normalizeQuestRewardDistribution(
    payload: Partial<UpdateQuestRewardsDto>,
    quest: Partial<Quest> | any,
  ): NormalizedQuestRewardDistribution {
    const mode = (payload.reward_distribution_mode ||
      quest?.reward_distribution_mode ||
      'campaign_end') as QuestRewardDistributionMode;

    if (!['manual', 'campaign_end', 'after_days'].includes(mode)) {
      throw new HttpException('Quest reward distribution mode is invalid', 400);
    }

    const rawDelay =
      mode === 'after_days'
        ? Number(
            payload.reward_distribution_delay_days ??
              quest?.reward_distribution_delay_days ??
              7,
          )
        : 0;

    if (
      !Number.isInteger(rawDelay) ||
      rawDelay < 0 ||
      rawDelay > 365 ||
      (mode === 'after_days' && rawDelay < 1)
    ) {
      throw new HttpException(
        'Quest reward distribution delay must be between 1 and 365 days',
        400,
      );
    }

    const endDate = new Date(quest?.end_date);
    const scheduledAt =
      mode === 'manual' || Number.isNaN(endDate.getTime())
        ? null
        : new Date(endDate.getTime() + rawDelay * 86_400_000);

    return {
      reward_distribution_mode: mode,
      reward_distribution_delay_days: rawDelay,
      reward_distribution_scheduled_at: scheduledAt,
    };
  }

  private formatQuestDate(value: Date | string): string {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }

  private shouldUseLatestAvailableLeaderboardFallback(): boolean {
    return process.env.NODE_ENV !== 'production';
  }

  private questMonthRangeForDate(value: Date | string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    const start = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1),
    );
    const end = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
    );

    return {
      startDate: this.formatQuestDate(start),
      endDate: this.formatQuestDate(end),
    };
  }

  private async getLatestAvailableQuestLeaderboardRange() {
    const latestPointConversion = await this.pointModel.aggregate([
      {
        $match: {
          type: 'add',
          conversion_id: { $ne: null },
        },
      },
      {
        $lookup: {
          from: 'conversions',
          localField: 'conversion_id',
          foreignField: 'conversion_id',
          as: 'conversion',
        },
      },
      { $unwind: '$conversion' },
      {
        $group: {
          _id: null,
          latestConversionDate: { $max: '$conversion.datetime_conversion' },
        },
      },
    ]);

    return this.questMonthRangeForDate(
      latestPointConversion?.[0]?.latestConversionDate,
    );
  }

  private rewardForRank(
    rewards: Array<Partial<QuestReward>> | undefined,
    rank: number,
  ): NormalizedQuestReward {
    const reward = (rewards ?? []).find((item) => Number(item.rank) === rank);
    return {
      rank,
      reward: Number(reward?.reward ?? 0),
      currency: (reward?.currency || 'THB').toUpperCase(),
    };
  }

  private async assertQuestTaskOffersAreEligible(tasks: NormalizedQuestTask[]) {
    if (tasks.length === 0) return;

    const offerIds = tasks.map((task) => task.offer);
    const offers = await this.offerModel
      .find({
        _id: { $in: offerIds },
        ...ACTIVE_OFFER_FILTER,
      } as any)
      .lean();
    const eligibleOfferIds = new Set(
      offers.map((offer) => String((offer as any)._id)),
    );
    const missingOrInactive = tasks.filter(
      (task) => !eligibleOfferIds.has(task.offer.toHexString()),
    );
    if (missingOrInactive.length > 0) {
      throw new HttpException(
        'Quest tasks can only use existing approved active offers',
        400,
      );
    }
  }

  private async mirrorActiveQuestExtraPoints(
    quest: Partial<Quest> | any,
    tasks: NormalizedQuestTask[],
  ) {
    const questStatus =
      quest?.start_date && quest?.end_date
        ? deriveQuestStatus(quest.start_date, quest.end_date)
        : quest?.status;
    if (questStatus !== 'open') {
      return;
    }

    const previousActiveOfferIds = (quest.tasks ?? [])
      .filter((task: Partial<QuestTask>) => task.enabled !== false)
      .map((task: Partial<QuestTask>) => this.questTaskOfferObjectId(task))
      .filter((id: Types.ObjectId | null): id is Types.ObjectId => Boolean(id));
    const nextActiveTasks = tasks.filter((task) => task.enabled);
    const nextActiveIds = new Set(
      nextActiveTasks.map((task) => task.offer.toHexString()),
    );
    const resetOfferIds = previousActiveOfferIds.filter(
      (id) => !nextActiveIds.has(id.toHexString()),
    );

    await this.offerModel.updateMany(
      { _id: { $in: resetOfferIds } },
      { $set: { extra_point: 1 } },
    );

    if (nextActiveTasks.length === 0) return;
    await this.offerModel.bulkWrite(
      nextActiveTasks.map((task) => ({
        updateOne: {
          filter: { _id: task.offer },
          update: { $set: { extra_point: task.extra_point } },
        },
      })),
    );
  }

  private async getQuestExtraPointTasksForRange(
    startDate: string,
    endDate: string,
  ): Promise<Array<{ merchant_id: number; extra_point: number }>> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const quest = await this.questModel
      .findOne({
        start_date: { $lte: start },
        end_date: { $gte: end },
      })
      .lean();

    const questTasks = ((quest as any)?.tasks ?? [])
      .filter(
        (task: Partial<QuestTask>) =>
          task.enabled !== false &&
          Number(task.extra_point) > 1 &&
          Number.isFinite(Number(task.merchant_id)),
      )
      .sort(
        (a: Partial<QuestTask>, b: Partial<QuestTask>) =>
          Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0),
      )
      .map((task: Partial<QuestTask>) => ({
        merchant_id: Number(task.merchant_id),
        extra_point: Number(task.extra_point),
      }));

    if (questTasks.length > 0) return questTasks;

    return this.offerModel
      .find({ extra_point: { $gt: 1 }, ...ACTIVE_OFFER_FILTER } as any)
      .select('merchant_id extra_point')
      .lean();
  }

  async updateQuestTasks(id: string, payload: UpdateQuestTasksDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpException('Invalid quest id', 400);
    }

    const normalizedTasks = this.normalizeQuestTasks(payload);
    const questId = new Types.ObjectId(id);
    const quest = await this.questModel.findById(questId).lean();
    if (!quest) {
      throw new HttpException('Quest not found', 404);
    }

    await this.assertQuestTaskOffersAreEligible(normalizedTasks);

    const updatedQuest = await this.questModel
      .findOneAndUpdate(
        { _id: questId },
        { tasks: normalizedTasks },
        { new: true },
      )
      .populate({ path: 'tasks.offer', select: QUEST_TASK_OFFER_SELECT })
      .lean();

    await this.mirrorActiveQuestExtraPoints(quest, normalizedTasks);

    return updatedQuest;
  }

  async updateQuestRewards(id: string, payload: UpdateQuestRewardsDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpException('Invalid quest id', 400);
    }

    const normalizedRewards = this.normalizeQuestRewards(payload);
    const questId = new Types.ObjectId(id);
    const quest = await this.questModel.findById(questId).lean();
    if (!quest) {
      throw new HttpException('Quest not found', 404);
    }
    const rewardDistribution = this.normalizeQuestRewardDistribution(
      payload,
      quest,
    );

    return this.questModel
      .findOneAndUpdate(
        { _id: questId },
        { rewards: normalizedRewards, ...rewardDistribution },
        { new: true },
      )
      .populate({ path: 'tasks.offer', select: QUEST_TASK_OFFER_SELECT })
      .lean();
  }

  async getQuestAdminLeaderboard(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpException('Invalid quest id', 400);
    }

    const quest = await this.questModel.findById(new Types.ObjectId(id)).lean();
    if (!quest) {
      throw new HttpException('Quest not found', 404);
    }

    const startDate = this.formatQuestDate(quest.start_date);
    const endDate = this.formatQuestDate(quest.end_date);
    let sourceStartDate = startDate;
    let sourceEndDate = endDate;
    let dataSource: 'quest_range' | 'latest_available' = 'quest_range';
    let leaderboard = await this.getQuestRankListOfPoint(startDate, endDate);

    if (
      leaderboard.length === 0 &&
      this.shouldUseLatestAvailableLeaderboardFallback()
    ) {
      const latestRange = await this.getLatestAvailableQuestLeaderboardRange();
      if (
        latestRange &&
        (latestRange.startDate !== startDate || latestRange.endDate !== endDate)
      ) {
        const latestLeaderboard = await this.getQuestRankListOfPoint(
          latestRange.startDate,
          latestRange.endDate,
        );

        if (latestLeaderboard.length > 0) {
          leaderboard = latestLeaderboard;
          sourceStartDate = latestRange.startDate;
          sourceEndDate = latestRange.endDate;
          dataSource = 'latest_available';
        }
      }
    }

    return {
      data_source: dataSource,
      empty_range_start_date:
        dataSource === 'latest_available' ? startDate : undefined,
      empty_range_end_date:
        dataSource === 'latest_available' ? endDate : undefined,
      source_start_date: sourceStartDate,
      source_end_date: sourceEndDate,
      quest: {
        _id: String((quest as any)._id),
        start_date: quest.start_date,
        end_date: quest.end_date,
        status: quest.status,
        reward_status: quest.reward_status,
        reward_distribution_mode:
          (quest as any).reward_distribution_mode ?? 'campaign_end',
        reward_distribution_delay_days: Number(
          (quest as any).reward_distribution_delay_days ?? 0,
        ),
        reward_distribution_scheduled_at:
          (quest as any).reward_distribution_scheduled_at ?? null,
      },
      rewards: [...((quest as any).rewards ?? [])].sort(
        (a: Partial<QuestReward>, b: Partial<QuestReward>) =>
          Number(a.rank ?? 0) - Number(b.rank ?? 0),
      ),
      data: leaderboard.map((row: any, index: number) => {
        const rank = index + 1;
        const reward = this.rewardForRank((quest as any).rewards, rank);
        return {
          rank,
          user_id: String(row.user_id ?? row._id ?? ''),
          username: row.username ?? '',
          email: row.email ?? '',
          point: Number(row.point ?? 0),
          extra_point_received: Number(row.extra_point_received ?? 0),
          extra_point_referral: Number(row.extra_point_referral ?? 0),
          point_social_reward: Number(row.point_social_reward ?? 0),
          bonus_over_300_received: Number(row.bonus_over_300_received ?? 0),
          reward: reward.reward,
          currency: reward.currency,
        };
      }),
    };
  }

  async getQuestTaskDeeplinkSummary(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpException('Invalid quest id', 400);
    }

    const quest = await this.questModel
      .findById(new Types.ObjectId(id))
      .populate({ path: 'tasks.offer', select: QUEST_TASK_OFFER_SELECT })
      .lean();
    if (!quest) {
      throw new HttpException('Quest not found', 404);
    }

    const enabledTasks = ((quest as any).tasks ?? []).filter(
      (task: Partial<QuestTask>) => task.enabled !== false,
    );
    const taskKeys = enabledTasks.map((task: Partial<QuestTask>) => ({
      offer_id: Number(task.offer_id),
      merchant_id: Number(task.merchant_id),
    }));

    if (taskKeys.length === 0) return { data: [] };

    const summaries = await this.deeplinkModel.aggregate([
      {
        $match: {
          $or: taskKeys,
        },
      },
      {
        $project: {
          offer_id: 1,
          merchant_id: 1,
          deeplink: 1,
          latest_click: { $max: '$click_date' },
        },
      },
      {
        $sort: { latest_click: -1 },
      },
      {
        $group: {
          _id: { offer_id: '$offer_id', merchant_id: '$merchant_id' },
          generated_count: { $sum: 1 },
          latest_click: { $max: '$latest_click' },
          sample_deeplink: { $first: '$deeplink' },
        },
      },
    ]);

    const summaryByKey = new Map(
      summaries.map((row) => [
        `${row._id.offer_id}:${row._id.merchant_id}`,
        row,
      ]),
    );

    return {
      data: enabledTasks
        .sort(
          (a: Partial<QuestTask>, b: Partial<QuestTask>) =>
            Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0),
        )
        .map((task: Partial<QuestTask> | any) => {
          const key = `${task.offer_id}:${task.merchant_id}`;
          const summary = summaryByKey.get(key);
          const offer = task.offer ?? {};
          const offerObjectId =
            offer?._id && Types.ObjectId.isValid(String(offer._id))
              ? String(offer._id)
              : String(task.offer ?? '');
          return {
            offer_id: Number(task.offer_id),
            merchant_id: Number(task.merchant_id),
            offer: offerObjectId,
            offer_name: offer.offer_name_display || offer.offer_name || '',
            extra_point: Number(task.extra_point),
            sort_order: Number(task.sort_order ?? 0),
            tracking_link: offer.tracking_link ?? '',
            customer_path: offerObjectId ? `/shop/${offerObjectId}` : '',
            generated_count: summary?.generated_count ?? 0,
            latest_click: summary?.latest_click ?? null,
            sample_deeplink: summary?.sample_deeplink ?? '',
          };
        }),
    };
  }

  async createQuest(
    createQuestDto: CreateQuestDto,
    files: QuestBannerFiles = {},
  ) {
    const questId = createQuestDto._id
      ? requireObjectId(String(createQuestDto._id), 'quest id')
      : new Types.ObjectId();

    const existingQuest = await this.questModel.findById(questId);

    const existingQuestValues = (existingQuest?.toObject?.() ??
      existingQuest ??
      {}) as Record<string, unknown>;
    const uploadedRefs = new Map<QuestBannerKey, string>();

    try {
      // Upload every replacement first. Old media stays untouched until the
      // quest document has atomically switched to all new refs.
      for (const { key, label } of QUEST_BANNER_FIELDS) {
        const file = files[key]?.[0];
        if (!file) continue;
        uploadedRefs.set(
          key,
          await this.uploadQuestBanner(label, file, MEDIA_FOLDER.QUESTS),
        );
      }
    } catch (error) {
      await this.deleteQuestBannerRefs(
        [...uploadedRefs.values()],
        'roll back an incomplete quest banner upload',
      );
      throw error;
    }

    const resolvedBannerRefs = {} as Record<QuestBannerKey, string | null>;
    for (const { key } of QUEST_BANNER_FIELDS) {
      const existingRef = this.questBannerRef(existingQuestValues[key]);
      const submittedRef = this.questBannerRef(createQuestDto[key]);
      resolvedBannerRefs[key] =
        uploadedRefs.get(key) ??
        (existingQuest ? existingRef : submittedRef) ??
        null;
    }

    if (!existingQuest) {
      const missingLabels = QUEST_BANNER_FIELDS.filter(
        ({ key }) => !resolvedBannerRefs[key],
      ).map(({ label }) => label);
      if (missingLabels.length > 0) {
        await this.deleteQuestBannerRefs(
          [...uploadedRefs.values()],
          'roll back an invalid new quest',
        );
        throw new BadRequestException(
          `All four quest banners are required when creating a quest: ${missingLabels.join(', ')}.`,
        );
      }
    }
    const rewardDistribution = this.normalizeQuestRewardDistribution(
      {},
      {
        ...(existingQuest?.toObject?.() ?? existingQuest ?? {}),
        end_date: createQuestDto.end_date ?? existingQuest?.end_date,
      },
    );
    const questPatch: Record<string, unknown> = {
      start_date: createQuestDto.start_date,
      end_date: createQuestDto.end_date,
      status: deriveQuestStatus(
        createQuestDto.start_date,
        createQuestDto.end_date,
      ),
      facebook_post: createQuestDto.facebook_post,
      facebook_page: createQuestDto.facebook_page,
      line: createQuestDto.line,
      ...rewardDistribution,
      ...resolvedBannerRefs,
    };
    if (createQuestDto.reward_status !== undefined) {
      questPatch.reward_status = createQuestDto.reward_status;
    }

    let savedQuest;
    try {
      savedQuest = await this.questModel.findByIdAndUpdate(
        questId,
        { $set: questPatch },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        },
      );
    } catch (error) {
      await this.deleteQuestBannerRefs(
        [...uploadedRefs.values()],
        'roll back quest banners after a persistence failure',
      );
      throw error;
    }

    const replacedOldRefs = QUEST_BANNER_FIELDS.flatMap(({ key }) => {
      if (!uploadedRefs.has(key)) return [];
      const oldRef = this.questBannerRef(existingQuestValues[key]);
      return oldRef && oldRef !== uploadedRefs.get(key) ? [oldRef] : [];
    });
    await this.deleteQuestBannerRefs(
      replacedOldRefs,
      'delete superseded quest banner media',
    );

    return savedQuest;
  }

  private questBannerRef(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private async uploadQuestBanner(
    label: string,
    file: Express.Multer.File,
    folder: (typeof MEDIA_FOLDER)[keyof typeof MEDIA_FOLDER],
  ): Promise<string> {
    try {
      return await this.storedMediaService.upload(file, folder);
    } catch {
      throw new HttpException(
        `Could not upload ${label}. Please choose the image again and retry.`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  private async deleteQuestBannerRefs(
    refs: string[],
    action: string,
  ): Promise<void> {
    const uniqueRefs = [...new Set(refs.filter(Boolean))];
    const results = await Promise.allSettled(
      uniqueRefs.map((ref) => this.storedMediaService.deleteStored(ref)),
    );
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.logger.warn(
          `Could not ${action} (${uniqueRefs[index]}): ${String(result.reason)}`,
        );
      }
    });
  }

  async closeQuest(closeQuestDto: CloseQuestDto) {
    return this.questModel.updateOne(
      { status: 'open' },
      {
        $set: {
          status: requireOneOf(
            closeQuestDto.status,
            ['open', 'close', 'scheduled'] as const,
            'status',
          ),
        },
      },
      {
        upsert: true,
      },
    );
  }

  async getQuestOpen() {
    const quest = await this.questModel
      .findOne(this.activeQuestFilter())
      .populate({ path: 'tasks.offer', select: QUEST_TASK_OFFER_SELECT })
      .lean();
    return quest ? withDerivedQuestStatus(quest) : quest;
  }

  async getQuestAdmin() {
    const filter = {
      // status: 'open',
      // start_date: {
      //   $gte: new Date(startDate),
      //   $lte: new Date(endDate),
      // },
    };
    const quests = await this.questModel
      .find(filter)
      .populate({ path: 'tasks.offer', select: QUEST_TASK_OFFER_SELECT })
      .lean();
    return quests.map((quest) => withDerivedQuestStatus(quest));
  }

  async getQuestSocial(userId: string) {
    const quest = await this.questModel
      .findOne(this.activeQuestFilter())
      .lean();
    if (!quest) {
      throw new HttpException(
        'There are no active quests right now. Please check back later.',
        400,
      );
    }
    const socialRewards = await this.socialRewardModel
      .find({
        user_id: new Types.ObjectId(userId),
      })
      .lean();
    return {
      quest: withDerivedQuestStatus(quest),
      socialRewards,
    };
  }
  async questSocial(userId: string, type: string, action: string) {
    const quest = await this.questModel
      .findOne(this.activeQuestFilter())
      .lean();
    if (!quest) {
      throw new HttpException(
        'There are no active quests right now. Please check back later.',
        400,
      );
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

  async getQuestAll() {
    const quest = await this.questModel.find().lean();
    if (!quest || quest.length === 0) {
      throw new HttpException(
        'There are no active quests right now. Please check back later.',
        400,
      );
    }
    return quest.map((item) => withDerivedQuestStatus(item));
  }

  async getQuestEndTRound(startDate: string, endDate: string) {
    const consversion = await this.conversionModel
      .find({
        // datetime_conversion: {
        //   $gte: new Date(startDate),
        //   $lte: new Date(endDate),
        // },
        offer_name: 'reward_conversion_quest',
        adv_sub2: `Reward Quest ${startDate} - ${endDate}`,
      })
      .sort({ createdAt: 1 })
      .lean();
    if (!consversion || consversion.length === 0) {
      throw new HttpException(
        'There are no active quests right now. Please check back later.',
        400,
      );
    }
    return consversion;
  }

  async getMyPointSumEveryMonth(userId: string) {
    const quest = await this.questModel.find({}).lean();
    const rangeDate = quest.map((item) => {
      const start = item.start_date.toISOString().split('T')[0];
      const end = item.end_date.toISOString().split('T')[0];
      return { start, end, sumPoint: 0 };
    });

    const data = rangeDate.map(async (item) => {
      const point = await this.pointModel.aggregate([
        {
          $match: {
            user_id: new Types.ObjectId(userId),
            type: 'add',
          },
        },
        {
          $lookup: {
            from: 'conversion',
            localField: 'conversion_id',
            foreignField: 'conversion_id',
            as: 'conversion',
          },
        },
        {
          $unwind: {
            path: '$conversion',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $match: {
            $or: [
              {
                'conversion.datetime_conversion': {
                  $gte: new Date(item.start),
                  $lte: new Date(item.end),
                },
              },
              {
                conversion: { $eq: null },
                createdAt: {
                  $gte: new Date(item.start),
                  $lte: new Date(item.end),
                },
              },
            ],
          },
        },
        {
          $group: {
            _id: null,
            totalPoints: { $sum: '$point' },
            list_of_point: {
              $push: {
                point: '$point',
                conversion_id: '$conversion_id',
                action: '$action',
                createdAt: '$createdAt',
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            totalPoints: 1,
            list_of_point: 1,
          },
        },
      ]);

      return {
        ...item,
        sumPoint: point.length > 0 ? point[0].totalPoints : 0,
        list_of_point: point.length > 0 ? point[0].list_of_point : [],
      };
    });
    const point = await Promise.all(data);

    // if (!point || point.length === 0) {
    //   throw new HttpException('No point found', 404);
    // }
    return {
      point,
    };
  }

  async getSpacialPointNextRound(startDate: string, endDate: string) {
    // ดึง leaderboard ของ round ปัจจุบัน (เรียงจากมากไปน้อยแล้ว)
    const leaderboard = await this.getQuestRankListOfPoint(startDate, endDate);

    const result = leaderboard.map((user, index) => {
      const rank = index + 1;
      let specialPoint = 0;
      const breakdown = {
        rank_bonus: 0,
        social_bonus: 0,
        spend_bonus: 0,
      };

      // 1. ถ้าอยู่อันดับ 1-10 ได้ 80 point
      if (rank <= 10) {
        breakdown.rank_bonus = 80;
        specialPoint += 80;
      }

      // 2. ถ้ามี action reward_quest_social ได้ 80 point
      if (user.point_social_reward && user.point_social_reward > 0) {
        breakdown.social_bonus = 80;
        specialPoint += 80;
      }

      // 3. ถ้าใช้จ่ายเกิน 300 ได้ 30 point
      if (user.point >= 300) {
        breakdown.spend_bonus = 30;
        specialPoint += 30;
      }

      return {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        rank,
        current_point: user.point,
        special_point_next_round: specialPoint,
        breakdown,
      };
    });

    // กรองเฉพาะคนที่ได้ special point
    return result.filter((item) => item.special_point_next_round > 0);
  }
}
