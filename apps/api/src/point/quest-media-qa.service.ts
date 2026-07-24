import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash, timingSafeEqual } from 'node:crypto';
import { Model, Types } from 'mongoose';

import type { CommandOwnedStoredMediaAsset } from 'src/media/stored-media.service';
import {
  mongoEq,
  requireObjectId,
  requireTrimmedString,
} from 'src/common/mongo-query';

import { QuestMediaQaCleanupDto } from './dto/create-quest.dto';
import { QuestMediaCleanupService } from './quest-media-cleanup.service';
import {
  questMediaQaMutationEnabled,
  assertQuestMediaQaMutationEnabled,
} from './quest-media-qa.guard';
import { Quest } from './schemas/quest.schema';
import {
  QuestMediaCleanup,
  QuestMediaCleanupDocument,
} from './schemas/quest-media-cleanup.schema';
import {
  QuestMediaWriteCommand,
  QuestMediaWriteCommandDocument,
} from './schemas/quest-media-write-command.schema';

const QA_ROLES = [
  'banner_en',
  'banner_th',
  'sub_banner_en',
  'sub_banner_th',
] as const;

type QaRole = (typeof QA_ROLES)[number];

type QaCommand = {
  request_key: string;
  payload_hash: string;
  quest_id: Types.ObjectId;
  attempt_token: string;
  status: 'committed';
  committed_revision: number;
  qa_marker: string;
  qa_cleanup_nonce_hash: string;
  qa_cleanup_objects_deleted_at?: Date;
  planned_assets: Array<{
    role: QaRole;
    asset: CommandOwnedStoredMediaAsset;
  }>;
};

function nonceMatches(nonce: string, expectedHash: string): boolean {
  const received = Buffer.from(
    createHash('sha256').update(nonce).digest('hex'),
    'hex',
  );
  const expected = Buffer.from(expectedHash, 'hex');
  return (
    expected.length === received.length && timingSafeEqual(received, expected)
  );
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function exactQaAssets(command: QaCommand) {
  const byRole = new Map<QaRole, CommandOwnedStoredMediaAsset>();
  for (const plan of command.planned_assets ?? []) {
    if (
      !QA_ROLES.includes(plan.role) ||
      plan.asset?.provider !== 'r2' ||
      plan.asset.ownership !== 'command-owned' ||
      plan.asset.owner_key !== command.request_key ||
      plan.asset.owner_attempt_token !== command.attempt_token
    ) {
      throw new ConflictException('QA command media provenance is invalid');
    }
    byRole.set(plan.role, plan.asset);
  }
  if (byRole.size !== QA_ROLES.length) {
    throw new ConflictException('QA command does not own exactly four banners');
  }
  const assets = QA_ROLES.map((role) => byRole.get(role)!);
  if (
    new Set(assets.map((asset) => asset.object_key)).size !== assets.length ||
    new Set(assets.map((asset) => asset.url)).size !== assets.length
  ) {
    throw new ConflictException('QA command banners are not distinct');
  }
  return { assets, byRole };
}

@Injectable()
export class QuestMediaQaService {
  constructor(
    @InjectModel(QuestMediaWriteCommand.name)
    private readonly commandModel: Model<QuestMediaWriteCommandDocument>,
    @InjectModel(Quest.name)
    private readonly questModel: Model<Quest>,
    @InjectModel(QuestMediaCleanup.name)
    private readonly cleanupModel: Model<QuestMediaCleanupDocument>,
    private readonly cleanup: QuestMediaCleanupService,
  ) {}

  readiness() {
    return {
      contract_version: 'quest-media-v3',
      mutation_enabled: questMediaQaMutationEnabled(),
      required_routes: [
        'GET /point/admin-quest-media/readiness',
        'POST /point/create-quest',
        'PATCH /point/admin-quest/:id/campaign',
        'GET /point/admin-quest-media/qa-status/:requestKey',
        'POST /point/admin-quest-media/qa-cleanup',
      ],
      constraints: {
        role: 'superadmin',
        new_quest_files: 4,
        replacement_files: 4,
        cleanup_scope: 'exact marker + request key + nonce + attempt',
      },
    } as const;
  }

  async status(requestKey: string) {
    const command = await this.commandModel
      .findOne({ request_key: requestKey })
      .read('primary')
      .lean();
    if (!command) {
      return {
        request_key: requestKey,
        command: null,
        quest: null,
        cleanup: 0,
      };
    }
    const quest = await this.questModel
      .findOne({
        _id: command.quest_id,
        media_command_key: command.request_key,
        media_attempt_token: command.attempt_token,
      })
      .read('primary')
      .lean();
    const cleanup = await this.cleanupModel.countDocuments({
      $or: [
        { cleanup_key: command.request_key },
        {
          cleanup_key: {
            $regex: `^qa-cleanup:${escapeRegex(command.request_key)}:`,
          },
        },
      ],
      status: 'pending',
    });
    return {
      request_key: requestKey,
      command: {
        status: command.status,
        quest_id: String(command.quest_id),
        attempt_token: command.attempt_token,
        committed_revision: command.committed_revision ?? null,
        qa_marker: command.qa_marker ?? null,
        planned_object_count: command.planned_assets?.length ?? 0,
      },
      quest: quest
        ? {
            id: String(quest._id),
            campaign_revision: quest.campaign_revision,
            refs: QA_ROLES.map((role) => quest[role]),
          }
        : null,
      pending_cleanup: cleanup,
    };
  }

  private async hasExactCleanupJournal(
    cleanupKey: string,
    command: QaCommand,
    assets: CommandOwnedStoredMediaAsset[],
  ): Promise<boolean> {
    const rows = (await this.cleanupModel
      .find({
        cleanup_key: cleanupKey,
        quest_id: command.quest_id,
        replacement_revision: command.committed_revision,
        reason: 'qa-acceptance',
      })
      .read('primary')
      .lean()) as Array<{
      status?: string;
      asset?: Partial<CommandOwnedStoredMediaAsset>;
    }>;
    if (rows.length !== assets.length) return false;
    const rowsByKey = new Map(
      rows.map((row) => [row.asset?.object_key, row] as const),
    );
    return assets.every((asset) => {
      const row = rowsByKey.get(asset.object_key);
      return (
        Boolean(row) &&
        (row!.status === 'pending' || row!.status === 'deleted') &&
        row!.asset?.provider === asset.provider &&
        row!.asset?.ownership === asset.ownership &&
        row!.asset?.owner_key === asset.owner_key &&
        row!.asset?.owner_attempt_token === asset.owner_attempt_token &&
        row!.asset?.bucket === asset.bucket &&
        row!.asset?.url === asset.url &&
        row!.asset?.sha256 === asset.sha256
      );
    });
  }

  async cleanupAcceptance(input: QuestMediaQaCleanupDto) {
    assertQuestMediaQaMutationEnabled();
    const requestKey = requireTrimmedString(
      input.request_key,
      200,
      'request key',
    );
    const qaMarker = requireTrimmedString(input.qa_marker, 200, 'QA marker');
    const cleanupNonce = requireTrimmedString(
      input.cleanup_nonce,
      256,
      'cleanup nonce',
    );
    const questId = requireObjectId(input.quest_id, 'quest id');
    const command = (await this.commandModel
      .findOne({
        request_key: mongoEq(requestKey),
        quest_id: mongoEq(questId),
        status: 'committed',
        qa_marker: mongoEq(qaMarker),
      })
      .read('primary')
      .lean()) as QaCommand | null;
    if (!command) {
      throw new NotFoundException('Marker-owned quest media command not found');
    }
    if (!nonceMatches(cleanupNonce, command.qa_cleanup_nonce_hash ?? '')) {
      throw new UnauthorizedException('Quest media cleanup nonce is invalid');
    }

    const { assets, byRole } = exactQaAssets(command);
    const cleanupKey = `qa-cleanup:${requestKey}:${command.attempt_token}`;
    const quest = await this.questModel
      .findOne({
        _id: mongoEq(questId),
        qa_marker: mongoEq(qaMarker),
        media_command_key: mongoEq(requestKey),
        media_attempt_token: command.attempt_token,
        campaign_revision: command.committed_revision,
      })
      .read('primary')
      .lean();
    if (quest) {
      for (const role of QA_ROLES) {
        if (quest[role] !== byRole.get(role)!.url) {
          throw new ConflictException(
            `QA quest ${role} no longer matches intent`,
          );
        }
      }
      // Tombstone exact objects before removing the final live references. The
      // worker rechecks those references and cannot delete until the CAS below.
      await this.cleanup.journal({
        cleanupKey,
        questId,
        replacementRevision: command.committed_revision,
        reason: 'qa-acceptance',
        assets,
      });
      const deletedQuest = await this.questModel.findOneAndDelete({
        _id: mongoEq(questId),
        qa_marker: mongoEq(qaMarker),
        media_command_key: mongoEq(requestKey),
        media_attempt_token: command.attempt_token,
        campaign_revision: command.committed_revision,
      });
      if (!deletedQuest) {
        throw new ConflictException('QA quest cleanup fence was lost');
      }
    } else if (
      !command.qa_cleanup_objects_deleted_at &&
      !(await this.hasExactCleanupJournal(cleanupKey, command, assets))
    ) {
      throw new NotFoundException('Marker-owned QA quest not found');
    }

    if (!command.qa_cleanup_objects_deleted_at) {
      await this.cleanup.runForKey(cleanupKey);
      if (await this.cleanup.hasPending(cleanupKey)) {
        throw new ServiceUnavailableException(
          'QA quest was removed, but exact object cleanup is still pending.',
        );
      }
      const deletedObjects = await this.cleanupModel.countDocuments({
        cleanup_key: cleanupKey,
        status: 'deleted',
      });
      if (deletedObjects !== QA_ROLES.length) {
        throw new ServiceUnavailableException(
          'QA object cleanup could not be proven complete.',
        );
      }
      const marked = await this.commandModel.findOneAndUpdate(
        {
          request_key: mongoEq(requestKey),
          quest_id: mongoEq(questId),
          attempt_token: command.attempt_token,
          status: 'committed',
          qa_marker: mongoEq(qaMarker),
          qa_cleanup_nonce_hash: command.qa_cleanup_nonce_hash,
        },
        { $set: { qa_cleanup_objects_deleted_at: new Date() } },
        { new: true },
      );
      if (!marked) {
        throw new ServiceUnavailableException(
          'QA object cleanup completion could not be fenced.',
        );
      }
    }

    const pendingQuestCleanup = await this.cleanupModel.countDocuments({
      quest_id: mongoEq(questId),
      status: 'pending',
    });
    if (pendingQuestCleanup !== 0) {
      throw new ServiceUnavailableException(
        'QA quest still has pending historical object cleanup.',
      );
    }
    const deletedTombstones = await this.cleanupModel.deleteMany({
      quest_id: mongoEq(questId),
    });
    const remainingTombstones = await this.cleanupModel.countDocuments({
      quest_id: mongoEq(questId),
    });
    if (remainingTombstones !== 0) {
      throw new ServiceUnavailableException(
        'QA tombstone cleanup could not be proven',
      );
    }
    const intentScope = {
      quest_id: mongoEq(questId),
      status: 'committed' as const,
      qa_marker: mongoEq(qaMarker),
      qa_cleanup_nonce_hash: command.qa_cleanup_nonce_hash,
    };
    const deletedIntents = await this.commandModel.deleteMany(intentScope);
    if ((deletedIntents.deletedCount ?? 0) < 1) {
      throw new ServiceUnavailableException(
        'QA intent cleanup could not be proven',
      );
    }
    const remainingIntents =
      await this.commandModel.countDocuments(intentScope);
    if (remainingIntents !== 0) {
      throw new ServiceUnavailableException(
        'QA historical intent cleanup could not be proven',
      );
    }
    return {
      quest_deleted: true,
      objects_deleted: QA_ROLES.length,
      intent_deleted: true,
      intents_deleted: deletedIntents.deletedCount,
      tombstones_deleted: deletedTombstones.deletedCount,
    };
  }
}
