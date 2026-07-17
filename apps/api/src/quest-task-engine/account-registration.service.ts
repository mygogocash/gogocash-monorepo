import { createHash } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import {
  ClientSession,
  Connection,
  isValidObjectId,
  Model,
  Types,
} from 'mongoose';
import { Point } from 'src/point/schemas/point.schema';
import { assertSamePointLedgerEffect } from 'src/point/point-ledger-idempotency';
import { User, UserDocument } from 'src/user/schemas/user.schema';
import { toIso2Server } from 'src/utils/country';

import {
  assertRegistrationSourceEnabled,
  RegistrationSource,
} from './registration-source.manifest';
import {
  QuestAccountTransition,
  QuestAccountTransitionDocument,
} from './schemas/quest-account-transition.schema';
import {
  QuestOutbox,
  QuestOutboxDocument,
} from './schemas/quest-outbox.schema';
import { QuestTaskTransactionService } from './quest-task-transaction.service';
import { QuestRevisionFenceService } from './quest-revision-fence.service';

export type VerifiedRegistrationInput = {
  source: string;
  user: Record<string, unknown> & { id_firebase: string };
  referral_id?: string;
  occurred_at?: Date;
};

export type VerifiedRegistrationResult = {
  user: UserDocument | Record<string, unknown>;
  created: boolean;
  source_event_id?: string;
  referral_reconciliation_required?: boolean;
};

class BaseReferralWriteError extends Error {
  constructor(readonly cause: unknown) {
    super('Base referral write failed inside registration transaction.');
  }
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, stableValue(child)]),
    );
  }
  return value instanceof Date ? value.toISOString() : value;
}

function payloadHash(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(stableValue(value)))
    .digest('hex');
}

function canonicalizeRegistrationUser<T extends Record<string, unknown>>(
  user: T,
): T {
  if (typeof user.country !== 'string') return user;
  return { ...user, country: toIso2Server(user.country) } as T;
}

@Injectable()
export class AccountRegistrationService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Point.name) private readonly pointModel: Model<Point>,
    @InjectModel(QuestAccountTransition.name)
    private readonly accountTransitionModel: Model<QuestAccountTransitionDocument>,
    @InjectModel(QuestOutbox.name)
    private readonly outboxModel: Model<QuestOutboxDocument>,
    private readonly transactions: QuestTaskTransactionService,
    private readonly revisionFence: QuestRevisionFenceService,
  ) {}

  async registerVerified(
    input: VerifiedRegistrationInput,
  ): Promise<VerifiedRegistrationResult> {
    const source = assertRegistrationSourceEnabled(input.source).source;
    const canonicalInput: VerifiedRegistrationInput = {
      ...input,
      user: canonicalizeRegistrationUser(input.user),
    };
    if (!canonicalInput.user.id_firebase?.trim()) {
      throw new BadRequestException(
        'Verified registration identity is missing.',
      );
    }

    if (!(await this.transactions.durableJournalRequired())) {
      return this.registerLegacyCompatible(canonicalInput, source);
    }

    // Deliberately before startSession and every source mutation. After the
    // rollout fence exists, flag-off stops evaluation but never source-fact
    // journaling. An unprepared standalone Mongo retains legacy auth only.
    await this.transactions.assertReady();
    const preparedInput: VerifiedRegistrationInput = {
      ...canonicalInput,
      user: {
        ...canonicalInput.user,
        _id:
          canonicalInput.user._id instanceof Types.ObjectId
            ? canonicalInput.user._id
            : new Types.ObjectId(),
      },
    };
    try {
      return await this.registerTaskV2Transaction(preparedInput, source, true);
    } catch (error) {
      if (!(error instanceof BaseReferralWriteError)) throw error;
      if (error.cause instanceof ConflictException) throw error.cause;
      // Preserve historical signup availability. The first transaction was
      // aborted, so retry the same deterministic user/transition identity and
      // mark the missing base effect for reconciliation rather than creating a
      // shadow account or emitting a best-effort event.
      return this.registerTaskV2Transaction(preparedInput, source, false);
    }
  }

  private async registerTaskV2Transaction(
    input: VerifiedRegistrationInput,
    source: RegistrationSource,
    writeBaseReferral: boolean,
  ): Promise<VerifiedRegistrationResult> {
    const session = await this.connection.startSession();
    let result: VerifiedRegistrationResult | undefined;
    try {
      await session.withTransaction(async () => {
        const existing = await this.userModel.findOne(
          { id_firebase: input.user.id_firebase },
          null,
          { session },
        );
        if (existing) {
          result = { user: existing, created: false };
          return;
        }

        const userId = input.user._id as Types.ObjectId;
        const referrerId = await this.resolveEligibleReferral(
          input.referral_id,
          userId,
          session,
        );
        const userDocument = {
          ...input.user,
          _id: userId,
          ...(referrerId
            ? { referred_by: referrerId.toHexString() }
            : { referred_by: undefined }),
        };
        const [user] = await this.userModel.create([userDocument], { session });

        let referralReconciliationRequired = false;
        if (referrerId && writeBaseReferral) {
          const baseKey = `referral:base:v1:referrer:${referrerId.toHexString()}:referee:${userId.toHexString()}`;
          const expected = {
            user_id: referrerId,
            referral_id: userId,
            conversion_id: 0,
            point: 50,
            type: 'add',
            action: 'referral',
            idempotency_key: baseKey,
          };
          try {
            await this.pointModel.updateOne(
              { idempotency_key: baseKey },
              { $setOnInsert: expected },
              { upsert: true, session },
            );
            const winner = await this.pointModel.findOne(
              { idempotency_key: baseKey },
              null,
              { session },
            );
            if (!winner) {
              throw new Error('Base referral write produced no ledger row.');
            }
            assertSamePointLedgerEffect(winner, expected);
          } catch (error) {
            throw new BaseReferralWriteError(error);
          }
        } else if (referrerId) {
          referralReconciliationRequired = true;
        }

        const occurredAt = input.occurred_at ?? new Date();
        await this.revisionFence.freezeMatchingInSession(occurredAt, session);
        const sourceEventId = `account:${userId.toHexString()}:created:v1`;
        const transition = {
          transition_id: sourceEventId,
          user_id: userId,
          version: 1,
          registration_source: source,
          ...(referrerId ? { referrer_id: referrerId } : {}),
          occurred_at: occurredAt,
          payload_hash: payloadHash({
            user_id: userId.toHexString(),
            source,
            referrer_id: referrerId?.toHexString() ?? null,
          }),
        };
        await this.accountTransitionModel.create([transition], { session });
        await this.outboxModel.create(
          [
            {
              source_type: 'account_registration',
              source_event_id: sourceEventId,
              aggregate_id: userId.toHexString(),
              event_type: 'account_created',
              transition_version: 1,
              occurred_at: occurredAt,
              payload: {
                user_id: userId.toHexString(),
                registration_source: source,
                referrer_id: referrerId?.toHexString() ?? null,
                base_referral_reconciliation_required:
                  referralReconciliationRequired,
              },
              status: 'pending',
              attempts: 0,
              available_at: occurredAt,
            },
          ],
          { session },
        );
        result = {
          user,
          created: true,
          source_event_id: sourceEventId,
          ...(referralReconciliationRequired
            ? { referral_reconciliation_required: true }
            : {}),
        };
      });
    } finally {
      await session.endSession();
    }

    if (!result) {
      throw new Error('Registration transaction completed without an outcome.');
    }
    return result;
  }

  private async resolveEligibleReferral(
    referralId: string | undefined,
    userId: Types.ObjectId,
    session?: ClientSession,
  ): Promise<Types.ObjectId | undefined> {
    if (!referralId || referralId === 'undefined' || referralId === 'null') {
      return undefined;
    }
    if (!isValidObjectId(referralId)) return undefined;
    const referrerId = new Types.ObjectId(referralId);
    if (referrerId.equals(userId)) return undefined;
    const referrer = await this.userModel.findOne({ _id: referrerId }, null, {
      session,
    });
    return referrer ? referrerId : undefined;
  }

  private async registerLegacyCompatible(
    input: VerifiedRegistrationInput,
    _source: RegistrationSource,
  ): Promise<VerifiedRegistrationResult> {
    const existing = await this.userModel.findOne({
      id_firebase: input.user.id_firebase,
    });
    if (existing) return { user: existing, created: false };

    const requestedId =
      input.user._id instanceof Types.ObjectId
        ? input.user._id
        : new Types.ObjectId();
    const referrerId = await this.resolveEligibleReferral(
      input.referral_id,
      requestedId,
      undefined,
    );
    const user = await this.userModel.findOneAndUpdate(
      { id_firebase: input.user.id_firebase },
      {
        ...input.user,
        _id: requestedId,
        ...(referrerId ? { referred_by: referrerId.toHexString() } : {}),
      },
      { upsert: true, new: true },
    );
    if (referrerId && user?._id) {
      const baseKey = `referral:base:v1:referrer:${referrerId.toHexString()}:referee:${String(user._id)}`;
      try {
        await this.pointModel.updateOne(
          { idempotency_key: baseKey },
          {
            $setOnInsert: {
              user_id: referrerId,
              referral_id: user._id,
              conversion_id: 0,
              point: 50,
              type: 'add',
              action: 'referral',
              idempotency_key: baseKey,
            },
          },
          { upsert: true },
        );
      } catch {
        // Compatibility while task-v2 is off: legacy signup remains available.
      }
    }
    return { user: user as UserDocument, created: true };
  }
}
