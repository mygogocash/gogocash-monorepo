import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, isValidObjectId, Model, Types } from 'mongoose';
import {
  QuestTaskCandidateWindow,
  QuestTaskStateInspection,
  QuestTaskStateInspector,
} from 'src/point/quest-task.contract';
import { Point } from 'src/point/schemas/point.schema';
import { Quest, QuestDocument } from 'src/point/schemas/quest.schema';

import { QuestTaskTransactionService } from './quest-task-transaction.service';
import { QuestRevisionFenceService } from './quest-revision-fence.service';
import {
  QuestAccountTransition,
  QuestAccountTransitionDocument,
} from './schemas/quest-account-transition.schema';
import {
  QuestConversionTransition,
  QuestConversionTransitionDocument,
} from './schemas/quest-conversion-transition.schema';
import {
  QuestTaskProgress,
  QuestTaskProgressDocument,
} from './schemas/quest-task-progress.schema';

@Injectable()
export class QuestTaskStateInspectorService implements QuestTaskStateInspector {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Quest.name) private readonly questModel: Model<QuestDocument>,
    @InjectModel(QuestTaskProgress.name)
    private readonly progressModel: Model<QuestTaskProgressDocument>,
    @InjectModel(Point.name) private readonly pointModel: Model<Point>,
    @InjectModel(QuestAccountTransition.name)
    private readonly accountTransitionModel: Model<QuestAccountTransitionDocument>,
    @InjectModel(QuestConversionTransition.name)
    private readonly conversionTransitionModel: Model<QuestConversionTransitionDocument>,
    private readonly transactions: QuestTaskTransactionService,
    private readonly revisionFence: QuestRevisionFenceService,
  ) {}

  async withTaskConfigEditFence<T>(
    questId: string,
    operation: (
      state: QuestTaskStateInspection,
      session: import('mongoose').ClientSession,
    ) => Promise<T>,
    candidateWindow?: QuestTaskCandidateWindow,
  ): Promise<T> {
    // This is deliberately before the callback. A disabled feature or a
    // standalone Mongo must never persist a task-v2 configuration that its
    // source writers cannot execute transactionally.
    await this.transactions.assertEnabledAndReady();
    if (!isValidObjectId(questId)) {
      throw new Error(`Invalid quest task-state id: ${questId}`);
    }

    const id = new Types.ObjectId(questId);
    const session = await this.connection.startSession();
    let result!: T;
    let completed = false;
    try {
      await session.withTransaction(async () => {
        // Source transactions write this same singleton row. MongoDB therefore
        // serializes source commits and config inspection/CAS without freezing
        // unrelated future quests.
        await this.revisionFence.touchSourceConfigFenceInSession(session);
        const quest = await this.questModel.findById(id, null, { session });
        if (!quest) throw new Error(`Quest ${questId} disappeared.`);
        const start = new Date(candidateWindow?.start_at ?? quest.start_date);
        const end = new Date(candidateWindow?.end_at ?? quest.end_date);
        if (
          Number.isNaN(start.getTime()) ||
          Number.isNaN(end.getTime()) ||
          start > end
        ) {
          throw new Error('Quest task-v2 candidate window is invalid.');
        }
        const [hasProgress, hasAward, accountSource, conversionSource] =
          await Promise.all([
            this.progressModel.findOne({ quest_id: id }, '_id', { session }),
            this.pointModel.findOne(
              {
                idempotency_key: new RegExp(`^quest:${questId}:task:`),
              },
              '_id',
              { session },
            ),
            this.accountTransitionModel.findOne(
              { occurred_at: { $gte: start, $lte: end } },
              '_id',
              { session },
            ),
            this.conversionTransitionModel.findOne(
              {
                quarantined: { $ne: true },
                'current.datetime_conversion': { $gte: start, $lte: end },
              },
              '_id',
              { session },
            ),
          ]);
        const state: QuestTaskStateInspection = {
          has_outbox: Boolean(
            (quest.task_v2_state_frozen_at &&
              quest.task_v2_state_frozen_reason === 'outbox') ||
            accountSource ||
            conversionSource,
          ),
          has_progress: Boolean(hasProgress),
          has_award: Boolean(hasAward),
        };
        result = await operation(state, session);
        completed = true;
      });
    } finally {
      await session.endSession();
    }
    if (!completed) {
      throw new Error('Quest task-v2 config transaction produced no outcome.');
    }
    return result;
  }
}
