import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { User } from 'src/user/schemas/user.schema';
import { Conversion } from 'src/withdraw/schemas/conversion.schema';
import { Withdraw } from 'src/withdraw/schemas/withdraw.schema';
import { WalletAdjustment } from './schemas/wallet-adjustment.schema';
import { WalletAdjustDto } from './dto/wallet.dto';
import { AdminActivityService } from '../activity/admin-activity.service';
import { AdminActor } from '../activity/admin-activity.actor';
import { escapeRegexLiteral } from 'src/common/escape-regex';
import { WithdrawService } from 'src/withdraw/withdraw.service';
import { requireTrimmedString } from 'src/common/mongo-query';

@Injectable()
export class WalletsService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(Conversion.name)
    private readonly conversionModel: Model<Conversion>,
    @InjectModel(Withdraw.name)
    private readonly withdrawModel: Model<Withdraw>,
    @InjectModel(WalletAdjustment.name)
    private readonly walletAdjustmentModel: Model<WalletAdjustment>,
    private readonly adminActivity: AdminActivityService,
    private readonly withdrawService: WithdrawService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async findAll(query: { page?: string; limit?: string; search?: string }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    const search = String(query.search ?? '').trim();
    if (search.length > 100) {
      throw new BadRequestException('search must not exceed 100 characters');
    }
    if (search) {
      const escapedSearch = escapeRegexLiteral(search);
      filter.$or = [
        { email: { $regex: escapedSearch, $options: 'i' } },
        { username: { $regex: escapedSearch, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select('email username country wallet_frozen createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    const data = users.map((u) => ({
      _id: u._id?.toString(),
      email: u.email ?? '',
      username: u.username ?? '',
      country: u.country ?? '',
      wallet_frozen: u.wallet_frozen ?? false,
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

  async findOne(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const user = await this.userModel.findById(userId).lean().exec();
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const objectId = new Types.ObjectId(userId);

    const [conversions, withdrawals, balance] = await Promise.all([
      this.conversionModel
        .find({ user_id: objectId })
        .sort({ datetime_conversion: -1 })
        .limit(20)
        .lean()
        .exec(),
      this.withdrawModel
        .find({ user_id: objectId })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean()
        .exec(),
      this.withdrawService.checkWithdraw(userId),
    ]);

    return {
      wallet: {
        userId: user._id?.toString(),
        userName: user.username ?? '',
        email: user.email ?? '',
        ggcBalance: 0,
        cashbackBalance: Number(balance.netAmountTHB ?? 0),
        pointsBalance: 0,
        status: user.wallet_frozen ? 'frozen' : 'active',
        lastActivity: (user as any).updatedAt ?? (user as any).createdAt ?? '',
      },
      recentTransactions: withdrawals,
      user: {
        _id: user._id?.toString(),
        email: user.email,
        username: user.username,
        country: user.country,
        wallet_frozen: user.wallet_frozen ?? false,
        wallet_frozen_at: (user as any).wallet_frozen_at,
        createdAt: (user as any).createdAt,
      },
      conversions,
      withdrawals,
    };
  }

  async getAdjustments(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const data = await this.walletAdjustmentModel
      .find({ user_id: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return { data };
  }

  async freeze(userId: string, actor: AdminActor) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const user = await this.userModel
      .findByIdAndUpdate(
        userId,
        {
          wallet_frozen: true,
          wallet_frozen_at: new Date(),
        },
        { new: true },
      )
      .lean()
      .exec();

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    await this.adminActivity.append({
      actor_type: 'admin',
      actor_id: actor.id,
      actor_label: actor.label,
      action: 'wallet.frozen',
      entity_type: 'user',
      entity_id: userId,
      summary: 'Froze customer wallet',
      metadata: {},
    });

    return {
      _id: user._id?.toString(),
      wallet_frozen: user.wallet_frozen,
      wallet_frozen_at: (user as any).wallet_frozen_at,
    };
  }

  async unfreeze(userId: string, actor: AdminActor) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const user = await this.userModel
      .findByIdAndUpdate(
        userId,
        {
          wallet_frozen: false,
        },
        { new: true },
      )
      .lean()
      .exec();

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    await this.adminActivity.append({
      actor_type: 'admin',
      actor_id: actor.id,
      actor_label: actor.label,
      action: 'wallet.unfrozen',
      entity_type: 'user',
      entity_id: userId,
      summary: 'Unfroze customer wallet',
      metadata: {},
    });

    return {
      _id: user._id?.toString(),
      wallet_frozen: user.wallet_frozen,
    };
  }

  async adjust(
    userId: string,
    dto: WalletAdjustDto,
    actor: AdminActor,
    idempotencyKeyRaw?: string,
  ) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const type = String(dto.type ?? '')
      .trim()
      .toLowerCase();
    if (type !== 'credit' && type !== 'debit') {
      throw new BadRequestException('type must be credit or debit');
    }
    const amount = Number(dto.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 100_000_000) {
      throw new BadRequestException(
        'amount must be positive and no greater than 100000000',
      );
    }
    const currency = String(dto.currency ?? 'USD')
      .trim()
      .toUpperCase();
    if (currency !== 'USD' && currency !== 'THB') {
      throw new BadRequestException('currency must be THB or USD');
    }
    const reason = String(dto.reason ?? '').trim();
    if (!reason || reason.length > 500) {
      throw new BadRequestException(
        'reason must be between 1 and 500 characters',
      );
    }
    const idempotencyKey = requireTrimmedString(
      idempotencyKeyRaw,
      128,
      'Idempotency-Key header',
    );
    if (!/^[A-Za-z0-9._:-]+$/.test(idempotencyKey)) {
      throw new BadRequestException(
        'The Idempotency-Key header you provided is not valid.',
      );
    }
    const idempotencyEffectHash = createHash('sha256')
      .update(JSON.stringify({ amount, currency, reason, type }))
      .digest('hex');

    const session = await this.connection.startSession();
    let adjustment:
      | Awaited<ReturnType<Model<WalletAdjustment>['create']>>[number]
      | undefined;
    let replayed = false;
    try {
      await session.withTransaction(async () => {
        // Use the same per-user serialization point as withdrawal creation.
        // This orders a debit/credit against every concurrent balance check.
        const user = await this.userModel
          .findOneAndUpdate(
            { _id: new Types.ObjectId(userId) },
            { $inc: { withdraw_lock_seq: 1 } },
            { new: true, session },
          )
          .lean()
          .exec();
        if (!user) {
          throw new NotFoundException(`User ${userId} not found`);
        }

        const existingCommand = await this.walletAdjustmentModel
          .findOne({
            user_id: new Types.ObjectId(userId),
            idempotency_key: idempotencyKey,
          })
          .session(session)
          .exec();
        if (existingCommand) {
          if (
            existingCommand.idempotency_effect_hash !== idempotencyEffectHash
          ) {
            throw new ConflictException(
              'This Idempotency-Key is already bound to a different wallet adjustment.',
            );
          }
          adjustment = existingCommand;
          replayed = true;
          return;
        }

        if (type === 'debit') {
          const balance = await this.withdrawService.checkWithdraw(userId);
          const available = Number(
            currency === 'THB' ? balance.netAmountTHB : balance.netAmount,
          );
          if (!Number.isFinite(available) || amount > available + 1e-6) {
            throw new ConflictException(
              `Debit exceeds available balance (${Math.max(0, available || 0).toFixed(2)} ${currency})`,
            );
          }
        }

        [adjustment] = await this.walletAdjustmentModel.create(
          [
            {
              user_id: new Types.ObjectId(userId),
              type,
              amount,
              currency,
              reason,
              admin_id: actor.id,
              admin_name: actor.label,
              idempotency_key: idempotencyKey,
              idempotency_effect_hash: idempotencyEffectHash,
            },
          ],
          { session },
        );
      });
    } finally {
      await session.endSession();
    }

    if (!adjustment) {
      throw new ConflictException('Wallet adjustment was not committed');
    }

    if (!replayed)
      await this.adminActivity.append({
        actor_type: 'admin',
        actor_id: actor.id,
        actor_label: actor.label,
        action: 'wallet.adjusted',
        entity_type: 'user',
        entity_id: userId,
        summary: `Wallet ${type} ${amount} ${currency}`,
        metadata: {
          adjustment_id: String(adjustment._id),
          type,
          amount,
          currency,
          reason,
        },
      });

    return adjustment.toObject();
  }
}
