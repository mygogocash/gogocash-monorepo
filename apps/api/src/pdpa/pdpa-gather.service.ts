import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { escapeRegexLiteral } from 'src/common/escape-regex';
import { Deeplink } from 'src/involve/schemas/deeplink.schema';
import { FavoriteOffer } from 'src/offer/schemas/favorite-offer.schema';
import { MissionOrder } from 'src/offer/schemas/missing-order.schema';
import { Point } from 'src/point/schemas/point.schema';
import { SocialReward } from 'src/point/schemas/social-reward.schema';
import { GototrackUserSettings } from 'src/gototrack/schemas/gototrack-user-settings.schema';
import { User } from 'src/user/schemas/user.schema';
import { UserMyCashback } from 'src/user/schemas/user-my-cashback.schema';
import { Withdraw } from 'src/withdraw/schemas/withdraw.schema';
import { WithdrawMethod } from 'src/withdraw/schemas/withdrawMethod.schema';

/** Explicit allowlist — never dump the full User document (lock seq, etc.). */
const PROFILE_EXPORT_FIELDS = [
  'email',
  'username',
  'mobile',
  'address',
  'birthdate',
  'gender',
  'country',
  'id_card',
  'passport',
  'legal_address',
  'state',
  'city',
  'zip',
  'email_mcb',
  'avatar_url',
  'id_firebase',
  'id_twitter',
  'id_telegram',
  'id_line',
  'id_crossmint',
  'consent',
  'wallet_frozen',
  'wallet_frozen_at',
  'credit_score',
  'credit_tier',
  'privilege',
  'referral_code',
  'referred_by',
  'provider',
  'email_verified',
  'createdAt',
  'updatedAt',
] as const;

export type PdpaDataBundle = {
  profile: Record<string, unknown>;
  myCashbacks: Record<string, unknown>[];
  withdrawMethods: Record<string, unknown>[];
  withdrawals: Record<string, unknown>[];
  favoriteOffers: Record<string, unknown>[];
  missionOrders: Record<string, unknown>[];
  points: Record<string, unknown>[];
  socialRewards: Record<string, unknown>[];
  deeplinks: Record<string, unknown>[];
  gototrackSettings: Record<string, unknown> | null;
};

@Injectable()
export class PdpaGatherService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(UserMyCashback.name)
    private readonly myCashbackModel: Model<UserMyCashback>,
    @InjectModel(WithdrawMethod.name)
    private readonly withdrawMethodModel: Model<WithdrawMethod>,
    @InjectModel(Withdraw.name) private readonly withdrawModel: Model<Withdraw>,
    @InjectModel(FavoriteOffer.name)
    private readonly favoriteOfferModel: Model<FavoriteOffer>,
    @InjectModel(MissionOrder.name)
    private readonly missionOrderModel: Model<MissionOrder>,
    @InjectModel(Point.name) private readonly pointModel: Model<Point>,
    @InjectModel(SocialReward.name)
    private readonly socialRewardModel: Model<SocialReward>,
    @InjectModel(Deeplink.name) private readonly deeplinkModel: Model<Deeplink>,
    @InjectModel(GototrackUserSettings.name)
    private readonly gototrackSettingsModel: Model<GototrackUserSettings>,
  ) {}

  async gatherForUser(userId: string): Promise<PdpaDataBundle> {
    const user = await this.userModel
      .findOne({ _id: new Types.ObjectId(userId) })
      .lean();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const oid = new Types.ObjectId(userId);
    const profile = this.pickProfile(
      user as unknown as Record<string, unknown>,
    );

    const [
      myCashbacks,
      withdrawMethods,
      withdrawals,
      favoriteOffers,
      missionOrders,
      points,
      socialRewards,
      deeplinks,
      gototrackSettings,
    ] = await Promise.all([
      this.findMyCashbacks(
        user as {
          email?: string;
          mobile?: string;
          email_mcb?: string;
        },
      ),
      this.withdrawMethodModel.find({ user_id: oid }).lean(),
      this.withdrawModel.find({ user_id: oid }).lean(),
      this.favoriteOfferModel.find({ user_id: oid }).lean(),
      this.missionOrderModel.find({ user_id: oid }).lean(),
      this.pointModel.find({ user_id: oid }).lean(),
      this.socialRewardModel.find({ user_id: oid }).lean(),
      this.deeplinkModel.find({ user_id: oid }).lean(),
      this.gototrackSettingsModel.findOne({ user_id: userId }).lean(),
    ]);

    return {
      profile,
      myCashbacks: myCashbacks.map((row) => this.stripMyCashbackSecrets(row)),
      withdrawMethods: withdrawMethods as unknown as Record<string, unknown>[],
      withdrawals: withdrawals as unknown as Record<string, unknown>[],
      favoriteOffers: favoriteOffers as unknown as Record<string, unknown>[],
      missionOrders: missionOrders as unknown as Record<string, unknown>[],
      points: points as unknown as Record<string, unknown>[],
      socialRewards: socialRewards as unknown as Record<string, unknown>[],
      deeplinks: deeplinks as unknown as Record<string, unknown>[],
      gototrackSettings:
        (gototrackSettings as unknown as Record<string, unknown>) ?? null,
    };
  }

  private pickProfile(user: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const key of PROFILE_EXPORT_FIELDS) {
      if (user[key] !== undefined) {
        out[key] = user[key];
      }
    }
    return out;
  }

  private async findMyCashbacks(user: {
    email?: string;
    mobile?: string;
    email_mcb?: string;
  }): Promise<Record<string, unknown>[]> {
    const or: Record<string, unknown>[] = [];
    if (user.email) {
      or.push({
        email: {
          $regex: `^${escapeRegexLiteral(user.email)}$`,
          $options: 'i',
        },
      });
    }
    if (user.email_mcb) {
      or.push({
        email: {
          $regex: `^${escapeRegexLiteral(user.email_mcb)}$`,
          $options: 'i',
        },
      });
    }
    if (user.mobile) {
      or.push({ phoneNumber: user.mobile });
      const mobileData = user.mobile.includes('+66')
        ? user.mobile.slice(3).trim()
        : user.mobile.trim();
      if (mobileData.length > 0) {
        or.push({ phoneNumber: `0${mobileData}` });
      }
    }
    if (or.length === 0) {
      return [];
    }
    return (await this.myCashbackModel
      .find({ $or: or })
      .lean()) as unknown as Record<string, unknown>[];
  }

  private stripMyCashbackSecrets(
    row: Record<string, unknown>,
  ): Record<string, unknown> {
    const { buyerToken: _t, withdrawalPassword: _p, ...rest } = row;
    return rest;
  }
}
