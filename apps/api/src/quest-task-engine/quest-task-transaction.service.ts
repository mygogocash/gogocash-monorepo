import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

import {
  QUEST_TASK_V2_CANONICAL_FENCE_ID,
  QUEST_TASK_V2_REQUIRED_INDEXES,
  questTaskIndexMatches,
  RequiredQuestTaskIndex,
} from './quest-task-index.contract';

export type QuestTaskTransactionCapability = {
  supported: boolean;
  topology: 'replica-set' | 'mongos' | 'standalone' | 'unavailable';
  logical_sessions: boolean;
};

type SourceConfigFenceRecord = {
  _id?: unknown;
  fence_key?: unknown;
  revision?: unknown;
};

type IdentityIndexInspection = {
  missing: string[];
  taskV2ArtifactsDetected: boolean;
};

const QUEST_TASK_V2_SHARED_COLLECTIONS = new Set(['conversions', 'points']);
const QUEST_TASK_V2_BASELINE_INDEXES = new Set([
  'conversions.conversion_id_1',
  // Created by the required legacy reward reconciliation before task-v2.
  'points.uniq_point_idempotency_key',
]);

type QuestTaskIndexInfo = Parameters<typeof questTaskIndexMatches>[0];

function allowedBaselineIndex(
  requirementKey: string,
  index: QuestTaskIndexInfo,
  required: RequiredQuestTaskIndex,
): boolean {
  if (requirementKey === 'points.uniq_point_idempotency_key') {
    return questTaskIndexMatches(index, required);
  }
  if (requirementKey === 'conversions.conversion_id_1') {
    return (
      JSON.stringify(index.key) === JSON.stringify({ conversion_id: 1 }) &&
      index.sparse !== true &&
      index.partialFilterExpression === undefined
    );
  }
  return false;
}

@Injectable()
export class QuestTaskTransactionService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  get enabled(): boolean {
    return process.env.QUEST_TASK_V2_ENABLED?.trim().toLowerCase() === 'true';
  }

  /**
   * Once the controlled index migration has created the canonical fence, all
   * source facts must continue through the durable journal even when award
   * evaluation is disabled. Before preparation, flag-off environments retain
   * the standalone-compatible legacy path.
   */
  async durableJournalRequired(): Promise<boolean> {
    if (!this.connection.db) {
      throw new ServiceUnavailableException(
        'Quest task-v2 durable journal readiness is unavailable; source mutations are blocked.',
      );
    }
    const fence = await this.readCanonicalSourceConfigFence();
    if (fence) {
      this.assertCanonicalSourceConfigFenceIsValid(fence);
      return true;
    }
    if (this.enabled) {
      throw new ServiceUnavailableException(
        'Quest task-v2 canonical source/config fence is missing after task-v2 preparation; source mutations are blocked.',
      );
    }
    try {
      const indexInspection = await this.inspectIdentityIndexes();
      if (!indexInspection.taskV2ArtifactsDetected) {
        // An untouched database has neither task-v2 indexes nor its fence, so
        // retaining the legacy source path is safe until migration starts.
        return false;
      }
      throw new ServiceUnavailableException(
        'Quest task-v2 canonical source/config fence is missing after task-v2 preparation; source mutations are blocked.',
      );
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException(
        'Quest task-v2 durable journal readiness could not be verified; source mutations are blocked.',
      );
    }
  }

  async capability(): Promise<QuestTaskTransactionCapability> {
    if (!this.connection.db) {
      return {
        supported: false,
        topology: 'unavailable',
        logical_sessions: false,
      };
    }

    let hello: Record<string, unknown>;
    try {
      hello = await this.connection.db.admin().command({ hello: 1 });
    } catch {
      return {
        supported: false,
        topology: 'unavailable',
        logical_sessions: false,
      };
    }

    const topology =
      typeof hello.setName === 'string' && hello.setName
        ? 'replica-set'
        : hello.msg === 'isdbgrid'
          ? 'mongos'
          : 'standalone';
    const logicalSessions =
      typeof hello.logicalSessionTimeoutMinutes === 'number' &&
      hello.logicalSessionTimeoutMinutes > 0;
    return {
      supported:
        logicalSessions &&
        (topology === 'replica-set' || topology === 'mongos'),
      topology,
      logical_sessions: logicalSessions,
    };
  }

  async assertReady(): Promise<QuestTaskTransactionCapability> {
    const capability = await this.capability();
    if (!capability.logical_sessions) {
      throw new ServiceUnavailableException(
        'Quest task-v2 requires MongoDB logical sessions before any source mutation.',
      );
    }
    if (
      capability.topology !== 'replica-set' &&
      capability.topology !== 'mongos'
    ) {
      throw new ServiceUnavailableException(
        'Quest task-v2 requires a MongoDB replica set or mongos; standalone topology is blocked before mutation.',
      );
    }
    await this.assertIdentityIndexesReady();
    await this.assertCanonicalSourceConfigFenceReady();
    return capability;
  }

  private async assertIdentityIndexesReady(): Promise<void> {
    const { missing } = await this.inspectIdentityIndexes();
    if (missing.length > 0) {
      throw new ServiceUnavailableException(
        `Quest task-v2 identity index preflight failed (${missing.join(', ')}). Run the controlled task-v2 index migrations before enabling source mutations.`,
      );
    }
  }

  private async inspectIdentityIndexes(): Promise<IdentityIndexInspection> {
    const missing: string[] = [];
    let taskV2ArtifactsDetected = false;
    const byCollection = new Map<string, RequiredQuestTaskIndex[]>();
    for (const required of QUEST_TASK_V2_REQUIRED_INDEXES) {
      const entries = byCollection.get(required.collection) ?? [];
      entries.push(required);
      byCollection.set(required.collection, entries);
    }
    for (const [collectionName, requiredIndexes] of byCollection) {
      let indexes: Array<Parameters<typeof questTaskIndexMatches>[0]> = [];
      let collectionExists = true;
      try {
        indexes = (await this.connection
          .db!.collection(collectionName)
          .indexes()) as typeof indexes;
      } catch (error) {
        if (this.isNamespaceNotFound(error)) {
          collectionExists = false;
          indexes = [];
        } else {
          throw new ServiceUnavailableException(
            'Quest task-v2 identity index readiness could not be verified; source mutations are blocked.',
          );
        }
      }
      if (
        collectionExists &&
        !QUEST_TASK_V2_SHARED_COLLECTIONS.has(collectionName)
      ) {
        taskV2ArtifactsDetected = true;
      }
      for (const required of requiredIndexes) {
        const requirementKey = `${collectionName}.${required.name}`;
        if (!indexes.some((index) => questTaskIndexMatches(index, required))) {
          missing.push(requirementKey);
        }
        const candidates = indexes.filter(
          (index) =>
            index.name === required.name ||
            JSON.stringify(index.key) === JSON.stringify(required.key),
        );
        const onlyAllowedBaseline =
          QUEST_TASK_V2_BASELINE_INDEXES.has(requirementKey) &&
          candidates.every((index) =>
            allowedBaselineIndex(requirementKey, index, required),
          );
        if (candidates.length > 0 && !onlyAllowedBaseline) {
          taskV2ArtifactsDetected = true;
        }
      }
    }
    return { missing, taskV2ArtifactsDetected };
  }

  private isNamespaceNotFound(error: unknown): boolean {
    const mongoError = error as { code?: unknown; codeName?: unknown };
    return (
      mongoError?.code === 26 || mongoError?.codeName === 'NamespaceNotFound'
    );
  }

  private async readCanonicalSourceConfigFence(): Promise<SourceConfigFenceRecord | null> {
    try {
      return await this.connection
        .db!.collection<{
          _id: string;
          fence_key?: unknown;
          revision?: unknown;
        }>('quest_source_config_fence')
        .findOne({
          $or: [
            { _id: QUEST_TASK_V2_CANONICAL_FENCE_ID },
            { fence_key: QUEST_TASK_V2_CANONICAL_FENCE_ID },
          ],
        });
    } catch (error) {
      if (this.isNamespaceNotFound(error)) return null;
      throw new ServiceUnavailableException(
        'Quest task-v2 durable journal readiness could not be verified; source mutations are blocked.',
      );
    }
  }

  private assertCanonicalSourceConfigFenceIsValid(
    fence: SourceConfigFenceRecord,
  ): void {
    if (
      fence._id !== QUEST_TASK_V2_CANONICAL_FENCE_ID ||
      fence.fence_key !== QUEST_TASK_V2_CANONICAL_FENCE_ID ||
      typeof fence.revision !== 'number' ||
      !Number.isSafeInteger(fence.revision) ||
      fence.revision < 0
    ) {
      throw new ServiceUnavailableException(
        'Quest task-v2 canonical source/config fence is malformed; source mutations are blocked.',
      );
    }
  }

  private async assertCanonicalSourceConfigFenceReady(): Promise<void> {
    const fence = await this.readCanonicalSourceConfigFence();
    if (!fence) {
      throw new ServiceUnavailableException(
        'Quest task-v2 canonical source/config fence is missing after task-v2 preparation; source mutations are blocked.',
      );
    }
    this.assertCanonicalSourceConfigFenceIsValid(fence);
  }

  async assertEnabledAndReady(): Promise<QuestTaskTransactionCapability> {
    if (!this.enabled) {
      throw new ServiceUnavailableException(
        'Quest task-v2 is disabled by QUEST_TASK_V2_ENABLED.',
      );
    }
    return this.assertReady();
  }
}
