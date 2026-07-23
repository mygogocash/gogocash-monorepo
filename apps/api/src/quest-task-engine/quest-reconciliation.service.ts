import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Interval } from '@nestjs/schedule';
import { Connection, Model, Types } from 'mongoose';
import { Point } from 'src/point/schemas/point.schema';

import { QuestConversionLifecycleService } from './conversion-lifecycle.service';
import { canonicalConversionIdentity } from './conversion-provider-identity';
import { QuestTaskTransactionService } from './quest-task-transaction.service';
import {
  QuestAccountTransition,
  QuestAccountTransitionDocument,
} from './schemas/quest-account-transition.schema';
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

@Injectable()
export class QuestReconciliationService {
  private running = false;

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(QuestAccountTransition.name)
    private readonly accountTransitionModel: Model<QuestAccountTransitionDocument>,
    @InjectModel(QuestConversionTransition.name)
    private readonly conversionTransitionModel: Model<QuestConversionTransitionDocument>,
    @InjectModel(QuestConversionQuarantine.name)
    private readonly quarantineModel: Model<QuestConversionQuarantineDocument>,
    @InjectModel(QuestOutbox.name)
    private readonly outboxModel: Model<QuestOutboxDocument>,
    @InjectModel(Point.name) private readonly pointModel: Model<Point>,
    private readonly lifecycle: QuestConversionLifecycleService,
    private readonly transactions: QuestTaskTransactionService,
  ) {}

  @Interval('quest-task-v2-reconciliation', 60_000)
  async scheduledReconcile(): Promise<void> {
    if (!this.transactions.enabled || this.running) return;
    this.running = true;
    try {
      await this.reconcileMissingOutbox();
      await this.resolveAuthoritativeQuarantine();
    } finally {
      this.running = false;
    }
  }

  async reconcileMissingOutbox(limit = 100): Promise<number> {
    if (!this.transactions.enabled) return 0;
    await this.transactions.assertReady();
    let repaired = 0;
    let accountCursor: Types.ObjectId | undefined;
    while (repaired < limit) {
      const accounts = await this.accountTransitionModel
        .find(accountCursor ? { _id: { $gt: accountCursor } } : {})
        .sort({ _id: 1 })
        .limit(Math.min(100, Math.max(1, limit)));
      if (accounts.length === 0) break;
      for (const transition of accounts) {
        accountCursor = transition._id;
        const exists = await this.outboxModel.exists({
          source_type: 'account_registration',
          source_event_id: transition.transition_id,
        });
        if (exists) continue;
        const referrerId = transition.referrer_id;
        const baseKey = referrerId
          ? `referral:base:v1:referrer:${String(referrerId)}:referee:${String(transition.user_id)}`
          : undefined;
        const baseExists = baseKey
          ? await this.pointModel.exists({ idempotency_key: baseKey })
          : true;
        const inserted = await this.outboxModel.updateOne(
          {
            source_type: 'account_registration',
            source_event_id: transition.transition_id,
          },
          {
            $setOnInsert: {
              source_type: 'account_registration',
              source_event_id: transition.transition_id,
              aggregate_id: String(transition.user_id),
              event_type: 'account_created',
              transition_version: transition.version,
              occurred_at: transition.occurred_at,
              payload: {
                user_id: String(transition.user_id),
                registration_source: transition.registration_source,
                referrer_id: referrerId ? String(referrerId) : null,
                base_referral_reconciliation_required: Boolean(
                  referrerId && !baseExists,
                ),
              },
              status: 'pending',
              attempts: 0,
              available_at: new Date(),
            },
          },
          { upsert: true },
        );
        repaired += inserted.upsertedCount;
        if (repaired >= limit) break;
      }
      if (accounts.length < Math.min(100, Math.max(1, limit))) break;
    }

    let conversionCursor: Types.ObjectId | undefined;
    while (repaired < limit) {
      const conversions = await this.conversionTransitionModel
        .find({
          quarantined: { $ne: true },
          ...(conversionCursor ? { _id: { $gt: conversionCursor } } : {}),
        })
        .sort({ _id: 1 })
        .limit(Math.min(100, Math.max(1, limit)));
      if (conversions.length === 0) break;
      for (const transition of conversions) {
        conversionCursor = transition._id;
        const exists = await this.outboxModel.exists({
          source_type: 'affiliate_conversion',
          source_event_id: transition.transition_id,
        });
        if (exists) continue;
        const payload = transition.toObject();
        const inserted = await this.outboxModel.updateOne(
          {
            source_type: 'affiliate_conversion',
            source_event_id: transition.transition_id,
          },
          {
            $setOnInsert: {
              source_type: 'affiliate_conversion',
              source_event_id: transition.transition_id,
              aggregate_id: canonicalConversionIdentity(
                payload as unknown as Record<string, unknown>,
              ),
              event_type: transition.event_type,
              transition_version: transition.transition_version,
              occurred_at: transition.occurred_at,
              payload,
              status: 'pending',
              attempts: 0,
              available_at: new Date(),
            },
          },
          { upsert: true },
        );
        repaired += inserted.upsertedCount;
        if (repaired >= limit) break;
      }
      if (conversions.length < Math.min(100, Math.max(1, limit))) break;
    }
    return repaired;
  }

  async resolveAuthoritativeQuarantine(limit = 25): Promise<number> {
    if (!this.transactions.enabled) return 0;
    await this.transactions.assertReady();
    const rows = await this.quarantineModel
      .find({
        status: 'pending',
        authoritative_payload: { $type: 'object' },
        authoritative_verified_at: { $type: 'date' },
      })
      .sort({ createdAt: 1 })
      .limit(limit);
    let resolved = 0;
    for (const row of rows) {
      const outcome = await this.lifecycle.ingest(row.authoritative_payload!, {
        adapter: 'reconciliation',
        authoritative: true,
        occurred_at: row.authoritative_verified_at,
      });
      if (outcome.outcome !== 'applied' && outcome.outcome !== 'duplicate') {
        continue;
      }
      const update = await this.quarantineModel.updateOne(
        { _id: row._id, status: 'pending' },
        {
          $set: {
            status: 'resolved',
            resolved_at: new Date(),
            ...(outcome.source_event_id
              ? { resolution_transition_id: outcome.source_event_id }
              : {}),
          },
        },
      );
      if (update.matchedCount === 1) resolved += 1;
    }
    return resolved;
  }

  async requeueRetryable(limit = 500): Promise<number> {
    if (!this.transactions.enabled) return 0;
    await this.transactions.assertReady();
    const rows = await this.outboxModel
      .find({ status: 'retryable' })
      .sort({ available_at: 1, createdAt: 1 })
      .limit(limit)
      .select('_id');
    if (rows.length === 0) return 0;
    const result = await this.outboxModel.updateMany(
      { _id: { $in: rows.map((row) => row._id) }, status: 'retryable' },
      { $set: { available_at: new Date() } },
    );
    return result.modifiedCount;
  }
}
