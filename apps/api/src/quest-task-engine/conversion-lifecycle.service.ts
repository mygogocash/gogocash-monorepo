import { createHash } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ClientSession, Connection, Model } from 'mongoose';
import { enrichConversionWithUserId } from 'src/withdraw/conversion-user-id.util';
import {
  Conversion,
  ConversionDocument,
} from 'src/withdraw/schemas/conversion.schema';

import {
  QuestConversionQuarantine,
  QuestConversionQuarantineDocument,
} from './schemas/quest-conversion-quarantine.schema';
import {
  QuestConversionTransition,
  QuestConversionTransitionDocument,
} from './schemas/quest-conversion-transition.schema';
import {
  QuestOutbox,
  QuestOutboxDocument,
} from './schemas/quest-outbox.schema';
import { QuestTaskTransactionService } from './quest-task-transaction.service';
import {
  canonicalConversionAddress,
  CanonicalConversionAddress,
  canonicalConversionIdentity,
} from './conversion-provider-identity';
import { QuestRevisionFenceService } from './quest-revision-fence.service';

export type ConversionLifecycleAdapter =
  | 'postback'
  | 'authoritative_pull'
  | 'admin'
  | 'break_glass'
  | 'reconciliation';

export type ConversionLifecycleOptions = {
  adapter?: ConversionLifecycleAdapter;
  authoritative?: boolean;
  provider_transition_version?: number;
  occurred_at?: Date;
};

export type ConversionLifecycleOutcome = {
  outcome:
    | 'legacy_applied'
    | 'applied'
    | 'duplicate'
    | 'stale'
    | 'quarantined'
    | 'excluded_synthetic';
  event_type?: string;
  transition_version?: number;
  source_event_id?: string;
  high_water_version?: number;
};

type Address = CanonicalConversionAddress;

function status(value: unknown): string {
  const normalized = String(value ?? 'pending')
    .trim()
    .toLowerCase();
  return normalized === 'paid' ? 'approved' : normalized;
}

function asDate(value: unknown): Date | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function immutableConversionDate(value: unknown): Date | undefined {
  const date = asDate(value);
  return date && date.getTime() > 0 ? date : undefined;
}

function number(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, stable(child)]),
    );
  }
  return value instanceof Date ? value.toISOString() : value;
}

@Injectable()
export class QuestConversionLifecycleService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Conversion.name)
    private readonly conversionModel: Model<ConversionDocument>,
    @InjectModel(QuestConversionTransition.name)
    private readonly transitionModel: Model<QuestConversionTransitionDocument>,
    @InjectModel(QuestConversionQuarantine.name)
    private readonly quarantineModel: Model<QuestConversionQuarantineDocument>,
    @InjectModel(QuestOutbox.name)
    private readonly outboxModel: Model<QuestOutboxDocument>,
    private readonly transactions: QuestTaskTransactionService,
    private readonly revisionFence: QuestRevisionFenceService,
  ) {}

  payloadHash(conversion: Record<string, unknown>): string {
    const address = canonicalConversionAddress(conversion);
    return createHash('sha256')
      .update(
        JSON.stringify(
          stable({
            ...address,
            status: status(conversion.conversion_status),
            offer_id: number(conversion.offer_id),
            merchant_id: number(conversion.merchant_id),
            user_id: conversion.user_id
              ? String(conversion.user_id)
              : String(conversion.aff_sub1 ?? ''),
            datetime_conversion:
              asDate(conversion.datetime_conversion)?.toISOString() ?? null,
            currency: String(conversion.currency ?? 'THB').toUpperCase(),
            sale_amount: number(conversion.sale_amount),
            payout: number(conversion.payout),
            base_payout: number(conversion.base_payout),
            bonus_payout: number(conversion.bonus_payout),
            quest_synthetic_reward: conversion.quest_synthetic_reward === true,
          }),
        ),
      )
      .digest('hex');
  }

  async ingest(
    conversion: Record<string, unknown>,
    options: ConversionLifecycleOptions = {},
  ): Promise<ConversionLifecycleOutcome> {
    const address = canonicalConversionAddress(conversion);
    if (!(await this.transactions.durableJournalRequired())) {
      // Keep the pre-task-v2 Involve identity contract while the rollout flag
      // is off and its migration fence has not been created. Existing rows
      // have only conversion_id, so matching on the new provider tuple here
      // would insert a second balance-bearing conversion.
      const legacyCompatibleFilter =
        address.source === 'involve' &&
        conversion.conversion_id !== undefined &&
        conversion.conversion_id !== null
          ? { conversion_id: conversion.conversion_id }
          : address;
      await this.conversionModel.findOneAndUpdate(
        legacyCompatibleFilter,
        enrichConversionWithUserId({
          ...conversion,
          ...address,
          conversion_status: status(conversion.conversion_status),
        } as never),
        { upsert: true, new: true },
      );
      return { outcome: 'legacy_applied' };
    }

    await this.transactions.assertReady();
    const session = await this.connection.startSession();
    let outcome: ConversionLifecycleOutcome | undefined;
    try {
      await session.withTransaction(async () => {
        outcome = await this.ingestInSession(
          conversion,
          address,
          options,
          session,
        );
      });
    } finally {
      await session.endSession();
    }
    if (!outcome) throw new Error('Conversion lifecycle produced no outcome.');
    return outcome;
  }

  private snapshot(
    conversion: Record<string, unknown>,
    address: Address,
    immutableAt?: Date,
  ) {
    const enriched = enrichConversionWithUserId(conversion as never) as Record<
      string,
      unknown
    >;
    return {
      ...address,
      conversion_id: conversion.conversion_id,
      offer_id: number(conversion.offer_id),
      offer_name: String(conversion.offer_name ?? ''),
      merchant_id: number(conversion.merchant_id),
      user_id: enriched.user_id,
      aff_sub1: conversion.aff_sub1,
      conversion_status: status(conversion.conversion_status),
      datetime_conversion:
        immutableAt ??
        immutableConversionDate(conversion.datetime_conversion) ??
        (() => {
          throw new Error(
            'Conversion immutable datetime_conversion is unavailable.',
          );
        })(),
      currency: String(conversion.currency ?? 'THB').toUpperCase(),
      sale_amount: number(conversion.sale_amount),
      payout: number(conversion.payout),
      base_payout: number(conversion.base_payout),
      bonus_payout: number(conversion.bonus_payout),
      quest_synthetic_reward: conversion.quest_synthetic_reward === true,
    };
  }

  private explicitVersion(
    conversion: Record<string, unknown>,
    options: ConversionLifecycleOptions,
  ): number | undefined {
    const candidate =
      options.provider_transition_version ??
      conversion.provider_transition_version ??
      conversion.transition_version;
    const parsed = Number(candidate);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
  }

  private providerOccurredAt(
    conversion: Record<string, unknown>,
    options: ConversionLifecycleOptions,
    initial: boolean,
  ): Date | undefined {
    return (
      options.occurred_at ??
      asDate(conversion.datetime_updated) ??
      asDate(conversion.updated_at) ??
      asDate(conversion.provider_occurred_at) ??
      (initial ? asDate(conversion.datetime_conversion) : undefined)
    );
  }

  private eventType(
    previous: Record<string, unknown> | null,
    current: Record<string, unknown>,
  ): string {
    const before = status(previous?.conversion_status);
    const after = status(current.conversion_status);
    const beforeEligible = before === 'approved';
    const afterEligible = after === 'approved';
    if (!previous) return afterEligible ? 'approved' : 'pending';
    if (beforeEligible && afterEligible) {
      const financialChanged =
        number(previous.sale_amount) !== number(current.sale_amount) ||
        String(previous.currency ?? 'THB').toUpperCase() !==
          String(current.currency ?? 'THB').toUpperCase();
      return financialChanged ? 'correction' : 'approved';
    }
    if (!beforeEligible && afterEligible) {
      return ['rejected', 'reversed', 'cancelled', 'declined'].includes(before)
        ? 'requalified'
        : 'approved';
    }
    if (beforeEligible && !afterEligible) return 'reversed';
    return 'pending';
  }

  private async ingestInSession(
    conversion: Record<string, unknown>,
    address: Address,
    options: ConversionLifecycleOptions,
    session: ClientSession,
  ): Promise<ConversionLifecycleOutcome> {
    let existing = (await this.conversionModel.findOne(address, null, {
      session,
    })) as unknown as Record<string, unknown> | null;
    if (!existing && address.source === 'involve') {
      const legacyConversionId = Number(
        conversion.conversion_id ?? address.provider_conversion_id,
      );
      if (Number.isFinite(legacyConversionId)) {
        existing = (await this.conversionModel.findOne(
          {
            conversion_id: legacyConversionId,
            provider_conversion_id: { $exists: false },
            $or: [{ source: 'involve' }, { source: { $exists: false } }],
          },
          null,
          { session },
        )) as unknown as Record<string, unknown> | null;
      }
    }
    const highWater = number(existing?.lifecycle_transition_version);
    const lifecycleInitialized = highWater > 0;
    const storedConversionAt = immutableConversionDate(
      existing?.datetime_conversion,
    );
    const incomingConversionAt = immutableConversionDate(
      conversion.datetime_conversion,
    );
    if (!storedConversionAt && !incomingConversionAt) {
      return this.quarantineImmutableTimestamp(
        address,
        highWater,
        conversion,
        'missing_immutable_datetime_conversion',
        session,
      );
    }
    if (
      storedConversionAt &&
      incomingConversionAt &&
      storedConversionAt.getTime() !== incomingConversionAt.getTime() &&
      options.authoritative !== true
    ) {
      return this.quarantineImmutableTimestamp(
        address,
        highWater,
        conversion,
        'immutable_datetime_conversion_conflict',
        session,
      );
    }
    const conversionAt = storedConversionAt ?? incomingConversionAt!;
    const canonicalConversion = {
      ...conversion,
      datetime_conversion: conversionAt,
    };
    const hash = this.payloadHash(canonicalConversion);
    let version = this.explicitVersion(conversion, options);
    const occurredAt = this.providerOccurredAt(
      conversion,
      options,
      !existing || !lifecycleInitialized,
    );

    if (version !== undefined && version <= highWater) {
      if (
        version === highWater &&
        lifecycleInitialized &&
        existing?.lifecycle_payload_hash !== hash
      ) {
        return this.quarantineImmutableTimestamp(
          address,
          highWater,
          canonicalConversion,
          'provider_version_payload_conflict',
          session,
        );
      }
      return {
        outcome:
          version === highWater &&
          lifecycleInitialized &&
          existing?.lifecycle_payload_hash === hash
            ? 'duplicate'
            : 'stale',
        high_water_version: highWater,
      };
    }
    if (
      version === undefined &&
      lifecycleInitialized &&
      existing?.lifecycle_payload_hash === hash
    ) {
      return { outcome: 'duplicate', high_water_version: highWater };
    }

    if (version === undefined) {
      if (!existing || !lifecycleInitialized) {
        version = 1;
      } else if (options.authoritative === true) {
        version = highWater + 1;
      } else {
        const previousOccurredAt = asDate(existing.lifecycle_occurred_at);
        if (occurredAt && previousOccurredAt) {
          if (occurredAt.getTime() < previousOccurredAt.getTime()) {
            return { outcome: 'stale', high_water_version: highWater };
          }
          if (occurredAt.getTime() > previousOccurredAt.getTime()) {
            version = highWater + 1;
          }
        }
        if (version === undefined) {
          const ambiguityKey = createHash('sha256')
            .update(
              `${address.source}\0${address.provider_account}\0${address.provider_conversion_id}\0${highWater}\0${hash}`,
            )
            .digest('hex');
          await this.quarantineModel.updateOne(
            { ambiguity_key: ambiguityKey },
            {
              $setOnInsert: {
                ambiguity_key: ambiguityKey,
                ...address,
                reason: 'provider_order_ambiguous',
                observed_high_water_version: highWater,
                payload: this.snapshot(
                  canonicalConversion,
                  address,
                  conversionAt,
                ),
                status: 'pending',
              },
            },
            { upsert: true, session },
          );
          return { outcome: 'quarantined', high_water_version: highWater };
        }
      }
    }

    const effectiveOccurredAt = occurredAt ?? new Date();
    const canonicalIdentity = canonicalConversionIdentity(address);
    const sourceEventId = `conversion:${canonicalIdentity}:transition:v${version}`;
    const current = this.snapshot(canonicalConversion, address, conversionAt);
    const eventType = this.eventType(
      lifecycleInitialized ? existing : null,
      current,
    );
    const orderingKey = `${effectiveOccurredAt.toISOString()}:${hash}`;
    const projection = {
      ...canonicalConversion,
      ...address,
      conversion_status: current.conversion_status,
      lifecycle_transition_version: version,
      lifecycle_transition_id: sourceEventId,
      lifecycle_occurred_at: effectiveOccurredAt,
      lifecycle_ordering_key: orderingKey,
      lifecycle_payload_hash: hash,
    };
    const expectedFilter = existing
      ? lifecycleInitialized
        ? {
            _id: existing._id,
            lifecycle_transition_version: highWater,
          }
        : {
            _id: existing._id,
            $or: [
              { lifecycle_transition_version: 0 },
              { lifecycle_transition_version: { $exists: false } },
            ],
          }
      : address;
    const projected = await this.conversionModel.findOneAndUpdate(
      expectedFilter,
      { $set: enrichConversionWithUserId(projection as never) },
      { upsert: !existing, new: true, session },
    );
    if (!projected) {
      // Another writer advanced the high-water mark after our snapshot. Do not
      // emit an event for a projection this transaction did not win.
      throw new Error(
        'Conversion projection CAS lost; retry lifecycle ingestion.',
      );
    }

    if (conversion.quest_synthetic_reward === true) {
      return {
        outcome: 'excluded_synthetic',
        transition_version: version,
        high_water_version: version,
      };
    }

    await this.revisionFence.freezeMatchingInSession(conversionAt, session);

    const transition = {
      transition_id: sourceEventId,
      ...address,
      transition_version: version,
      ...(existing?._id ? { conversion_id: existing._id } : {}),
      ...(lifecycleInitialized && existing
        ? { from_status: status(existing.conversion_status) }
        : {}),
      to_status: status(current.conversion_status),
      event_type: eventType,
      occurred_at: effectiveOccurredAt,
      ordering_key: orderingKey,
      payload_hash: hash,
      ...(lifecycleInitialized && existing
        ? { previous: this.snapshot(existing, address, conversionAt) }
        : {}),
      current,
      quarantined: false,
    };
    await this.transitionModel.create(
      [transition as unknown as QuestConversionTransition],
      { session },
    );
    await this.outboxModel.create(
      [
        {
          source_type: 'affiliate_conversion',
          source_event_id: sourceEventId,
          aggregate_id: canonicalIdentity,
          event_type: eventType,
          transition_version: version,
          occurred_at: effectiveOccurredAt,
          payload: transition,
          status: 'pending',
          attempts: 0,
          available_at: effectiveOccurredAt,
        },
      ],
      { session },
    );
    return {
      outcome: 'applied',
      event_type: eventType,
      transition_version: version,
      source_event_id: sourceEventId,
      high_water_version: version,
    };
  }

  private async quarantineImmutableTimestamp(
    address: Address,
    highWater: number,
    conversion: Record<string, unknown>,
    reason: string,
    session: ClientSession,
  ): Promise<ConversionLifecycleOutcome> {
    const ambiguityKey = createHash('sha256')
      .update(
        `${address.source}\0${address.provider_account}\0${address.provider_conversion_id}\0${highWater}\0${reason}\0${this.payloadHash(conversion)}`,
      )
      .digest('hex');
    await this.quarantineModel.updateOne(
      { ambiguity_key: ambiguityKey },
      {
        $setOnInsert: {
          ambiguity_key: ambiguityKey,
          ...address,
          reason,
          observed_high_water_version: highWater,
          payload: { ...conversion, ...address },
          status: 'pending',
        },
      },
      { upsert: true, session },
    );
    return { outcome: 'quarantined', high_water_version: highWater };
  }
}
