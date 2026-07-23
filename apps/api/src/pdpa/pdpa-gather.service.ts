import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { escapeRegexLiteral } from 'src/common/escape-regex';
import { Deeplink } from 'src/involve/schemas/deeplink.schema';
import { AffiliateMintReservation } from 'src/involve/schemas/affiliate-mint-reservation.schema';
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

/** Explicit reservation allowlist: never export hashes, lease fences, or tokens. */
const AFFILIATE_MINT_RESERVATION_EXPORT_FIELDS = [
  'source',
  'offer_id',
  'merchant_id',
  'destination_url',
  'status',
  'tracked_deeplink',
  'provider_started_at',
  'provider_succeeded_at',
  'committed_at',
  'pre_mint_failed_at',
  'created_at',
  'updated_at',
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
  affiliateMintReservations: Record<string, unknown>[];
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
    @InjectModel(AffiliateMintReservation.name)
    private readonly affiliateMintReservationModel: Model<AffiliateMintReservation>,
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
      affiliateMintReservations,
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
      this.affiliateMintReservationModel.find({ user_id: oid }).lean(),
      this.gototrackSettingsModel.findOne({ user_id: userId }).lean(),
    ]);

    return {
      profile,
      myCashbacks: myCashbacks.map((row) => this.stripMyCashbackSecrets(row)),
      withdrawMethods: withdrawMethods as unknown as Record<string, unknown>[],
      withdrawals: withdrawals as unknown as Record<string, unknown>[],
      favoriteOffers: favoriteOffers as unknown as Record<string, unknown>[],
      missionOrders: missionOrders.map((row) =>
        this.pickMissionOrder(row as unknown as Record<string, unknown>),
      ),
      points: points as unknown as Record<string, unknown>[],
      socialRewards: socialRewards as unknown as Record<string, unknown>[],
      deeplinks: deeplinks as unknown as Record<string, unknown>[],
      affiliateMintReservations: affiliateMintReservations.map((row) =>
        this.pickAffiliateMintReservation(
          row as unknown as Record<string, unknown>,
        ),
      ),
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

  private pickAffiliateMintReservation(
    reservation: Record<string, unknown>,
  ): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const key of AFFILIATE_MINT_RESERVATION_EXPORT_FIELDS) {
      if (reservation[key] !== undefined) out[key] = reservation[key];
    }
    return out;
  }

  private pickMissionOrder(
    order: Record<string, any>,
  ): Record<string, unknown> {
    const offer = order.offer_snapshot ?? {};
    const notes = Array.isArray(order.notes) ? order.notes : [];
    const asIso = (value: unknown): string | null => {
      if (!value) return null;
      const date = value instanceof Date ? value : new Date(String(value));
      return Number.isNaN(date.getTime()) ? null : date.toISOString();
    };

    return {
      id: String(order._id ?? ''),
      offerId: String(order.offer_id ?? ''),
      merchantName: String(offer.name ?? ''),
      offerSource: String(offer.source ?? ''),
      providerOfferId: Number.isFinite(Number(offer.provider_offer_id))
        ? Number(offer.provider_offer_id)
        : null,
      orderId: String(order.order_id ?? order.orderId ?? ''),
      orderAmount: Number(order.order_amount ?? order.amount ?? 0),
      currency: String(order.currency ?? 'THB'),
      purchaseDate: asIso(order.purchase_date ?? order.purchaseDate),
      remarks: String(order.remarks ?? order.note ?? ''),
      evidenceRefs: Array.isArray(order.evidence_refs ?? order.attachments)
        ? (order.evidence_refs ?? order.attachments).map(String)
        : [],
      status: order.status === 'investigating' ? 'under_review' : order.status,
      submittedDate: asIso(order.createdAt ?? order.created_at),
      resolvedAt: asIso(order.resolved_at),
      resolutionNote: order.resolution_note
        ? String(order.resolution_note)
        : null,
      rejectionReason: order.rejection_reason
        ? String(order.rejection_reason)
        : null,
      notes: notes.map((note: Record<string, unknown>) => ({
        adminName: String(note.admin_name ?? ''),
        note: String(note.text ?? ''),
        timestamp: asIso(note.created_at ?? note.createdAt),
      })),
      schemaVersion: Number(order.schema_version ?? 1),
    };
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
