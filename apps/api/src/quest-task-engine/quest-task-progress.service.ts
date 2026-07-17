import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, isValidObjectId, Model, Types } from 'mongoose';
import {
  CanonicalQuestTask,
  canonicalizeStoredQuestTask,
  QuestTaskProgressResponse,
} from 'src/point/quest-task.contract';
import { assertSamePointLedgerEffect } from 'src/point/point-ledger-idempotency';
import { Point } from 'src/point/schemas/point.schema';
import { Quest, QuestDocument } from 'src/point/schemas/quest.schema';
import { User } from 'src/user/schemas/user.schema';
import { Membership } from 'src/admin/membership/schemas/membership.schema';

import { QuestEngineFailureInjectionHook } from './quest-engine-failure-injection.hook';
import { canonicalConversionIdentity } from './conversion-provider-identity';
import {
  completedFxReferenceDate,
  QUEST_FX_RATE_PROVIDER,
  QuestFxRateProvider,
} from './quest-fx-rate.provider';
import {
  transitionQuestProgress,
  QuestProgressState,
} from './quest-progress-state';
import {
  QuestContribution,
  QuestContributionDocument,
} from './schemas/quest-contribution.schema';
import {
  QuestConversionState,
  QuestConversionStateDocument,
} from './schemas/quest-conversion-state.schema';
import {
  QuestEventIngestion,
  QuestEventIngestionDocument,
} from './schemas/quest-event-ingestion.schema';
import { QuestOutboxDocument } from './schemas/quest-outbox.schema';
import {
  QuestTaskProgress,
  QuestTaskProgressDocument,
} from './schemas/quest-task-progress.schema';

type ConversionEventPayload = {
  event_type: string;
  occurred_at?: Date | string;
  transition_version?: number;
  source?: string;
  provider_account?: string;
  provider_conversion_id?: string;
  current?: Record<string, unknown>;
  previous?: Record<string, unknown>;
};

export class QuestFxUnavailableError extends Error {
  readonly code = 'QUEST_FX_UNAVAILABLE';

  constructor(currency: string) {
    super(`No immutable THB FX quote is available for ${currency}.`);
  }
}

export function questAwardIdentity(
  questId: string,
  taskKey: string,
  beneficiaryId: string,
  refereeId?: string,
): string {
  return refereeId
    ? `quest:${questId}:task:${taskKey}:referrer:${beneficiaryId}:referee:${refereeId}`
    : `quest:${questId}:task:${taskKey}:user:${beneficiaryId}`;
}

function numeric(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function objectId(value: unknown): Types.ObjectId | undefined {
  if (value instanceof Types.ObjectId) return value;
  const string = String(value ?? '');
  return isValidObjectId(string) ? new Types.ObjectId(string) : undefined;
}

function isEarningEligible(snapshot: Record<string, unknown> | undefined) {
  return (
    String(snapshot?.conversion_status ?? '').toLowerCase() === 'approved' &&
    numeric(snapshot?.sale_amount) > 0 &&
    numeric(snapshot?.payout) > 0
  );
}

function validDate(value: unknown): Date | undefined {
  const parsed = value instanceof Date ? value : new Date(String(value ?? ''));
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

type MembershipAudienceRecord = {
  tier_id?: unknown;
  tier_assignment_started_at?: unknown;
  status?: unknown;
  start_date?: unknown;
  end_date?: unknown;
  cancelled_at?: unknown;
};

function canonicalAudienceTierIds(values: unknown): string[] | null {
  if (!Array.isArray(values) || values.length === 0) return null;
  const ids = values.map((value) => String(value).trim().toLowerCase());
  if (ids.some((value) => !/^[a-f0-9]{24}$/.test(value))) return null;
  return [...new Set(ids)].sort();
}

/** Evaluates the current tier assignment at an immutable event/read time. */
export function membershipQualifiesAt(
  membership: MembershipAudienceRecord | null | undefined,
  configuredTierIds: unknown,
  at: Date,
): boolean {
  if (!membership) return false;
  const tierIds = canonicalAudienceTierIds(configuredTierIds);
  const evaluatedAt = validDate(at);
  const memberTierId = String(membership.tier_id ?? '')
    .trim()
    .toLowerCase();
  const assignmentStartedAt = validDate(membership.tier_assignment_started_at);
  const start = validDate(membership.start_date);
  const end = validDate(membership.end_date);
  if (
    !tierIds ||
    !evaluatedAt ||
    !/^[a-f0-9]{24}$/.test(memberTierId) ||
    !tierIds.includes(memberTierId) ||
    !assignmentStartedAt ||
    !start ||
    !end ||
    assignmentStartedAt > evaluatedAt ||
    start > evaluatedAt ||
    end < evaluatedAt
  ) {
    return false;
  }

  const status = String(membership.status ?? '')
    .trim()
    .toLowerCase();
  const hasCancellationValue =
    membership.cancelled_at !== undefined && membership.cancelled_at !== null;
  const cancelledAt = hasCancellationValue
    ? validDate(membership.cancelled_at)
    : undefined;
  if (hasCancellationValue && (!cancelledAt || cancelledAt <= evaluatedAt)) {
    return false;
  }
  if (status === 'active') return true;
  if (status === 'cancelled') return Boolean(cancelledAt);
  if (status === 'expired') return true;
  return false;
}

export function questEventSelectionDate(
  sourceType: string,
  payload: Record<string, unknown>,
  transitionOccurredAt: Date,
): Date {
  if (sourceType !== 'affiliate_conversion') return transitionOccurredAt;
  const current = payload.current as Record<string, unknown> | undefined;
  return validDate(current?.datetime_conversion) ?? transitionOccurredAt;
}

export function requalificationCanAward(
  event: Pick<ConversionEventPayload, 'event_type' | 'occurred_at'>,
  questEnd: Date,
): boolean {
  if (event.event_type !== 'requalified') return true;
  const occurredAt = validDate(event.occurred_at);
  return Boolean(occurredAt && occurredAt <= questEnd);
}

export function conversionTransitionPolicy(
  event: Pick<ConversionEventPayload, 'event_type' | 'current' | 'occurred_at'>,
  questEnd: Date,
  audienceEligible: boolean,
  previousActiveValue: number,
  everAudienceQualified: boolean,
) {
  const previouslyActive = previousActiveValue > 0;
  const currentlyEarning =
    event.event_type !== 'reversed' && isEarningEligible(event.current);
  const requalificationWindowOpen = requalificationCanAward(event, questEnd);
  return {
    currentlyEarning,
    shouldEvaluateContribution:
      !currentlyEarning ||
      previouslyActive ||
      ((audienceEligible || everAudienceQualified) &&
        requalificationWindowOpen),
    audienceQualificationDenied:
      currentlyEarning &&
      !previouslyActive &&
      !everAudienceQualified &&
      !audienceEligible,
    requalificationWindowExpired:
      currentlyEarning && !previouslyActive && !requalificationWindowOpen,
  };
}

export async function contributionFromConversion(
  event: Pick<ConversionEventPayload, 'event_type' | 'current' | 'occurred_at'>,
  fx: Pick<QuestFxRateProvider, 'quoteToThb'>,
  previousActiveThbMinor: number,
) {
  if (event.event_type === 'reversed') {
    return {
      delta_thb_minor: -previousActiveThbMinor,
      active_thb_minor: 0,
      snapshot: {
        normalized_thb_minor: 0,
        reversal_of_thb_minor: previousActiveThbMinor,
      },
    };
  }
  if (!isEarningEligible(event.current)) {
    return {
      delta_thb_minor: -previousActiveThbMinor,
      active_thb_minor: 0,
      snapshot: {
        normalized_thb_minor: 0,
        disqualified_thb_minor: previousActiveThbMinor,
      },
    };
  }

  const amount = numeric(event.current?.sale_amount);
  const currency = String(event.current?.currency ?? 'THB').toUpperCase();
  const occurredAt = new Date(String(event.occurred_at ?? ''));
  if (Number.isNaN(occurredAt.getTime())) {
    throw new Error('Conversion transition occurred_at is required for FX.');
  }
  const quote =
    currency === 'THB'
      ? { rate: 1, as_of: occurredAt, source: 'identity:THB' }
      : await fx.quoteToThb(currency, occurredAt);
  if (!quote) throw new QuestFxUnavailableError(currency);
  const originalAmountMinor = Math.round(amount * 100);
  const normalized = Math.round(amount * quote.rate * 100);
  return {
    delta_thb_minor: normalized - previousActiveThbMinor,
    active_thb_minor: normalized,
    snapshot: {
      original_amount_minor: originalAmountMinor,
      original_currency: currency,
      fx_rate_to_thb: quote.rate,
      fx_as_of: quote.as_of,
      fx_source: quote.source,
      normalized_thb_minor: normalized,
    },
  };
}

export function memoizeQuestFxRateProviderForEvent(
  provider: QuestFxRateProvider,
): QuestFxRateProvider {
  const quotes = new Map<
    string,
    ReturnType<QuestFxRateProvider['quoteToThb']>
  >();
  return {
    quoteToThb(currency: string, at: Date) {
      const normalized = currency.trim().toUpperCase();
      const referenceDate = completedFxReferenceDate(at) ?? 'invalid';
      const key = `${normalized}:${referenceDate}`;
      let quote = quotes.get(key);
      if (!quote) {
        quote = provider.quoteToThb(normalized, at);
        quotes.set(key, quote);
      }
      return quote;
    },
  };
}

export function matchesBrandPurchaseTask(
  task: Pick<CanonicalQuestTask, 'task_type'> & {
    offer_id?: number;
    merchant_id?: number;
  },
  conversion: Record<string, unknown>,
): boolean {
  return (
    task.task_type === 'brand_purchase' &&
    Number(task.offer_id) === numeric(conversion.offer_id) &&
    Number(task.merchant_id) === numeric(conversion.merchant_id)
  );
}

type EffectContext = {
  quest: Quest & { _id: Types.ObjectId };
  task: CanonicalQuestTask;
  beneficiaryId: Types.ObjectId;
  refereeId?: Types.ObjectId;
  scopeKey: string;
  target: number;
  sourceAggregateId: string;
  conversion?: ConversionEventPayload;
};

function canonicalTaskForQuest(
  quest: Quest & { _id: Types.ObjectId },
  raw: unknown,
): CanonicalQuestTask {
  const documentLike = raw as {
    toObject?: () => Record<string, unknown>;
  };
  const record =
    typeof documentLike.toObject === 'function'
      ? documentLike.toObject()
      : (raw as Record<string, unknown>);
  return canonicalizeStoredQuestTask(
    String(quest._id),
    record,
    quest.reward_model,
  ) as unknown as CanonicalQuestTask;
}

export function customerOffer(task: CanonicalQuestTask) {
  if (task.task_type !== 'brand_purchase') return undefined;
  const populated =
    task.offer && typeof task.offer === 'object'
      ? (task.offer as Record<string, unknown>)
      : undefined;
  const id = String(populated?._id ?? task.offer ?? '');
  const logo =
    populated?.logo_desktop ??
    populated?.logo_mobile ??
    populated?.logo_circle ??
    populated?.logo;
  return {
    id,
    name: String(populated?.offer_name_display ?? populated?.offer_name ?? ''),
    ...(logo ? { logo_url: String(logo) } : {}),
    ...(id ? { shop_path: `/shop/${encodeURIComponent(id)}` } : {}),
  };
}

@Injectable()
export class QuestTaskProgressService {
  constructor(
    @InjectModel(Quest.name) private readonly questModel: Model<QuestDocument>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Membership.name)
    private readonly membershipModel: Model<Membership>,
    @InjectModel(Point.name) private readonly pointModel: Model<Point>,
    @InjectModel(QuestEventIngestion.name)
    private readonly ingestionModel: Model<QuestEventIngestionDocument>,
    @InjectModel(QuestTaskProgress.name)
    private readonly progressModel: Model<QuestTaskProgressDocument>,
    @InjectModel(QuestContribution.name)
    private readonly contributionModel: Model<QuestContributionDocument>,
    @InjectModel(QuestConversionState.name)
    private readonly conversionStateModel: Model<QuestConversionStateDocument>,
    @Inject(QUEST_FX_RATE_PROVIDER)
    private readonly fx: QuestFxRateProvider,
    private readonly failureHook: QuestEngineFailureInjectionHook,
  ) {}

  async applyOutboxInSession(
    outbox: QuestOutboxDocument | Record<string, unknown>,
    session: ClientSession,
  ): Promise<Record<string, unknown>> {
    const sourceType = String(outbox.source_type);
    const sourceEventId = String(outbox.source_event_id);
    const payload = (outbox.payload ?? {}) as Record<string, unknown>;
    if (
      sourceType === 'account_registration' &&
      payload.base_referral_reconciliation_required === true
    ) {
      await this.reconcileBaseReferralInSession(payload, session);
      await this.failureHook.afterStage('after_base_referral_reconciliation');
    }
    const existing = await this.ingestionModel.findOne(
      { source_type: sourceType, source_event_id: sourceEventId },
      null,
      { session },
    );
    if (
      existing &&
      ['completed', 'ignored', 'quarantined'].includes(existing.status)
    ) {
      return { duplicate: true, ...(existing.outcome ?? {}) };
    }
    if (!existing) {
      await this.ingestionModel.create(
        [
          {
            source_type: sourceType,
            source_event_id: sourceEventId,
            status: 'processing',
          },
        ],
        { session },
      );
    } else {
      await this.ingestionModel.updateOne(
        { _id: existing._id },
        { $set: { status: 'processing' }, $unset: { error_code: 1 } },
        { session },
      );
    }
    await this.failureHook.afterStage('after_ingestion_claim');

    const occurredAt = validDate(outbox.occurred_at);
    if (!occurredAt) throw new Error('Quest outbox occurred_at is invalid.');
    // Account events select by account creation. Conversion events select by
    // immutable purchase time, so a pending conversion purchased in-window can
    // approve (and later reverse/correct) after the campaign has ended.
    const selectionAt = questEventSelectionDate(
      sourceType,
      payload,
      occurredAt,
    );
    const candidates = await this.questModel.find(
      {
        reward_model: 'task_v2',
        start_date: { $lte: selectionAt },
        end_date: { $gte: selectionAt },
      },
      null,
      { session },
    );
    const eventFx = memoizeQuestFxRateProviderForEvent(this.fx);
    const outcomes: Array<Record<string, unknown>> = [];
    for (const candidate of candidates) {
      const quest = await this.adoptQuestRevision(candidate, session);
      if (
        selectionAt < new Date(quest.start_date) ||
        selectionAt > new Date(quest.end_date)
      ) {
        continue;
      }
      const tasks = (quest.tasks ?? []).map((task) =>
        canonicalTaskForQuest(quest, task),
      );
      for (const task of tasks) {
        if (!task.enabled) continue;
        const effect = await this.effectForEvent(
          quest,
          task,
          sourceType,
          String(outbox.aggregate_id),
          payload,
          session,
        );
        if (!effect) continue;
        const audienceEligible = await this.isAudienceEligible(
          quest,
          effect.beneficiaryId,
          occurredAt,
          session,
        );
        if (!effect.conversion && !audienceEligible) {
          continue;
        }
        const outcome = await this.applyEffect(
          effect,
          sourceType,
          sourceEventId,
          Number(outbox.transition_version),
          audienceEligible,
          session,
          eventFx,
        );
        if (outcome) outcomes.push(outcome);
      }
    }

    const status = outcomes.length > 0 ? 'completed' : 'ignored';
    const outcome = { effects: outcomes, effect_count: outcomes.length };
    await this.ingestionModel.updateOne(
      { source_type: sourceType, source_event_id: sourceEventId },
      { $set: { status, outcome, completed_at: new Date() } },
      { session },
    );
    await this.failureHook.afterStage('after_outcome_update');
    return outcome;
  }

  private async reconcileBaseReferralInSession(
    payload: Record<string, unknown>,
    session: ClientSession,
  ): Promise<void> {
    const referrerId = objectId(payload.referrer_id);
    const refereeId = objectId(payload.user_id);
    if (!referrerId || !refereeId || referrerId.equals(refereeId)) {
      throw new Error(
        'Base referral reconciliation marker has invalid referral identities.',
      );
    }
    const idempotencyKey = `referral:base:v1:referrer:${referrerId.toHexString()}:referee:${refereeId.toHexString()}`;
    const expected = {
      user_id: referrerId,
      referral_id: refereeId,
      conversion_id: 0,
      point: 50,
      type: 'add',
      action: 'referral',
      idempotency_key: idempotencyKey,
    };
    await this.pointModel.updateOne(
      { idempotency_key: idempotencyKey },
      { $setOnInsert: expected },
      { upsert: true, session },
    );
    const winner = await this.pointModel.findOne(
      { idempotency_key: idempotencyKey },
      null,
      { session },
    );
    if (!winner) {
      throw new Error('Base referral reconciliation produced no ledger row.');
    }
    assertSamePointLedgerEffect(winner, expected);
  }

  private async adoptQuestRevision(
    candidate: QuestDocument,
    session: ClientSession,
  ): Promise<QuestDocument> {
    let quest = candidate;
    for (let attempts = 0; attempts < 5; attempts += 1) {
      if (quest.task_v2_state_frozen_at) return quest;
      const revision = Number(quest.config_revision ?? 0);
      const adopted = await this.questModel.updateOne(
        {
          _id: quest._id,
          reward_model: 'task_v2',
          config_revision: revision,
          $or: [
            { task_v2_state_frozen_at: { $exists: false } },
            { task_v2_state_frozen_at: null },
            { task_v2_state_frozen_revision: revision },
          ],
        },
        {
          $set: {
            task_v2_state_frozen_at: new Date(),
            task_v2_state_frozen_revision: revision,
            task_v2_state_frozen_reason: 'outbox',
          },
        },
        { session },
      );
      if (adopted.matchedCount === 1) {
        quest.task_v2_state_frozen_at = new Date();
        quest.task_v2_state_frozen_revision = revision;
        quest.task_v2_state_frozen_reason = 'outbox';
        return quest;
      }
      const current = await this.questModel.findById(quest._id, null, {
        session,
      });
      if (!current) throw new Error(`Quest ${String(quest._id)} disappeared.`);
      quest = current;
    }
    throw new Error(
      `Quest ${String(candidate._id)} config fence did not converge.`,
    );
  }

  private async effectForEvent(
    quest: Quest & { _id: Types.ObjectId },
    task: CanonicalQuestTask,
    sourceType: string,
    sourceAggregateId: string,
    payload: Record<string, unknown>,
    session: ClientSession,
  ): Promise<EffectContext | null> {
    if (sourceType === 'account_registration') {
      if (
        task.task_type !== 'friend_referral' ||
        task.completion_rule !== 'account_created'
      ) {
        return null;
      }
      const beneficiaryId = objectId(payload.referrer_id);
      const refereeId = objectId(payload.user_id);
      if (!beneficiaryId || !refereeId || beneficiaryId.equals(refereeId)) {
        return null;
      }
      return {
        quest,
        task,
        beneficiaryId,
        refereeId,
        scopeKey: `referrer:${beneficiaryId.toHexString()}:referee:${refereeId.toHexString()}`,
        target: 1,
        sourceAggregateId,
      };
    }

    if (sourceType !== 'affiliate_conversion') return null;
    const conversion = payload as ConversionEventPayload;
    const current = conversion.current ?? {};
    const userId = objectId(current.user_id);
    if (!userId) return null;
    if (task.task_type === 'brand_purchase') {
      if (!matchesBrandPurchaseTask(task, current)) {
        return null;
      }
      return {
        quest,
        task,
        beneficiaryId: userId,
        scopeKey: `user:${userId.toHexString()}`,
        target: 1,
        sourceAggregateId,
        conversion,
      };
    }
    if (task.task_type === 'spend_target') {
      return {
        quest,
        task,
        beneficiaryId: userId,
        scopeKey: `user:${userId.toHexString()}`,
        target: task.target_thb_minor,
        sourceAggregateId,
        conversion,
      };
    }
    if (task.completion_rule !== 'first_earning_conversion') return null;
    const referee = (await this.userModel.findById(userId, null, {
      session,
    })) as unknown as { referred_by?: string } | null;
    const beneficiaryId = objectId(referee?.referred_by);
    if (!beneficiaryId || beneficiaryId.equals(userId)) return null;
    return {
      quest,
      task,
      beneficiaryId,
      refereeId: userId,
      scopeKey: `referrer:${beneficiaryId.toHexString()}:referee:${userId.toHexString()}`,
      target: 1,
      sourceAggregateId,
      conversion,
    };
  }

  private everAwardedFilter() {
    return {
      $or: [
        { active_award: true },
        { completed: true },
        { award_epoch: { $gt: 0 } },
      ],
    };
  }

  private async acquireAwardCapacity(
    quest: Quest & { _id: Types.ObjectId },
    task: CanonicalQuestTask,
    beneficiaryId: Types.ObjectId,
    session: ClientSession,
  ): Promise<'max_referrals_per_user' | 'max_awards_per_user' | null> {
    const locked = await this.userModel.updateOne(
      { _id: beneficiaryId },
      { $inc: { quest_task_award_lock_seq: 1 } },
      { session },
    );
    if (locked.matchedCount !== 1) {
      throw new Error('Quest award-cap beneficiary lock was not acquired.');
    }

    const referralCap = quest.reward_caps?.max_referrals_per_user;
    if (
      task.task_type === 'friend_referral' &&
      referralCap !== null &&
      referralCap !== undefined
    ) {
      const referrals = await this.progressModel.countDocuments(
        {
          quest_id: quest._id,
          task_type: 'friend_referral',
          beneficiary_user_id: beneficiaryId,
          referee_user_id: { $exists: true },
          ...this.everAwardedFilter(),
        },
        { session },
      );
      if (referrals >= referralCap) return 'max_referrals_per_user';
    }

    const awardCap = quest.reward_caps?.max_awards_per_user;
    if (awardCap !== null && awardCap !== undefined) {
      const awards = await this.progressModel.countDocuments(
        {
          quest_id: quest._id,
          beneficiary_user_id: beneficiaryId,
          task_type: { $ne: 'brand_purchase' },
          ...this.everAwardedFilter(),
        },
        { session },
      );
      if (awards >= awardCap) return 'max_awards_per_user';
    }
    return null;
  }

  private async isAudienceEligible(
    quest: Quest & { _id: Types.ObjectId },
    userId: Types.ObjectId,
    at: Date,
    session?: ClientSession,
  ) {
    if (quest.audience?.kind !== 'membership_tiers') return true;
    const tierIds = canonicalAudienceTierIds(quest.audience.tier_ids);
    if (!tierIds) return false;
    const membership = (await this.membershipModel.findOne(
      {
        user_id: userId,
        tier_id: { $in: tierIds.map((tierId) => new Types.ObjectId(tierId)) },
      },
      null,
      session ? { session } : {},
    )) as unknown as MembershipAudienceRecord | null;
    return membershipQualifiesAt(membership, tierIds, at);
  }

  private async applyEffect(
    context: EffectContext,
    sourceType: string,
    sourceEventId: string,
    transitionVersion: number,
    audienceEligible: boolean,
    session: ClientSession,
    eventFx: QuestFxRateProvider,
  ): Promise<Record<string, unknown> | null> {
    const { quest, task, beneficiaryId, refereeId, scopeKey, conversion } =
      context;
    const identity = {
      quest_id: quest._id,
      task_key: task.task_key,
      progress_scope_key: scopeKey,
    };
    const previousProgress = await this.progressModel.findOne(identity, null, {
      session,
    });
    let delta = sourceType === 'account_registration' ? 1 : 0;
    let contributionSnapshot: Record<string, unknown> = {
      account_created: sourceType === 'account_registration',
    };
    let activeValue = 0;
    let conversionIdentity: string | undefined;

    if (conversion) {
      conversionIdentity = canonicalConversionIdentity(
        conversion as unknown as Record<string, unknown>,
      );
      const stateIdentity = {
        ...identity,
        conversion_identity: conversionIdentity,
      };
      const priorState = await this.conversionStateModel.findOne(
        stateIdentity,
        null,
        { session },
      );
      if (
        priorState &&
        transitionVersion <= Number(priorState.high_water_version)
      ) {
        return null;
      }
      const previousActiveValue =
        task.task_type === 'spend_target'
          ? Number(priorState?.active_thb_minor ?? 0)
          : Number(priorState?.active_value ?? 0);
      const historicalPositiveContribution =
        priorState &&
        priorState.ever_audience_qualified !== true &&
        previousActiveValue <= 0
          ? await this.contributionModel.findOne(
              {
                ...identity,
                source_type: 'affiliate_conversion',
                source_aggregate_id: context.sourceAggregateId,
                delta_value: { $gt: 0 },
              },
              { _id: 1 },
              { session },
            )
          : null;
      // Active value and historical positive contribution are compatibility
      // evidence for states written before ever_audience_qualified existed.
      const everAudienceQualified = Boolean(
        priorState?.ever_audience_qualified === true ||
        previousActiveValue > 0 ||
        historicalPositiveContribution,
      );
      const policy = conversionTransitionPolicy(
        conversion,
        new Date(quest.end_date),
        audienceEligible,
        previousActiveValue,
        everAudienceQualified,
      );
      const nextEverAudienceQualified = Boolean(
        everAudienceQualified ||
        (audienceEligible &&
          policy.currentlyEarning &&
          policy.shouldEvaluateContribution),
      );
      if (task.task_type === 'spend_target') {
        const previousActiveThbMinor = previousActiveValue;
        const normalized = policy.shouldEvaluateContribution
          ? await contributionFromConversion(
              conversion,
              eventFx,
              previousActiveThbMinor,
            )
          : {
              delta_thb_minor: 0,
              active_thb_minor: previousActiveThbMinor,
              snapshot: {
                normalized_thb_minor: previousActiveThbMinor,
                ...(policy.audienceQualificationDenied
                  ? { audience_qualification_denied: true }
                  : {}),
                ...(policy.requalificationWindowExpired
                  ? { requalification_window_expired: true }
                  : {}),
              },
            };
        delta = normalized.delta_thb_minor;
        activeValue = normalized.active_thb_minor;
        contributionSnapshot = normalized.snapshot;
      } else {
        const wasActive = previousActiveValue;
        const nowActive =
          policy.shouldEvaluateContribution && policy.currentlyEarning ? 1 : 0;
        delta = nowActive - wasActive;
        activeValue = nowActive;
        contributionSnapshot = {
          earning_eligible: nowActive === 1,
          prior_earning_eligible: wasActive === 1,
          ...(policy.audienceQualificationDenied
            ? { audience_qualification_denied: true }
            : {}),
          ...(policy.requalificationWindowExpired
            ? { requalification_window_expired: true }
            : {}),
        };
      }
      const conversionStateWrite = await this.conversionStateModel.updateOne(
        priorState
          ? {
              _id: priorState._id,
              high_water_version: priorState.high_water_version,
            }
          : stateIdentity,
        {
          $set: {
            ...stateIdentity,
            high_water_version: transitionVersion,
            high_water_event_id: sourceEventId,
            status: String(conversion.current?.conversion_status ?? 'pending'),
            active_value: activeValue,
            ever_audience_qualified: nextEverAudienceQualified,
            ...(task.task_type === 'spend_target'
              ? { active_thb_minor: activeValue }
              : {}),
          },
        },
        { upsert: !priorState, session },
      );
      if (
        conversionStateWrite.matchedCount !== 1 &&
        conversionStateWrite.upsertedCount !== 1
      ) {
        throw new Error(
          'Quest conversion-state CAS lost; retry event ingestion.',
        );
      }
      await this.failureHook.afterStage('after_high_water');
    }

    await this.contributionModel.create(
      [
        {
          ...identity,
          source_type: sourceType,
          source_aggregate_id: context.sourceAggregateId,
          source_transition_version: transitionVersion,
          source_event_id: sourceEventId,
          delta_value: delta,
          ...contributionSnapshot,
          snapshot: contributionSnapshot,
        },
      ],
      { session },
    );
    await this.failureHook.afterStage('after_contribution');

    if (!previousProgress && delta <= 0) return null;
    const previous: QuestProgressState = previousProgress
      ? {
          current_value: Number(previousProgress.current_value),
          target_value: Number(previousProgress.target_value),
          completed: previousProgress.completed,
          active_award: previousProgress.active_award,
          award_epoch: previousProgress.award_epoch,
        }
      : {
          current_value: 0,
          target_value: context.target,
          completed: false,
          active_award: false,
          award_epoch: 0,
        };
    let currentValue: number;
    if (conversion && task.task_type !== 'spend_target') {
      const activeConversions = await this.conversionStateModel.countDocuments(
        {
          ...identity,
          active_value: 1,
        },
        { session },
      );
      currentValue = Math.min(1, activeConversions);
    } else {
      const rawCurrent = Math.max(0, previous.current_value + delta);
      currentValue =
        task.task_type === 'spend_target'
          ? rawCurrent
          : Math.min(1, rawCurrent);
    }
    const awardIdentity = questAwardIdentity(
      String(quest._id),
      task.task_key,
      beneficiaryId.toHexString(),
      refereeId?.toHexString(),
    );
    let decision = transitionQuestProgress(previous, currentValue, {
      award_identity: awardIdentity,
      awards_points: task.task_type !== 'brand_purchase',
    });

    let capReached: 'max_referrals_per_user' | 'max_awards_per_user' | null =
      null;
    const previouslyAwarded = Boolean(
      previousProgress &&
      (previousProgress.active_award ||
        previousProgress.completed ||
        previousProgress.award_epoch > 0),
    );
    if (decision.ledger?.type === 'add' && !previouslyAwarded) {
      capReached = await this.acquireAwardCapacity(
        quest,
        task,
        beneficiaryId,
        session,
      );
      if (capReached) {
        decision = {
          next: {
            ...decision.next,
            completed: false,
            active_award: false,
          },
        };
      }
    }

    if (decision.ledger) {
      const expected = {
        user_id: beneficiaryId,
        ...(refereeId ? { referral_id: refereeId } : {}),
        conversion_id: 0,
        point: task.points,
        type: decision.ledger.type,
        action: 'quest_task_v2',
        idempotency_key: decision.ledger.idempotency_key,
      };
      await this.pointModel.updateOne(
        { idempotency_key: decision.ledger.idempotency_key },
        {
          $setOnInsert: expected,
        },
        { upsert: true, session },
      );
      const winner = await this.pointModel.findOne(
        { idempotency_key: decision.ledger.idempotency_key },
        null,
        { session },
      );
      if (!winner) {
        throw new Error('Quest task-v2 point write produced no ledger row.');
      }
      assertSamePointLedgerEffect(winner, expected);
      await this.failureHook.afterStage('after_award');
    }

    const now = new Date();
    await this.progressModel.updateOne(
      previousProgress ? { _id: previousProgress._id } : identity,
      {
        $set: {
          ...identity,
          beneficiary_user_id: beneficiaryId,
          ...(refereeId ? { referee_user_id: refereeId } : {}),
          task_type: task.task_type,
          current_value: decision.next.current_value,
          target_value: decision.next.target_value,
          completed: decision.next.completed,
          active_award: decision.next.active_award,
          award_epoch: decision.next.award_epoch,
          cap_reached: Boolean(capReached),
          cap_reason: capReached,
          config_revision: Number(quest.config_revision ?? 0),
          ...(decision.next.completed ? { completed_at: now } : {}),
          ...(decision.ledger?.type === 'remove'
            ? { compensated_at: now }
            : {}),
        },
      },
      { upsert: !previousProgress, session },
    );
    await this.failureHook.afterStage('after_progress');
    return {
      quest_id: String(quest._id),
      task_key: task.task_key,
      scope_key: scopeKey,
      current: decision.next.current_value,
      completed: decision.next.completed,
      award_epoch: decision.next.award_epoch,
      ledger_key: decision.ledger?.idempotency_key,
      ...(capReached ? { cap_reached: capReached } : {}),
    };
  }

  async getCustomerProgress(
    userId: string,
    at = new Date(),
  ): Promise<QuestTaskProgressResponse[]> {
    const id = objectId(userId);
    if (!id) return [];
    const quests = await this.questModel
      .find({
        reward_model: 'task_v2',
        start_date: { $lte: at },
        end_date: { $gte: at },
      })
      .sort({ start_date: 1 })
      .populate({
        path: 'tasks.offer',
        select:
          'offer_id merchant_id offer_name offer_name_display logo logo_circle logo_mobile logo_desktop disabled status',
      });
    const response: QuestTaskProgressResponse[] = [];
    for (const quest of quests) {
      if (!(await this.isAudienceEligible(quest, id, at))) continue;
      const rows = await this.progressModel.find({
        quest_id: quest._id,
        beneficiary_user_id: id,
      });
      const tasks = (quest.tasks ?? [])
        .map((raw) => canonicalTaskForQuest(quest, raw))
        .filter((task) => task.enabled)
        .map((task) => {
          const matching = rows.filter((row) => row.task_key === task.task_key);
          const current = matching.reduce(
            (sum, row) => sum + Number(row.current_value),
            0,
          );
          const active = matching.filter((row) => row.active_award);
          const completed = matching.filter((row) => row.completed);
          const compensated = matching.some(
            (row) => row.compensated_at && !row.active_award,
          );
          const capped = matching.find((row) => row.cap_reached);
          const target =
            task.task_type === 'spend_target'
              ? task.target_thb_minor
              : task.task_type === 'brand_purchase'
                ? 1
                : (quest.reward_caps?.max_referrals_per_user ?? null);
          return {
            task_key: task.task_key,
            task_type: task.task_type,
            points: task.points,
            wording_en: String(task.wording_en ?? ''),
            wording_th: String(task.wording_th ?? ''),
            ...(task.task_type === 'brand_purchase'
              ? { offer: customerOffer(task) }
              : {}),
            progress: {
              state: (active.length > 0 || completed.length > 0
                ? 'completed'
                : compensated
                  ? 'compensated'
                  : current > 0
                    ? 'in_progress'
                    : 'not_started') as
                'not_started' | 'in_progress' | 'completed' | 'compensated',
              current,
              target,
              unit: (task.task_type === 'spend_target'
                ? 'thb_minor'
                : task.task_type === 'friend_referral'
                  ? 'referral'
                  : 'purchase') as 'purchase' | 'referral' | 'thb_minor',
              completion_count: completed.length,
              completed_at: (() => {
                const dates = completed
                  .map((row) => row.completed_at)
                  .filter((value): value is Date => Boolean(value))
                  .sort((left, right) => left.getTime() - right.getTime());
                return dates.length > 0
                  ? dates[dates.length - 1].toISOString()
                  : null;
              })(),
              award_epoch: Math.max(
                0,
                ...matching.map((row) => row.award_epoch),
              ),
              active_awarded_points:
                task.task_type === 'brand_purchase'
                  ? 0
                  : active.length * task.points,
              cap_reached: Boolean(capped),
              cap_reason: capped?.cap_reason ?? null,
            },
          };
        });
      response.push({
        quest_id: String(quest._id),
        reward_model: 'task_v2',
        config_revision: Number(quest.config_revision ?? 0),
        window: {
          start_at: new Date(quest.start_date).toISOString(),
          end_at: new Date(quest.end_date).toISOString(),
          timezone: 'Asia/Bangkok',
        },
        tasks,
      });
    }
    return response;
  }
}
