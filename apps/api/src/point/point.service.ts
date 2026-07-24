import {
  BadRequestException,
  ConflictException,
  HttpException,
  Inject,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { CreatePointDto } from './dto/create-point.dto';
import { UpdatePointDto } from './dto/update-point.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from 'src/user/schemas/user.schema';
import { ClientSession, Model, Types } from 'mongoose';
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
import { Deeplink } from 'src/involve/schemas/deeplink.schema';
import { requireObjectId } from 'src/common/mongo-query';
import { deriveQuestStatus, withDerivedQuestStatus } from './quest-status';
import { createHash } from 'node:crypto';
import {
  deterministicQuestId,
  questMediaPayloadHash,
  QuestMediaWriteService,
} from './quest-media-write.service';
import {
  QuestBannerFiles,
  validateQuestBannerFiles,
} from './quest-media.validation';
import { assertQuestMediaQaMutationEnabled } from './quest-media-qa.guard';
import {
  CanonicalQuestTask,
  canonicalizeStoredQuestTask,
  effectiveQuestRewardModel,
  hasQuestTaskConfigChange,
  hasQuestTaskEconomicChange,
  hasQuestTaskIdentityChange,
  newQuestTaskKey,
  revisedQuestTaskKey,
  QUEST_CONFIG_REVISION_CONFLICT,
  QUEST_TASK_CONFIG_FROZEN,
  QUEST_TASK_STATE_INSPECTOR,
  QUEST_TASK_STATE_INSPECTOR_UNAVAILABLE,
  QUEST_TIMEZONE,
  QuestEconomicCommitFence,
  QuestAudience,
  QuestRewardCaps,
  QuestTaskStateInspection,
  QuestTaskStateInspector,
} from './quest-task.contract';
import { assertSamePointLedgerEffect } from './point-ledger-idempotency';
import {
  legacyQuestPayoutConfigChecksum,
  legacySocialRewardAllowlist,
} from 'src/tasks/legacy-reward-manifest';
import { legacySocialPayoutKey } from 'src/tasks/legacy-reward-identity';
import { MembershipTier } from 'src/admin/membership/schemas/membership-tier.schema';
import { QuestEconomicMutationPolicy } from './quest-economic-mutation-policy.service';
import { activeQuestFilter } from './quest-active-filter';
import {
  QUEST_DIRECT_CREATE_DISABLED,
  isQuestRevisionWorkflowEnabled,
} from './quest-revision-readiness';
import { sanitizeAdminQuestRecord } from './quest-admin-record';

const ACTIVE_OFFER_FILTER = {
  disabled: { $ne: true },
  status: { $nin: ['pending_review', 'rejected'] },
};

const PUBLIC_QUEST_FIELDS = [
  '_id',
  'campaign_revision',
  'config_revision',
  'reward_model',
  'timezone',
  'audience',
  'reward_caps',
  'start_date',
  'end_date',
  'status',
  'reward_status',
  'reward_distribution_mode',
  'reward_distribution_delay_days',
  'reward_distribution_scheduled_at',
  'facebook_post',
  'facebook_page',
  'line',
  'banner_en',
  'banner_th',
  'sub_banner_en',
  'sub_banner_th',
  'tasks',
  'rewards',
] as const;

const PUBLIC_QUEST_TASK_FIELDS = [
  'task_key',
  'task_type',
  'offer',
  'offer_id',
  'merchant_id',
  'extra_point',
  'points',
  'completion_rule',
  'spend_scope',
  'target_thb_minor',
  'sort_order',
  'enabled',
  'wording',
  'wording_en',
  'wording_th',
] as const;

const PUBLIC_QUEST_TASK_OFFER_FIELDS = [
  '_id',
  'offer_id',
  'merchant_id',
  'offer_name',
  'offer_name_display',
  'logo',
  'logo_circle',
  'logo_mobile',
  'logo_desktop',
  'disabled',
  'status',
  'extra_point',
] as const;

const QUEST_TASK_OFFER_SELECT =
  'offer_id merchant_id offer_name offer_name_display logo logo_circle logo_mobile logo_desktop tracking_link preview_url disabled status extra_point';

type NormalizedQuestTask = CanonicalQuestTask;

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
    @InjectModel(MembershipTier.name)
    private membershipTierModel: Model<MembershipTier>,
    private readonly questMediaWrite: QuestMediaWriteService,
    private readonly questEconomicMutationPolicy: QuestEconomicMutationPolicy,
    @Optional()
    @Inject(QUEST_TASK_STATE_INSPECTOR)
    private readonly questTaskStateInspector?: QuestTaskStateInspector,
  ) {}

  private assertLegacyPayoutConfigEditable(
    quest: Record<string, any>,
    changed: boolean,
  ) {
    if (!changed) return;
    if (effectiveQuestRewardModel(quest.reward_model) !== 'legacy_v1') return;
    if (
      quest.legacy_payout_resolution_started_at ||
      quest.legacy_payout_resolution_command_key ||
      quest.legacy_payout_config_checksum
    ) {
      throw new ConflictException(
        'Legacy quest reward configuration is frozen after reconciliation begins',
      );
    }
  }

  private publicQuestRecord(
    quest: Record<string, any>,
    options: { canonicalize?: boolean } = {},
  ) {
    const canonical = options.canonicalize
      ? this.withCanonicalQuestTasks(quest)
      : quest;
    const publicQuest = Object.fromEntries(
      PUBLIC_QUEST_FIELDS.filter((field) => field in canonical).map((field) => [
        field,
        canonical[field],
      ]),
    ) as Record<string, any>;
    if (Array.isArray(canonical.tasks)) {
      publicQuest.tasks = canonical.tasks.map((task: Record<string, any>) => {
        const publicTask = Object.fromEntries(
          PUBLIC_QUEST_TASK_FIELDS.filter((field) => field in task).map(
            (field) => [field, task[field]],
          ),
        ) as Record<string, any>;
        if (task.offer && typeof task.offer === 'object') {
          publicTask.offer = Object.fromEntries(
            PUBLIC_QUEST_TASK_OFFER_FIELDS.filter(
              (field) => field in task.offer,
            ).map((field) => [field, task.offer[field]]),
          );
        }
        return publicTask;
      });
    }
    return this.withEffectiveQuestStatus(publicQuest);
  }

  private adminQuestRecord(
    quest: Record<string, any>,
    options: { canonicalize?: boolean } = {},
  ) {
    const sanitized = sanitizeAdminQuestRecord(quest);
    return options.canonicalize
      ? this.withCanonicalQuestTasks(sanitized)
      : sanitized;
  }

  private withEffectiveQuestStatus(quest: Record<string, any>) {
    if (quest.status === 'close') {
      return { ...quest, status: 'close' as const };
    }
    return withDerivedQuestStatus(
      quest as Record<string, any> & {
        start_date: Date | string;
        end_date: Date | string;
      },
    );
  }

  private assertLegacyPayoutConfigChecksum(quest: Record<string, any>) {
    const expected = String(quest.legacy_payout_config_checksum ?? '');
    if (
      !/^[a-f0-9]{64}$/.test(expected) ||
      legacyQuestPayoutConfigChecksum({ ...quest, _id: quest._id }) !== expected
    ) {
      throw new ConflictException(
        'Legacy quest reward configuration changed after reconciliation',
      );
    }
    return expected;
  }

  async addPointsToUser(
    userId: string,
    points: number,
    conversion_id: number,
    action?: string,
    idempotencyKey?: string,
  ): Promise<Point> {
    if (idempotencyKey !== undefined) {
      const key = idempotencyKey.trim();
      if (!key || key.length > 512) {
        throw new BadRequestException(
          'idempotencyKey must be a nonempty string',
        );
      }
      const pointEntry = {
        user_id: new Types.ObjectId(userId),
        point: points,
        conversion_id,
        type: 'add',
        action: action || 'purchase',
        idempotency_key: key,
      };
      try {
        const durable = await this.pointModel
          .findOneAndUpdate(
            { idempotency_key: key },
            { $setOnInsert: pointEntry },
            { upsert: true, new: true, setDefaultsOnInsert: true },
          )
          .exec();
        return assertSamePointLedgerEffect(durable, pointEntry);
      } catch (error) {
        if ((error as { code?: number })?.code !== 11000) throw error;
        const winner = await this.pointModel
          .findOne({ idempotency_key: key })
          .exec();
        if (winner) return assertSamePointLedgerEffect(winner, pointEntry);
        throw error;
      }
    }

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

  private normalizeQuestAudience(
    value: unknown,
    options: { requireCanonicalTierIds?: boolean } = {},
  ): QuestAudience {
    const audience = value as { kind?: unknown; tier_ids?: unknown[] } | null;
    if (!audience || audience.kind === 'all') return { kind: 'all' };
    if (audience.kind !== 'membership_tiers') {
      throw new HttpException('Quest audience is invalid', 400);
    }
    const tierIds = [
      ...new Set(
        (audience.tier_ids ?? [])
          .map((tier) => String(tier).trim().toLowerCase())
          .filter(Boolean),
      ),
    ];
    if (tierIds.length === 0) {
      throw new HttpException(
        'Quest membership-tier audience requires at least one tier',
        400,
      );
    }
    if (
      options.requireCanonicalTierIds &&
      tierIds.some((tierId) => !/^[a-f0-9]{24}$/.test(tierId))
    ) {
      throw new BadRequestException({
        code: 'QUEST_MEMBERSHIP_TIER_ID_INVALID',
        message:
          'Quest membership tiers must use canonical membership tier IDs. Reload the tier list and try again.',
      });
    }
    return { kind: 'membership_tiers', tier_ids: tierIds.sort() };
  }

  private async assertActiveMembershipAudienceTiers(
    audience: QuestAudience,
    session?: ClientSession,
  ): Promise<void> {
    if (audience.kind !== 'membership_tiers') return;
    const tierIds = audience.tier_ids.map(
      (tierId) => new Types.ObjectId(tierId),
    );
    const rows = await this.membershipTierModel
      .find(
        { _id: { $in: tierIds }, is_active: true },
        { _id: 1 },
        session ? { session } : {},
      )
      .lean();
    const activeIds = new Set(
      rows.map((row) => String((row as { _id: unknown })._id).toLowerCase()),
    );
    const unavailable = audience.tier_ids.filter(
      (tierId) => !activeIds.has(tierId),
    );
    if (unavailable.length > 0) {
      throw new BadRequestException({
        code: 'QUEST_MEMBERSHIP_TIERS_UNAVAILABLE',
        message:
          'One or more selected membership tiers no longer exist or are inactive. Reload the tier list and choose active tiers.',
        tier_ids: unavailable,
      });
    }
  }

  private normalizeQuestRewardCaps(value: unknown): QuestRewardCaps {
    const caps = (value ?? {}) as {
      max_awards_per_user?: unknown;
      max_referrals_per_user?: unknown;
    };
    const normalize = (raw: unknown, field: string) => {
      if (raw === undefined || raw === null || raw === '') return null;
      const amount = Number(raw);
      if (!Number.isSafeInteger(amount) || amount < 1 || amount > 1_000_000) {
        throw new HttpException(`${field} must be a positive integer`, 400);
      }
      return amount;
    };
    return {
      max_awards_per_user: normalize(
        caps.max_awards_per_user,
        'max_awards_per_user',
      ),
      max_referrals_per_user: normalize(
        caps.max_referrals_per_user,
        'max_referrals_per_user',
      ),
    };
  }

  private assertRewardModelSupportsEligibilityConfig(
    rewardModel: 'legacy_v1' | 'task_v2',
    audience: QuestAudience,
    rewardCaps: QuestRewardCaps,
  ): void {
    if (
      rewardModel !== 'legacy_v1' ||
      (audience.kind === 'all' &&
        rewardCaps.max_awards_per_user === null &&
        rewardCaps.max_referrals_per_user === null)
    ) {
      return;
    }
    throw new BadRequestException({
      code: 'QUEST_LEGACY_ADVANCED_CONFIG_UNSUPPORTED',
      message:
        'legacy_v1 supports only audience.kind=all with null reward caps. Set reward_model=task_v2 for membership audiences or per-user reward caps.',
    });
  }

  private revisionClause(
    field: 'campaign_revision' | 'config_revision',
    expected: number,
    current: unknown,
  ): Record<string, unknown> {
    return current === undefined && expected === 0
      ? {
          $or: [{ [field]: 0 }, { [field]: { $exists: false } }],
        }
      : { [field]: expected };
  }

  private questMutationFilter(
    questId: Types.ObjectId,
    clauses: Array<Record<string, unknown>>,
  ): Record<string, unknown> {
    const filter: Record<string, unknown> = { _id: questId };
    const orClauses: unknown[][] = [];
    for (const clause of clauses) {
      if (Array.isArray(clause.$or)) {
        orClauses.push(clause.$or as unknown[]);
      } else {
        Object.assign(filter, clause);
      }
    }
    if (orClauses.length === 1) filter.$or = orClauses[0];
    if (orClauses.length > 1) {
      filter.$and = orClauses.map(($or) => ({ $or }));
    }
    return filter;
  }

  private taskV2EconomicCommitFence(
    questId: string,
    quest: Partial<Quest> | Record<string, unknown>,
    nextStartDate?: Date,
    nextEndDate?: Date,
  ): QuestEconomicCommitFence {
    if (!this.questTaskStateInspector) {
      throw new HttpException(
        {
          code: QUEST_TASK_STATE_INSPECTOR_UNAVAILABLE,
          message:
            'Quest task state cannot be inspected safely. Try again after the task engine is available.',
        },
        503,
      );
    }
    return (commit) =>
      this.questTaskStateInspector!.withTaskConfigEditFence(
        questId,
        async (state: QuestTaskStateInspection, session: ClientSession) => {
          const now = new Date();
          const currentStart = new Date((quest as any).start_date);
          const nextStart = nextStartDate ?? currentStart;
          const hasStarted =
            Number.isNaN(currentStart.getTime()) || currentStart <= now;
          const nextWindowHasStarted =
            Number.isNaN(nextStart.getTime()) || nextStart <= now;
          const hasEffect = Boolean(
            (quest as any).task_v2_state_frozen_at ||
            state.has_outbox ||
            state.has_progress ||
            state.has_award,
          );
          if (hasStarted || nextWindowHasStarted || hasEffect) {
            throw new ConflictException({
              code: QUEST_TASK_CONFIG_FROZEN,
              message:
                'Quest economics are frozen after start or progress. Create a new revision with a future window.',
            });
          }
          return commit(state, session);
        },
        {
          start_at:
            nextStartDate ??
            new Date((quest as Record<string, any>).start_date),
          end_at:
            nextEndDate ?? new Date((quest as Record<string, any>).end_date),
        },
      );
  }

  private canonicalQuestTasksForRead(
    quest: Partial<Quest> | Record<string, any>,
  ): CanonicalQuestTask[] {
    const questId = String((quest as any)?._id ?? 'unknown-quest');
    return ((quest as any)?.tasks ?? []).map((task: any) =>
      canonicalizeStoredQuestTask(questId, task, (quest as any)?.reward_model),
    ) as CanonicalQuestTask[];
  }

  private withCanonicalQuestTasks<T extends Record<string, any>>(quest: T): T {
    return {
      ...quest,
      reward_model: effectiveQuestRewardModel(quest.reward_model),
      config_revision: Number(quest.config_revision ?? 0),
      timezone: quest.timezone ?? QUEST_TIMEZONE,
      audience: this.normalizeQuestAudience(quest.audience),
      reward_caps: this.normalizeQuestRewardCaps(quest.reward_caps),
      tasks: this.canonicalQuestTasksForRead(quest),
    };
  }

  private async normalizeQuestTasks(
    quest: Partial<Quest> | Record<string, any>,
    payload: UpdateQuestTasksDto,
    rewardModel: 'legacy_v1' | 'task_v2',
  ): Promise<NormalizedQuestTask[]> {
    const rawTasks = (payload.tasks ?? []) as Array<Record<string, any>>;
    const seenOffers = new Set<string>();
    const seenTaskKeys = new Set<string>();
    const existingTaskKeys = new Set(
      this.canonicalQuestTasksForRead(quest).map((task) => task.task_key),
    );
    const existingTasksByKey = new Map(
      this.canonicalQuestTasksForRead(quest).map((task) => [
        task.task_key,
        task,
      ]),
    );
    const reusableBrandOffersByTaskKey = new Map<
      string,
      { _id: Types.ObjectId; offer_id: number; merchant_id: number }
    >();
    const brandOfferIds = rawTasks.flatMap((task) => {
      const taskType =
        task.task_type ??
        (rewardModel === 'legacy_v1' ? 'brand_purchase' : undefined);
      if (taskType !== 'brand_purchase') return [];
      if (!Types.ObjectId.isValid(task.offer)) {
        throw new HttpException('Invalid quest task offer id', 400);
      }
      const offerId = String(task.offer);
      if (seenOffers.has(offerId)) {
        throw new HttpException(
          'Quest tasks cannot contain duplicate offers',
          400,
        );
      }
      seenOffers.add(offerId);
      const requestedKey = task.task_key ? String(task.task_key) : '';
      const existing = requestedKey
        ? existingTasksByKey.get(requestedKey)
        : undefined;
      const existingBrand =
        existing?.task_type === 'brand_purchase' ? existing : undefined;
      const existingOfferId = existingBrand
        ? this.questTaskOfferObjectId(existingBrand)
        : null;
      const existingOfferProviderId = Number(existingBrand?.offer_id);
      const existingMerchantId = Number(existingBrand?.merchant_id);
      const preservesStoredIdentity = Boolean(
        existingBrand &&
        existingOfferId?.equals(new Types.ObjectId(offerId)) &&
        Number(existingBrand?.points) ===
          Number(task.points ?? task.extra_point) &&
        (existing.enabled !== false) === (task.enabled ?? true) &&
        Number.isSafeInteger(existingOfferProviderId) &&
        Number.isSafeInteger(existingMerchantId) &&
        (task.offer_id === undefined ||
          Number(task.offer_id) === existingOfferProviderId) &&
        (task.merchant_id === undefined ||
          Number(task.merchant_id) === existingMerchantId),
      );
      if (preservesStoredIdentity && existingOfferId) {
        reusableBrandOffersByTaskKey.set(requestedKey, {
          _id: existingOfferId,
          offer_id: existingOfferProviderId,
          merchant_id: existingMerchantId,
        });
        return [];
      }
      return [new Types.ObjectId(offerId)];
    });

    const offers =
      brandOfferIds.length === 0
        ? []
        : await this.offerModel
            .find({
              _id: { $in: brandOfferIds },
              ...ACTIVE_OFFER_FILTER,
            } as any)
            .lean();
    const offersById = new Map(
      (offers as any[]).map((offer) => [String(offer._id), offer]),
    );
    if (offersById.size !== brandOfferIds.length) {
      throw new HttpException(
        'Quest tasks can only use existing approved active offers',
        400,
      );
    }

    return rawTasks.map((task, index) => {
      const taskType =
        task.task_type ??
        (rewardModel === 'legacy_v1' ? 'brand_purchase' : undefined);
      if (
        taskType !== 'brand_purchase' &&
        taskType !== 'friend_referral' &&
        taskType !== 'spend_target'
      ) {
        throw new HttpException('Quest task_type is invalid', 400);
      }
      if (rewardModel === 'legacy_v1' && taskType !== 'brand_purchase') {
        throw new HttpException(
          'legacy_v1 quests support only brand_purchase tasks',
          400,
        );
      }

      const points = Number(task.points ?? task.extra_point);
      if (!Number.isSafeInteger(points) || points < 2 || points > 10000) {
        throw new HttpException(
          'Quest task points must be between 2 and 10000',
          400,
        );
      }

      const requestedKey = task.task_key ? String(task.task_key) : '';
      if (requestedKey && !existingTaskKeys.has(requestedKey)) {
        throw new HttpException(
          'Quest task task_key is server-owned and does not belong to this quest',
          400,
        );
      }
      let taskKey = requestedKey || newQuestTaskKey();
      if (seenTaskKeys.has(taskKey)) {
        throw new HttpException('Quest tasks cannot duplicate task_key', 400);
      }
      seenTaskKeys.add(taskKey);

      const wordingEn =
        String(task.wording_en ?? '').trim() ||
        String(task.wording ?? '').trim();
      const wordingTh = String(task.wording_th ?? '').trim();
      if (!wordingEn && !wordingTh) {
        throw new HttpException(
          'Quest task requires customer-visible wording in English or Thai',
          400,
        );
      }
      const common = {
        task_key: taskKey,
        task_type: taskType,
        points,
        sort_order: index,
        enabled: task.enabled ?? true,
        wording: wordingEn || wordingTh,
        wording_en: wordingEn,
        wording_th: wordingTh,
        notes: String(task.notes ?? '').trim(),
      };

      let normalized: NormalizedQuestTask;
      if (taskType === 'brand_purchase') {
        const offer =
          reusableBrandOffersByTaskKey.get(requestedKey) ??
          offersById.get(String(task.offer));
        const offerId = Number(offer?.offer_id);
        const merchantId = Number(offer?.merchant_id);
        if (
          !Number.isSafeInteger(offerId) ||
          !Number.isSafeInteger(merchantId)
        ) {
          throw new HttpException(
            'Selected offer is missing provider or merchant identity',
            400,
          );
        }
        normalized = {
          ...common,
          task_type: 'brand_purchase',
          offer: new Types.ObjectId(String(offer._id)),
          offer_id: offerId,
          merchant_id: merchantId,
          extra_point: points,
        };
      } else if (taskType === 'friend_referral') {
        if (
          task.completion_rule !== 'account_created' &&
          task.completion_rule !== 'first_earning_conversion'
        ) {
          throw new HttpException(
            'Quest referral completion_rule is invalid',
            400,
          );
        }
        normalized = {
          ...common,
          task_type: 'friend_referral',
          completion_rule: task.completion_rule,
        };
      } else {
        const target = Number(task.target_thb_minor);
        if (
          task.spend_scope !== 'any_shop_via_ggc' ||
          !Number.isSafeInteger(target) ||
          target < 1
        ) {
          throw new HttpException('Quest spend target is invalid', 400);
        }
        normalized = {
          ...common,
          task_type: 'spend_target',
          spend_scope: 'any_shop_via_ggc',
          target_thb_minor: target,
        };
      }

      const existing = requestedKey
        ? existingTasksByKey.get(requestedKey)
        : undefined;
      if (
        existing &&
        hasQuestTaskIdentityChange(
          existing as unknown as Record<string, unknown>,
          normalized as unknown as Record<string, unknown>,
        )
      ) {
        taskKey = newQuestTaskKey();
        normalized.task_key = taskKey;
      }
      return normalized;
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

  private async mirrorActiveQuestExtraPoints(
    quest: Partial<Quest> | any,
    tasks: NormalizedQuestTask[],
    session?: ClientSession,
  ) {
    const questStatus =
      quest?.start_date && quest?.end_date
        ? deriveQuestStatus(quest.start_date, quest.end_date)
        : quest?.status;
    if (questStatus !== 'open') {
      return;
    }

    const previousActiveOfferIds = (quest.tasks ?? [])
      .filter(
        (task: Partial<QuestTask>) =>
          task.enabled !== false &&
          (task.task_type === undefined || task.task_type === 'brand_purchase'),
      )
      .map((task: Partial<QuestTask>) => this.questTaskOfferObjectId(task))
      .filter((id: Types.ObjectId | null): id is Types.ObjectId => Boolean(id));
    const nextActiveTasks = tasks.filter(
      (
        task,
      ): task is Extract<CanonicalQuestTask, { task_type: 'brand_purchase' }> =>
        task.enabled && task.task_type === 'brand_purchase',
    );
    const nextActiveIds = new Set(
      nextActiveTasks.map((task) => String(task.offer)),
    );
    const resetOfferIds = previousActiveOfferIds.filter(
      (id) => !nextActiveIds.has(id.toHexString()),
    );

    await this.offerModel.updateMany(
      { _id: { $in: resetOfferIds } },
      { $set: { extra_point: 1 } },
      session ? { session } : {},
    );

    if (nextActiveTasks.length === 0) return;
    await this.offerModel.bulkWrite(
      nextActiveTasks.map((task) => ({
        updateOne: {
          filter: { _id: task.offer },
          update: { $set: { extra_point: task.extra_point } },
        },
      })),
      session ? { session } : {},
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
        publication_status: { $ne: 'draft' },
        start_date: { $lte: start },
        end_date: { $gte: end },
      })
      .sort({ start_date: -1, _id: -1 })
      .lean();

    const questTasks = ((quest as any)?.tasks ?? [])
      .filter(
        (task: Partial<QuestTask>) =>
          task.enabled !== false &&
          (task.task_type === undefined ||
            task.task_type === 'brand_purchase') &&
          Number(task.points ?? task.extra_point) > 1 &&
          Number.isFinite(Number(task.merchant_id)),
      )
      .sort(
        (a: Partial<QuestTask>, b: Partial<QuestTask>) =>
          Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0),
      )
      .map((task: Partial<QuestTask>) => ({
        merchant_id: Number(task.merchant_id),
        extra_point: Number(task.points ?? task.extra_point),
      }));

    if (questTasks.length > 0) return questTasks;

    if (effectiveQuestRewardModel((quest as any)?.reward_model) === 'task_v2') {
      return [];
    }

    return this.offerModel
      .find({ extra_point: { $gt: 1 }, ...ACTIVE_OFFER_FILTER } as any)
      .select('merchant_id extra_point')
      .lean();
  }

  async updateQuestTasks(id: string, payload: UpdateQuestTasksDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpException('Invalid quest id', 400);
    }

    const questId = new Types.ObjectId(id);
    const quest = await this.questModel.findById(questId).lean();
    if (!quest) {
      throw new HttpException('Quest not found', 404);
    }

    let rewardModel: 'legacy_v1' | 'task_v2';
    try {
      rewardModel = effectiveQuestRewardModel(
        payload.reward_model ?? (quest as any).reward_model,
      );
    } catch (error) {
      throw new HttpException((error as Error).message, 400);
    }
    const expectedRevision = Number(payload.expected_config_revision ?? 0);
    const currentRevision = Number((quest as any).config_revision ?? 0);
    if (
      !Number.isSafeInteger(expectedRevision) ||
      expectedRevision < 0 ||
      expectedRevision !== currentRevision
    ) {
      throw new ConflictException({
        code: QUEST_CONFIG_REVISION_CONFLICT,
        message: 'Quest task configuration changed. Reload and try again.',
      });
    }

    let normalizedTasks = await this.normalizeQuestTasks(
      quest as any,
      payload,
      rewardModel,
    );
    const timezone =
      payload.timezone ?? (quest as any).timezone ?? QUEST_TIMEZONE;
    if (timezone !== QUEST_TIMEZONE) {
      throw new HttpException('Quest timezone must be Asia/Bangkok', 400);
    }
    const audience = this.normalizeQuestAudience(
      payload.audience ?? (quest as any).audience,
      { requireCanonicalTierIds: true },
    );
    const rewardCaps = this.normalizeQuestRewardCaps(
      payload.reward_caps ?? (quest as any).reward_caps,
    );
    const currentTasks = this.canonicalQuestTasksForRead(quest as any);
    const globalIdentityChange = hasQuestTaskEconomicChange(
      {
        reward_model: (quest as any).reward_model,
        timezone: (quest as any).timezone,
        audience: (quest as any).audience,
        reward_caps: (quest as any).reward_caps,
        tasks: [],
      },
      {
        reward_model: rewardModel,
        timezone,
        audience,
        reward_caps: rewardCaps,
        tasks: [],
      },
    );
    if (globalIdentityChange) {
      normalizedTasks = normalizedTasks.map((task) => ({
        ...task,
        task_key: newQuestTaskKey(),
      })) as NormalizedQuestTask[];
    }
    const nextConfig = {
      reward_model: rewardModel,
      timezone,
      start_date: (quest as any).start_date,
      end_date: (quest as any).end_date,
      audience,
      reward_caps: rewardCaps,
      tasks: normalizedTasks as unknown as Array<Record<string, unknown>>,
    };
    const economicChange = hasQuestTaskEconomicChange(
      {
        reward_model: (quest as any).reward_model,
        timezone: (quest as any).timezone,
        start_date: (quest as any).start_date,
        end_date: (quest as any).end_date,
        audience: (quest as any).audience,
        reward_caps: (quest as any).reward_caps,
        tasks: currentTasks as unknown as Array<Record<string, unknown>>,
      },
      nextConfig,
    );
    const configChange = hasQuestTaskConfigChange(
      {
        reward_model: (quest as any).reward_model,
        timezone: (quest as any).timezone,
        start_date: (quest as any).start_date,
        end_date: (quest as any).end_date,
        audience: (quest as any).audience,
        reward_caps: (quest as any).reward_caps,
        tasks: currentTasks as unknown as Array<Record<string, unknown>>,
      },
      nextConfig,
    );
    if (!configChange) {
      this.assertRewardModelSupportsEligibilityConfig(
        rewardModel,
        audience,
        rewardCaps,
      );
      return this.adminQuestRecord(quest as any, { canonicalize: true });
    }
    this.assertLegacyPayoutConfigEditable(quest as any, economicChange);
    this.assertRewardModelSupportsEligibilityConfig(
      rewardModel,
      audience,
      rewardCaps,
    );
    const patch = {
      reward_model: rewardModel,
      timezone,
      audience,
      reward_caps: rewardCaps,
      tasks: normalizedTasks,
    };

    const persist = async (
      state?: {
        has_outbox: boolean;
        has_progress: boolean;
        has_award: boolean;
      },
      session?: ClientSession,
    ) => {
      const now = new Date();
      if (economicChange) {
        this.questEconomicMutationPolicy.assertEconomicMutationAllowed(
          quest as any,
          state,
          { now },
        );
      }

      if (audience.kind === 'membership_tiers' && economicChange) {
        await this.assertActiveMembershipAudienceTiers(audience, session);
      }

      const revisionFilter =
        (quest as any).config_revision === undefined
          ? {
              $or: [
                { config_revision: 0 },
                { config_revision: { $exists: false } },
              ],
            }
          : { config_revision: expectedRevision };
      const filter: Record<string, unknown> = { _id: questId };
      if ((quest as any).config_revision === undefined) {
        filter.$and = [revisionFilter];
      } else {
        Object.assign(filter, revisionFilter);
      }
      if (economicChange) {
        filter.start_date = { $gt: now };
        if ((quest as any).revision_of) {
          filter.publication_status = 'draft';
        }
        if (rewardModel === 'task_v2') {
          const noStateFence = {
            $or: [
              { task_v2_state_frozen_at: { $exists: false } },
              { task_v2_state_frozen_at: null },
            ],
          };
          if (Array.isArray(filter.$and)) {
            (filter.$and as unknown[]).push(noStateFence);
          } else {
            filter.$or = noStateFence.$or;
          }
        }
      }

      const updatedQuest = await this.questModel
        .findOneAndUpdate(
          filter,
          { $set: patch, $inc: { config_revision: 1 } },
          { new: true, ...(session ? { session } : {}) },
        )
        .populate({ path: 'tasks.offer', select: QUEST_TASK_OFFER_SELECT })
        .lean();
      if (!updatedQuest) {
        throw new ConflictException({
          code: economicChange
            ? QUEST_TASK_CONFIG_FROZEN
            : QUEST_CONFIG_REVISION_CONFLICT,
          message: economicChange
            ? 'Quest economics became frozen while saving. Reload and create a new revision.'
            : 'Quest task configuration changed. Reload and try again.',
        });
      }

      await this.mirrorActiveQuestExtraPoints(quest, normalizedTasks, session);
      return this.adminQuestRecord(updatedQuest as any, {
        canonicalize: true,
      });
    };

    if (rewardModel !== 'task_v2') return persist();
    if (!this.questTaskStateInspector) {
      throw new HttpException(
        {
          code: QUEST_TASK_STATE_INSPECTOR_UNAVAILABLE,
          message:
            'Quest task state cannot be inspected safely. Try again after the task engine is available.',
        },
        503,
      );
    }
    return this.questTaskStateInspector.withTaskConfigEditFence(id, persist);
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
    const expectedRevision = Number(payload.expected_config_revision);
    const currentRevision = Number((quest as any).config_revision ?? 0);
    if (
      !Number.isSafeInteger(expectedRevision) ||
      expectedRevision < 0 ||
      expectedRevision !== currentRevision
    ) {
      throw new ConflictException({
        code: QUEST_CONFIG_REVISION_CONFLICT,
        message: 'Quest reward configuration changed. Reload and try again.',
      });
    }
    const rewardDistribution = this.normalizeQuestRewardDistribution(
      payload,
      quest,
    );
    const currentRewards = ((quest as any).rewards ?? [])
      .map((reward: Partial<QuestReward>) => ({
        rank: Number(reward.rank),
        reward: Number(reward.reward),
        currency: String(reward.currency || 'THB').toUpperCase(),
      }))
      .sort(
        (left: NormalizedQuestReward, right: NormalizedQuestReward) =>
          left.rank - right.rank,
      );
    const currentDistribution = this.normalizeQuestRewardDistribution(
      {},
      quest,
    );
    const economicChange =
      JSON.stringify({ rewards: currentRewards, ...currentDistribution }) !==
      JSON.stringify({ rewards: normalizedRewards, ...rewardDistribution });
    if (!economicChange) {
      return this.adminQuestRecord(quest as any, { canonicalize: true });
    }

    let rewardModel: 'legacy_v1' | 'task_v2';
    try {
      rewardModel = effectiveQuestRewardModel((quest as any).reward_model);
    } catch (error) {
      throw new HttpException((error as Error).message, 400);
    }
    this.assertLegacyPayoutConfigEditable(quest as any, economicChange);
    const persist = async (
      state?: QuestTaskStateInspection,
      session?: ClientSession,
    ) => {
      const now = new Date();
      this.questEconomicMutationPolicy.assertEconomicMutationAllowed(
        quest as any,
        state,
        { now },
      );
      const clauses = [
        this.revisionClause(
          'config_revision',
          expectedRevision,
          (quest as any).config_revision,
        ),
      ];
      clauses.push({ start_date: { $gt: now } });
      if ((quest as any).revision_of) {
        clauses.push({ publication_status: 'draft' });
      }
      if (rewardModel === 'task_v2') {
        clauses.push({
          $or: [
            { task_v2_state_frozen_at: { $exists: false } },
            { task_v2_state_frozen_at: null },
          ],
        });
      }
      const updated = await this.questModel
        .findOneAndUpdate(
          this.questMutationFilter(questId, clauses),
          {
            $set: { rewards: normalizedRewards, ...rewardDistribution },
            $inc: { config_revision: 1 },
          },
          { new: true, ...(session ? { session } : {}) },
        )
        .populate({ path: 'tasks.offer', select: QUEST_TASK_OFFER_SELECT })
        .lean();
      if (!updated) {
        throw new ConflictException({
          code: economicChange
            ? QUEST_TASK_CONFIG_FROZEN
            : QUEST_CONFIG_REVISION_CONFLICT,
          message: economicChange
            ? 'Quest economics became frozen while saving. Reload and create a new revision.'
            : 'Quest reward configuration changed. Reload and try again.',
        });
      }
      return this.adminQuestRecord(updated as any, { canonicalize: true });
    };

    if (rewardModel !== 'task_v2') return persist();
    return this.taskV2EconomicCommitFence(id, quest)(persist);
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
      (task: Partial<QuestTask>) =>
        task.enabled !== false &&
        (task.task_type === undefined || task.task_type === 'brand_purchase'),
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
            extra_point: Number(task.points ?? task.extra_point),
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
    const requestKey = createQuestDto.request_key?.trim();
    if (!requestKey) {
      throw new BadRequestException('request_key is required');
    }
    const expectedRevision = Number(createQuestDto.campaign_revision ?? 0);
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
      throw new BadRequestException(
        'campaign_revision must be zero or greater',
      );
    }
    const expectedConfigRevision = Number(
      createQuestDto.expected_config_revision,
    );
    if (
      !Number.isSafeInteger(expectedConfigRevision) ||
      expectedConfigRevision < 0
    ) {
      throw new BadRequestException(
        'expected_config_revision must be zero or greater',
      );
    }
    const isCreateRequest = !createQuestDto._id;
    if (isCreateRequest && isQuestRevisionWorkflowEnabled()) {
      throw new ConflictException({
        code: QUEST_DIRECT_CREATE_DISABLED,
        message:
          'Direct Quest creation is disabled while revision workflow is enabled. Create a future revision from an existing Quest.',
      });
    }
    const questId = createQuestDto._id
      ? requireObjectId(String(createQuestDto._id), 'quest id')
      : deterministicQuestId(requestKey);
    const qaMarker = createQuestDto.qa_marker?.trim();
    const qaCleanupNonce = createQuestDto.qa_cleanup_nonce?.trim();
    if (Boolean(qaMarker) !== Boolean(qaCleanupNonce)) {
      throw new BadRequestException(
        'qa_marker and qa_cleanup_nonce must be supplied together',
      );
    }
    if (qaMarker) {
      if (!isCreateRequest || !requestKey.startsWith('quest-media:qa:')) {
        throw new BadRequestException(
          'QA markers are allowed only for a new quest-media:qa command',
        );
      }
      assertQuestMediaQaMutationEnabled();
    }

    // Validate and decode the complete selected set before media preparation,
    // durable intent creation, object storage, or quest persistence. Banner
    // strings in the request body are never consulted as upload proof.
    const selectedFiles = await validateQuestBannerFiles(
      files,
      isCreateRequest,
    );
    const existingQuest = await this.questModel.findById(questId);
    if (!isCreateRequest && !existingQuest) {
      throw new HttpException('Quest not found', 404);
    }
    const existingQuestRecord = (existingQuest?.toObject?.() ??
      existingQuest ??
      {}) as Record<string, unknown>;
    for (const revisionField of [
      'campaign_revision',
      'config_revision',
    ] as const) {
      if (existingQuest?.$isDefault?.(revisionField)) {
        delete existingQuestRecord[revisionField];
      }
    }
    const scheduleEconomicChange = Boolean(
      !isCreateRequest &&
      existingQuest &&
      (new Date(existingQuestRecord.start_date as Date | string).getTime() !==
        new Date(createQuestDto.start_date).getTime() ||
        new Date(existingQuestRecord.end_date as Date | string).getTime() !==
          new Date(createQuestDto.end_date).getTime()),
    );
    const socialRewardEconomicChange = Boolean(
      !isCreateRequest &&
      existingQuest &&
      (String(existingQuestRecord.facebook_page ?? '') !==
        String(createQuestDto.facebook_page ?? '') ||
        String(existingQuestRecord.facebook_post ?? '') !==
          String(createQuestDto.facebook_post ?? '') ||
        String(existingQuestRecord.line ?? '') !==
          String(createQuestDto.line ?? '')),
    );
    const campaignEconomicChange =
      scheduleEconomicChange || socialRewardEconomicChange;
    if (
      campaignEconomicChange &&
      expectedConfigRevision !==
        Number(existingQuestRecord.config_revision ?? 0)
    ) {
      throw new ConflictException({
        code: QUEST_CONFIG_REVISION_CONFLICT,
        message: 'Quest schedule changed. Reload and try again.',
      });
    }
    let existingRewardModel: 'legacy_v1' | 'task_v2' = 'legacy_v1';
    if (existingQuest) {
      try {
        existingRewardModel = effectiveQuestRewardModel(
          existingQuestRecord.reward_model,
        );
      } catch (error) {
        throw new HttpException((error as Error).message, 400);
      }
    }
    const taskV2EconomicChange =
      campaignEconomicChange && existingRewardModel === 'task_v2';
    const taskV2TaskIdentityChange =
      scheduleEconomicChange && existingRewardModel === 'task_v2';
    if (campaignEconomicChange) {
      this.questEconomicMutationPolicy.assertEconomicMutationAllowed(
        existingQuestRecord,
        undefined,
        { next_start_date: new Date(createQuestDto.start_date) },
      );
    }
    const legacyPayoutConfigChange = Boolean(
      existingQuest && campaignEconomicChange,
    );
    this.assertLegacyPayoutConfigEditable(
      existingQuestRecord,
      legacyPayoutConfigChange,
    );
    const economicCommitFence = taskV2EconomicChange
      ? this.taskV2EconomicCommitFence(
          String(questId),
          existingQuestRecord,
          new Date(createQuestDto.start_date),
          new Date(createQuestDto.end_date),
        )
      : undefined;
    const commandRewardDistribution = this.normalizeQuestRewardDistribution(
      {},
      isCreateRequest
        ? { end_date: createQuestDto.end_date }
        : {
            ...(existingQuest?.toObject?.() ?? existingQuest ?? {}),
            end_date: createQuestDto.end_date ?? existingQuest?.end_date,
          },
    );
    const rewardDistribution =
      isCreateRequest || scheduleEconomicChange
        ? commandRewardDistribution
        : {};
    const questPatch: Record<string, unknown> = {
      start_date: createQuestDto.start_date,
      end_date: createQuestDto.end_date,
      facebook_post: createQuestDto.facebook_post,
      facebook_page: createQuestDto.facebook_page,
      line: createQuestDto.line,
      ...rewardDistribution,
    };
    if (isCreateRequest) {
      questPatch.status = deriveQuestStatus(
        createQuestDto.start_date,
        createQuestDto.end_date,
      );
    }
    if (qaMarker) questPatch.qa_marker = qaMarker;
    if (taskV2TaskIdentityChange) {
      questPatch.tasks = this.canonicalQuestTasksForRead(
        existingQuestRecord,
      ).map((task) => ({
        ...task,
        task_key: revisedQuestTaskKey(
          String(questId),
          task.task_key,
          expectedConfigRevision + 1,
        ),
      }));
    }

    if (selectedFiles.size === 0) {
      if (!existingQuest) {
        throw new BadRequestException(
          'All four quest banners are required when creating a quest.',
        );
      }
      const persist = async (
        _state?: QuestTaskStateInspection,
        session?: ClientSession,
      ) => {
        const now = new Date();
        const clauses = [
          this.revisionClause(
            'campaign_revision',
            expectedRevision,
            existingQuestRecord.campaign_revision,
          ),
        ];
        if (campaignEconomicChange) {
          clauses.push(
            this.revisionClause(
              'config_revision',
              expectedConfigRevision,
              existingQuestRecord.config_revision,
            ),
          );
        }
        if (campaignEconomicChange) {
          clauses.push({ start_date: { $gt: now } });
          if (existingQuestRecord.revision_of) {
            clauses.push({ publication_status: 'draft' });
          }
        }
        if (taskV2EconomicChange) {
          clauses.push({
            $or: [
              { task_v2_state_frozen_at: { $exists: false } },
              { task_v2_state_frozen_at: null },
            ],
          });
        }
        const increment = campaignEconomicChange
          ? { campaign_revision: 1, config_revision: 1 }
          : { campaign_revision: 1 };
        const saved = await this.questModel.findOneAndUpdate(
          this.questMutationFilter(questId, clauses),
          { $set: questPatch, $inc: increment },
          { new: true, ...(session ? { session } : {}) },
        );
        if (!saved) {
          throw new ConflictException({
            code: taskV2EconomicChange
              ? QUEST_TASK_CONFIG_FROZEN
              : campaignEconomicChange
                ? QUEST_TASK_CONFIG_FROZEN
                : QUEST_CONFIG_REVISION_CONFLICT,
            message: campaignEconomicChange
              ? 'Quest economics became frozen while saving. Reload and create a new revision.'
              : 'This quest changed while you were editing. Reload and try again.',
          });
        }
        return this.adminQuestRecord(saved as any, { canonicalize: true });
      };
      return economicCommitFence ? economicCommitFence(persist) : persist();
    }

    const uploads = [...selectedFiles].map(([role, file]) => ({ role, file }));
    const qaCleanupNonceHash = qaCleanupNonce
      ? createHash('sha256').update(qaCleanupNonce).digest('hex')
      : undefined;
    const payloadHash = await questMediaPayloadHash({
      questId,
      expectedRevision,
      expectedConfigRevision,
      economicChange: campaignEconomicChange,
      taskV2EconomicChange,
      requireDraftPublication: Boolean(
        campaignEconomicChange && existingQuestRecord.revision_of,
      ),
      questPatch: { ...questPatch, ...commandRewardDistribution },
      uploads,
      ...(qaMarker ? { qaMarker } : {}),
      ...(qaCleanupNonceHash ? { qaCleanupNonceHash } : {}),
    });
    const saved = await this.questMediaWrite.execute({
      requestKey,
      payloadHash,
      questId,
      expectedRevision,
      expectedConfigRevision,
      economicChange: campaignEconomicChange,
      taskV2EconomicChange,
      requireDraftPublication: Boolean(
        campaignEconomicChange && existingQuestRecord.revision_of,
      ),
      questPatch,
      uploads,
      ...(economicCommitFence ? { commitFence: economicCommitFence } : {}),
      ...(qaMarker ? { qaMarker } : {}),
      ...(qaCleanupNonceHash ? { qaCleanupNonceHash } : {}),
    });
    return this.adminQuestRecord(saved as any, { canonicalize: true });
  }

  async closeQuest(closeQuestDto: CloseQuestDto) {
    const questId = requireObjectId(closeQuestDto.quest_id, 'quest id');
    const expectedCampaignRevision = closeQuestDto.expected_campaign_revision;
    const updated = await this.questModel
      .findOneAndUpdate(
        this.questMutationFilter(questId, [
          this.revisionClause(
            'campaign_revision',
            expectedCampaignRevision,
            undefined,
          ),
          { publication_status: { $ne: 'draft' } },
          { status: { $ne: 'close' } },
        ]),
        {
          $set: { status: 'close' },
          $inc: { campaign_revision: 1 },
        },
        { new: true },
      )
      .lean();
    if (!updated) {
      throw new ConflictException({
        code: QUEST_CONFIG_REVISION_CONFLICT,
        message:
          'Quest status changed or this revision is still a draft. Reload and try again.',
      });
    }
    return this.adminQuestRecord(
      this.withEffectiveQuestStatus(
        this.withCanonicalQuestTasks(updated as any),
      ),
    );
  }

  async getQuestOpen() {
    const quest = await this.questModel
      .findOne(activeQuestFilter())
      .sort({ start_date: -1, _id: -1 })
      .populate({ path: 'tasks.offer', select: QUEST_TASK_OFFER_SELECT })
      .lean();
    return quest ? this.publicQuestRecord(quest as any) : quest;
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
    return quests.map((quest) =>
      this.adminQuestRecord(
        this.withEffectiveQuestStatus(
          this.withCanonicalQuestTasks(quest as any),
        ),
      ),
    );
  }

  getQuestManagementCapabilities() {
    const revisionWorkflowEnabled = isQuestRevisionWorkflowEnabled();
    return {
      revision_workflow_enabled: revisionWorkflowEnabled,
      direct_create_enabled: !revisionWorkflowEnabled,
    };
  }

  async getQuestSocial(userId: string) {
    const quest = await this.questModel
      .findOne(activeQuestFilter())
      .sort({ start_date: -1, _id: -1 })
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
      quest: this.publicQuestRecord(quest as any),
      socialRewards,
    };
  }
  async questSocial(userId: string, type: string, action: string) {
    if (![type, action].every((value) => /^[^:\s]+$/.test(value?.trim()))) {
      throw new HttpException('Invalid social reward identity', 400);
    }
    const quest = await this.questModel
      .findOne({
        $and: [
          activeQuestFilter(),
          {
            $or: [
              { reward_model: { $exists: false } },
              { reward_model: 'legacy_v1' },
            ],
          },
        ],
        legacy_payout_reconciliation_status: 'ready',
        legacy_payout_reconciliation_version: 1,
      })
      .sort({ start_date: -1, _id: -1 })
      .lean();
    if (!quest) {
      throw new HttpException(
        'There are no active quests right now. Please check back later.',
        400,
      );
    }
    this.assertLegacyPayoutConfigChecksum(quest as any);
    const normalizedType = type.trim();
    const normalizedAction = action.trim();
    const allowlist = legacySocialRewardAllowlist(quest as any);
    if (
      !allowlist.some(
        (pair) =>
          pair.type === normalizedType && pair.action === normalizedAction,
      )
    ) {
      throw new HttpException(
        'Social reward is not configured for this quest',
        400,
      );
    }
    const payoutKey = legacySocialPayoutKey(
      quest._id,
      userId,
      normalizedType,
      normalizedAction,
    );
    const socialReward = await this.socialRewardModel.findOneAndUpdate(
      { legacy_payout_key: payoutKey },
      {
        $setOnInsert: {
          user_id: new Types.ObjectId(userId),
          quest_id: new Types.ObjectId(quest._id),
          reward_status: false,
          type: normalizedType,
          action: normalizedAction,
          legacy_payout_key: payoutKey,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return socialReward?.toObject?.() ?? socialReward;
  }

  async updateQuestSocial(userId: string, id: string) {
    const socialReward = await this.socialRewardModel.findOne({
      _id: new Types.ObjectId(id),
      user_id: new Types.ObjectId(userId),
    });
    if (!socialReward) {
      throw new HttpException('Social reward not found', 404);
    }
    const quest = await this.questModel
      .findOne({
        _id: socialReward.quest_id,
        legacy_payout_reconciliation_status: 'ready',
        legacy_payout_reconciliation_version: 1,
        $or: [
          { reward_model: { $exists: false } },
          { reward_model: 'legacy_v1' },
        ],
      })
      .lean();
    if (!quest) {
      throw new HttpException('Legacy quest rewards are not reconciled', 409);
    }
    this.assertLegacyPayoutConfigChecksum(quest as any);
    const allowlist = legacySocialRewardAllowlist(quest as any);
    if (
      !allowlist.some(
        (pair) =>
          pair.type === socialReward.type &&
          pair.action === socialReward.action,
      )
    ) {
      throw new HttpException('Social reward is not configured', 409);
    }
    const payoutKey = legacySocialPayoutKey(
      socialReward.quest_id,
      userId,
      socialReward.type,
      socialReward.action,
    );
    if (socialReward.legacy_payout_key !== payoutKey) {
      throw new HttpException('Social reward identity mismatch', 409);
    }
    if (socialReward.reward_status) return socialReward;
    const completedClaims = await this.socialRewardModel.countDocuments({
      quest_id: socialReward.quest_id,
      user_id: new Types.ObjectId(userId),
      reward_status: true,
    });
    if (completedClaims >= allowlist.length) {
      throw new HttpException('Social reward campaign cap reached', 409);
    }
    await this.addPointsToUser(
      userId,
      50,
      0,
      `reward_quest_social:${socialReward.type}:${socialReward.action}:${socialReward._id.toString()}`,
      payoutKey,
    );
    const result = await this.socialRewardModel.findOneAndUpdate(
      {
        _id: socialReward._id,
        user_id: new Types.ObjectId(userId),
        legacy_payout_key: payoutKey,
        reward_status: false,
      },
      {
        $set: {
          reward_status: true,
        },
      },
      { new: true },
    );
    if (!result) {
      const winner = await this.socialRewardModel.findOne({
        _id: socialReward._id,
        user_id: new Types.ObjectId(userId),
        legacy_payout_key: payoutKey,
        reward_status: true,
      });
      if (winner) return winner;
      throw new HttpException('Social reward claim changed concurrently', 409);
    }
    return result;
  }

  async getQuestAll() {
    const quest = await this.questModel
      .find({ publication_status: { $ne: 'draft' } })
      .lean();
    if (!quest || quest.length === 0) {
      throw new HttpException(
        'There are no active quests right now. Please check back later.',
        400,
      );
    }
    return quest.map((item) =>
      this.publicQuestRecord(item as any, { canonicalize: true }),
    );
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
    const quest = await this.questModel
      .find({ publication_status: { $ne: 'draft' } })
      .lean();
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
