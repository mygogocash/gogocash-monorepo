import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { Quest, QuestDocument } from 'src/point/schemas/quest.schema';

import {
  QuestSourceConfigFence,
  QuestSourceConfigFenceDocument,
} from './schemas/quest-source-config-fence.schema';
import { QUEST_TASK_V2_CANONICAL_FENCE_ID } from './quest-task-index.contract';

type SourceConfigFenceRecord = {
  _id?: unknown;
  fence_key?: unknown;
  revision?: unknown;
};

@Injectable()
export class QuestRevisionFenceService {
  constructor(
    @InjectModel(Quest.name) private readonly questModel: Model<QuestDocument>,
    @InjectModel(QuestSourceConfigFence.name)
    private readonly sourceConfigFenceModel: Model<QuestSourceConfigFenceDocument>,
  ) {}

  async touchSourceConfigFenceInSession(session: ClientSession): Promise<void> {
    const fence = (await this.sourceConfigFenceModel
      .findOne({
        _id: QUEST_TASK_V2_CANONICAL_FENCE_ID,
        fence_key: QUEST_TASK_V2_CANONICAL_FENCE_ID,
      })
      .session(session)
      .lean()) as unknown as SourceConfigFenceRecord | null;
    if (
      !fence ||
      fence._id !== QUEST_TASK_V2_CANONICAL_FENCE_ID ||
      fence.fence_key !== QUEST_TASK_V2_CANONICAL_FENCE_ID ||
      typeof fence.revision !== 'number' ||
      !Number.isSafeInteger(fence.revision) ||
      fence.revision < 0 ||
      fence.revision >= Number.MAX_SAFE_INTEGER
    ) {
      throw new Error(
        'Quest source/config transaction fence was not acquired.',
      );
    }
    const touched = await this.sourceConfigFenceModel.updateOne(
      {
        _id: QUEST_TASK_V2_CANONICAL_FENCE_ID,
        fence_key: QUEST_TASK_V2_CANONICAL_FENCE_ID,
        revision: fence.revision,
      },
      { $inc: { revision: 1 } },
      { upsert: false, session },
    );
    if (touched.matchedCount !== 1 || touched.modifiedCount !== 1) {
      throw new Error(
        'Quest source/config transaction fence was not acquired.',
      );
    }
  }

  /**
   * Freeze only campaigns that can consume this immutable source fact. This
   * runs inside the account/conversion source transaction; a racing config CAS
   * writes the same Quest document, so MongoDB commits one revision and retries
   * the other instead of emitting an event against an unfenced configuration.
   */
  async freezeMatchingInSession(
    qualifyingAt: Date,
    session: ClientSession,
  ): Promise<number> {
    await this.touchSourceConfigFenceInSession(session);
    const candidates = await this.questModel.find(
      {
        reward_model: 'task_v2',
        start_date: { $lte: qualifyingAt },
        end_date: { $gte: qualifyingAt },
      },
      '_id config_revision task_v2_state_frozen_at',
      { session },
    );
    let newlyFrozen = 0;
    for (const quest of candidates) {
      if (quest.task_v2_state_frozen_at) continue;
      const revision = Number(quest.config_revision ?? 0);
      const result = await this.questModel.updateOne(
        {
          _id: quest._id,
          reward_model: 'task_v2',
          config_revision: revision,
          start_date: { $lte: qualifyingAt },
          end_date: { $gte: qualifyingAt },
          $or: [
            { task_v2_state_frozen_at: { $exists: false } },
            { task_v2_state_frozen_at: null },
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
      if (result.matchedCount === 1) newlyFrozen += 1;
    }
    return newlyFrozen;
  }
}
