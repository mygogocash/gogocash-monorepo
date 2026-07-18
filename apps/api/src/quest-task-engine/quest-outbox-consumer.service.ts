import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Interval } from '@nestjs/schedule';
import { Connection, Model } from 'mongoose';

import {
  QuestEventIngestion,
  QuestEventIngestionDocument,
} from './schemas/quest-event-ingestion.schema';
import {
  QuestOutbox,
  QuestOutboxDocument,
} from './schemas/quest-outbox.schema';
import { QuestTaskProgressService } from './quest-task-progress.service';
import { QuestTaskTransactionService } from './quest-task-transaction.service';

const LEASE_MS = 30_000;

@Injectable()
export class QuestOutboxConsumerService {
  private draining = false;

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(QuestOutbox.name)
    private readonly outboxModel: Model<QuestOutboxDocument>,
    @InjectModel(QuestEventIngestion.name)
    private readonly ingestionModel: Model<QuestEventIngestionDocument>,
    private readonly progress: QuestTaskProgressService,
    private readonly transactions: QuestTaskTransactionService,
  ) {}

  @Interval('quest-task-v2-outbox', 1_000)
  async scheduledDrain(): Promise<void> {
    if (!this.transactions.enabled || this.draining) return;
    this.draining = true;
    try {
      for (let processed = 0; processed < 20; processed += 1) {
        if (!(await this.drainOne())) break;
      }
    } finally {
      this.draining = false;
    }
  }

  async drainOne(now = new Date()): Promise<boolean> {
    if (!this.transactions.enabled) return false;
    await this.transactions.assertReady();
    const leaseToken = randomUUID();
    const leased = await this.outboxModel.findOneAndUpdate(
      {
        $or: [
          {
            status: 'pending',
            $or: [
              { available_at: { $lte: now } },
              { available_at: { $exists: false } },
            ],
          },
          {
            status: 'retryable',
            $or: [
              { available_at: { $lte: now } },
              { available_at: { $exists: false } },
            ],
          },
          { status: 'leased', lease_expires_at: { $lte: now } },
        ],
      },
      {
        $set: {
          status: 'leased',
          lease_token: leaseToken,
          lease_expires_at: new Date(now.getTime() + LEASE_MS),
        },
        $inc: { attempts: 1 },
        $unset: { last_error: 1 },
      },
      { new: true, sort: { createdAt: 1 } },
    );
    if (!leased) return false;

    const session = await this.connection.startSession();
    try {
      await session.withTransaction(async () => {
        const owned = await this.outboxModel.findOne(
          { _id: leased._id, status: 'leased', lease_token: leaseToken },
          null,
          { session },
        );
        if (!owned) throw new Error('Quest outbox lease ownership was lost.');
        await this.progress.applyOutboxInSession(owned, session);
        const completed = await this.outboxModel.updateOne(
          { _id: owned._id, status: 'leased', lease_token: leaseToken },
          {
            $set: { status: 'completed', completed_at: new Date() },
            $unset: {
              lease_token: 1,
              lease_expires_at: 1,
              last_error: 1,
            },
          },
          { session },
        );
        if (completed.matchedCount !== 1) {
          throw new Error('Quest outbox completion CAS was lost.');
        }
      });
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message.slice(0, 1_000) : String(error);
      const attempt = Math.max(1, Number(leased.attempts ?? 1));
      const retryAt = new Date(
        Date.now() + Math.min(300_000, 1_000 * 2 ** Math.min(8, attempt - 1)),
      );
      await Promise.all([
        this.outboxModel.updateOne(
          { _id: leased._id, status: 'leased', lease_token: leaseToken },
          {
            $set: {
              status: 'retryable',
              available_at: retryAt,
              last_error: message,
            },
            $unset: { lease_token: 1, lease_expires_at: 1 },
          },
        ),
        this.markIngestionRetryable(
          leased.source_type,
          leased.source_event_id,
          message,
        ),
      ]);
      return true;
    } finally {
      await session.endSession();
    }
  }

  private async markIngestionRetryable(
    sourceType: string,
    sourceEventId: string,
    message: string,
  ): Promise<void> {
    const existing = await this.ingestionModel.findOne({
      source_type: sourceType,
      source_event_id: sourceEventId,
    });
    if (
      existing &&
      ['completed', 'ignored', 'quarantined'].includes(existing.status)
    ) {
      return;
    }
    if (existing) {
      await this.ingestionModel.updateOne(
        {
          _id: existing._id,
          status: { $nin: ['completed', 'ignored', 'quarantined'] },
        },
        { $set: { status: 'retryable', error_code: message } },
      );
      return;
    }
    try {
      await this.ingestionModel.updateOne(
        { source_type: sourceType, source_event_id: sourceEventId },
        {
          $setOnInsert: {
            source_type: sourceType,
            source_event_id: sourceEventId,
            status: 'retryable',
            error_code: message,
          },
        },
        { upsert: true },
      );
    } catch (error) {
      if ((error as { code?: number })?.code !== 11000) throw error;
      await this.ingestionModel.updateOne(
        {
          source_type: sourceType,
          source_event_id: sourceEventId,
          status: { $nin: ['completed', 'ignored', 'quarantined'] },
        },
        { $set: { status: 'retryable', error_code: message } },
      );
    }
  }
}
