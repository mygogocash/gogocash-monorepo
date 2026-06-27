import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  mongoCaseInsensitiveRegex,
  mongoEq,
  mongoFilter,
  requireFiniteNumber,
  requireObjectId,
} from 'src/common/mongo-query';
import { User } from 'src/user/schemas/user.schema';
import { Conversion } from 'src/withdraw/schemas/conversion.schema';
import { CreditScoreConfig } from './schemas/credit-score-config.schema';
import { CreditScoreAudit } from './schemas/credit-score-audit.schema';
import { UpdateCreditScoreConfigDto } from './dto/credit-score.dto';

export interface ScoreBreakdown {
  conversion_count: number;
  total_spend: number;
  referral_count: number;
  account_age_days: number;
  weighted_conversion: number;
  weighted_spend: number;
  weighted_referral: number;
  weighted_age: number;
  raw_total: number;
  final_score: number;
}

@Injectable()
export class CreditScoresService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(CreditScoreConfig.name)
    private readonly creditScoreConfigModel: Model<CreditScoreConfig>,
    @InjectModel(CreditScoreAudit.name)
    private readonly creditScoreAuditModel: Model<CreditScoreAudit>,
    @InjectModel(Conversion.name)
    private readonly conversionModel: Model<Conversion>,
  ) {}

  async findAll(query: {
    page?: string;
    limit?: string;
    search?: string;
    tier?: string;
    minScore?: string;
    maxScore?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (query.search) {
      const searchRegex = mongoCaseInsensitiveRegex(query.search);
      filter.$or = [{ email: searchRegex }, { username: searchRegex }];
    }

    if (query.tier) {
      filter.credit_tier = mongoEq(query.tier.trim());
    }

    const minScore =
      query.minScore !== undefined && query.minScore !== ''
        ? requireFiniteNumber(query.minScore, 'min score')
        : undefined;
    const maxScore =
      query.maxScore !== undefined && query.maxScore !== ''
        ? requireFiniteNumber(query.maxScore, 'max score')
        : undefined;

    if (minScore !== undefined && maxScore !== undefined) {
      filter.credit_score = { $gte: minScore, $lte: maxScore };
    } else if (minScore !== undefined) {
      filter.credit_score = { $gte: minScore };
    } else if (maxScore !== undefined) {
      filter.credit_score = { $lte: maxScore };
    }

    const [users, total] = await Promise.all([
      this.userModel
        .find(mongoFilter(filter))
        .select('email username credit_score credit_tier createdAt')
        .sort({ credit_score: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.userModel.countDocuments(mongoFilter(filter)).exec(),
    ]);

    const data = users.map((u) => ({
      _id: u._id?.toString(),
      email: u.email ?? '',
      username: u.username ?? '',
      credit_score: u.credit_score ?? 0,
      credit_tier: u.credit_tier ?? 'none',
      createdAt: (u as any).createdAt,
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getConfig() {
    const existing = await this.creditScoreConfigModel.findOne().lean().exec();

    if (existing) {
      return existing;
    }

    // Create default config (singleton)
    const created = await this.creditScoreConfigModel.create({
      tiers: [
        {
          name: 'Bronze',
          min_score: 0,
          max_score: 200,
          color: '#CD7F32',
          benefits: ['Basic cashback'],
        },
        {
          name: 'Silver',
          min_score: 201,
          max_score: 500,
          color: '#C0C0C0',
          benefits: ['Basic cashback', 'Priority support'],
        },
        {
          name: 'Gold',
          min_score: 501,
          max_score: 800,
          color: '#FFD700',
          benefits: [
            'Enhanced cashback',
            'Priority support',
            'Exclusive offers',
          ],
        },
        {
          name: 'Platinum',
          min_score: 801,
          max_score: 1000,
          color: '#E5E4E2',
          benefits: [
            'Maximum cashback',
            'VIP support',
            'Exclusive offers',
            'Early access',
          ],
        },
      ],
      weights: {
        conversion_count: 0.25,
        total_spend: 0.25,
        referral_count: 0.25,
        account_age_days: 0.25,
      },
      max_score: 1000,
    });

    return created.toObject();
  }

  async updateConfig(data: UpdateCreditScoreConfigDto) {
    const patch: Partial<UpdateCreditScoreConfigDto> = {};
    if (data.tiers !== undefined) patch.tiers = data.tiers;
    if (data.weights !== undefined) patch.weights = data.weights;
    if (data.max_score !== undefined) patch.max_score = data.max_score;

    const config = await this.creditScoreConfigModel
      .findOneAndUpdate({}, { $set: patch }, { new: true, upsert: true })
      .lean()
      .exec();

    return config;
  }

  async getUserDetail(userId: string) {
    const userObjectId = requireObjectId(userId, 'user id');

    const user = await this.userModel.findById(userObjectId).lean().exec();
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const breakdown = await this.calculateScore(userObjectId.toHexString());

    return {
      user: {
        _id: user._id?.toString(),
        email: user.email,
        username: user.username,
        credit_score: user.credit_score ?? 0,
        credit_tier: user.credit_tier ?? 'none',
        createdAt: (user as any).createdAt,
      },
      breakdown,
    };
  }

  async getAudit(userId: string) {
    const userObjectId = requireObjectId(userId, 'user id');

    return this.creditScoreAuditModel
      .find({ user_id: userObjectId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async override(
    userId: string,
    newScore: number,
    reason: string,
    adminId: string,
  ) {
    const userObjectId = requireObjectId(userId, 'user id');

    const user = await this.userModel.findById(userObjectId).lean().exec();
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const config = await this.getConfig();
    const previousScore = user.credit_score ?? 0;
    const previousTier = user.credit_tier ?? 'none';
    const newTier = this.determineTier(newScore, config.tiers);

    await this.userModel
      .findByIdAndUpdate(userObjectId, {
        $set: {
          credit_score: newScore,
          credit_tier: newTier,
        },
      })
      .exec();

    const audit = await this.creditScoreAuditModel.create({
      user_id: userObjectId,
      previous_score: previousScore,
      new_score: newScore,
      previous_tier: previousTier,
      new_tier: newTier,
      change_type: 'manual_override',
      reason,
      admin_id: adminId,
      score_breakdown: {},
    });

    return audit.toObject();
  }

  private async calculateScore(userId: string): Promise<ScoreBreakdown> {
    const objectId = new Types.ObjectId(userId);

    const config = await this.getConfig();
    const { weights, max_score } = config;

    const [user, conversionCount, spendResult, referralCount] =
      await Promise.all([
        this.userModel.findById(userId).lean().exec(),
        this.conversionModel.countDocuments({ user_id: objectId }).exec(),
        this.conversionModel
          .aggregate([
            { $match: { user_id: objectId } },
            { $group: { _id: null, total: { $sum: '$sale_amount' } } },
          ])
          .exec(),
        this.userModel.countDocuments({ referred_by: userId }).exec(),
      ]);

    const totalSpend = spendResult.length > 0 ? (spendResult[0].total ?? 0) : 0;

    const accountCreated = (user as any)?.createdAt
      ? new Date((user as any).createdAt)
      : new Date();
    const accountAgeDays = Math.max(
      0,
      Math.floor(
        (Date.now() - accountCreated.getTime()) / (1000 * 60 * 60 * 24),
      ),
    );

    // Normalize each factor to 0-1 range using sensible caps
    const normalizedConversion = Math.min(conversionCount / 100, 1);
    const normalizedSpend = Math.min(totalSpend / 100000, 1);
    const normalizedReferral = Math.min(referralCount / 50, 1);
    const normalizedAge = Math.min(accountAgeDays / 365, 1);

    const weightedConversion =
      normalizedConversion * (weights.conversion_count ?? 0.25);
    const weightedSpend = normalizedSpend * (weights.total_spend ?? 0.25);
    const weightedReferral =
      normalizedReferral * (weights.referral_count ?? 0.25);
    const weightedAge = normalizedAge * (weights.account_age_days ?? 0.25);

    const rawTotal =
      weightedConversion + weightedSpend + weightedReferral + weightedAge;

    const finalScore = Math.round(rawTotal * max_score);

    return {
      conversion_count: conversionCount,
      total_spend: totalSpend,
      referral_count: referralCount,
      account_age_days: accountAgeDays,
      weighted_conversion: weightedConversion,
      weighted_spend: weightedSpend,
      weighted_referral: weightedReferral,
      weighted_age: weightedAge,
      raw_total: rawTotal,
      final_score: finalScore,
    };
  }

  private determineTier(
    score: number,
    tiers: Array<{ name: string; min_score: number; max_score: number }>,
  ): string {
    for (const tier of tiers) {
      if (score >= tier.min_score && score <= tier.max_score) {
        return tier.name;
      }
    }
    return 'none';
  }
}
