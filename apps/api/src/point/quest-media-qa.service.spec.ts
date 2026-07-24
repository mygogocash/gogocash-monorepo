import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Types } from 'mongoose';

import type { CommandOwnedStoredMediaAsset } from 'src/media/stored-media.service';

import { QuestMediaQaService } from './quest-media-qa.service';

function query<T>(value: T) {
  const result = {
    read: jest.fn(),
    lean: jest.fn(),
    then: (resolve: (input: T) => unknown) =>
      Promise.resolve(value).then(resolve),
  };
  result.read.mockReturnValue(result);
  result.lean.mockResolvedValue(value);
  return result;
}

function asset(role: string): CommandOwnedStoredMediaAsset {
  return {
    provider: 'r2',
    ownership: 'command-owned',
    owner_key: 'quest-media:qa:test-command',
    owner_attempt_token: 'attempt-1',
    url: `https://media.example/quests/attempt-1/${role}.png`,
    bucket: 'media',
    object_key: `quests/attempt-1/${role}.png`,
    sha256: createHash('sha256').update(role).digest('hex'),
    original_name: `${role}.png`,
    content_type: 'image/png',
  };
}

describe('QuestMediaQaService', () => {
  const previousEnv = process.env;
  let commandModel: Record<string, jest.Mock>;
  let questModel: Record<string, jest.Mock>;
  let cleanupModel: Record<string, jest.Mock>;
  let cleanup: Record<string, jest.Mock>;

  beforeEach(() => {
    process.env = { ...previousEnv, NODE_ENV: 'test' };
    commandModel = {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      countDocuments: jest.fn().mockResolvedValue(0),
    };
    questModel = {
      findOne: jest.fn(),
      findOneAndDelete: jest.fn(),
    };
    cleanupModel = {
      find: jest.fn(),
      countDocuments: jest.fn().mockResolvedValue(0),
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 4 }),
    };
    cleanup = {
      journal: jest.fn().mockResolvedValue(undefined),
      runForKey: jest.fn().mockResolvedValue(undefined),
      hasPending: jest.fn().mockResolvedValue(false),
    };
  });

  afterAll(() => {
    process.env = previousEnv;
  });

  function service() {
    return new QuestMediaQaService(
      commandModel as never,
      questModel as never,
      cleanupModel as never,
      cleanup as never,
    );
  }

  it('publishes the exact read-only route bundle while mutation stays disabled', () => {
    delete process.env.QUEST_MEDIA_QA_ENABLED;
    expect(service().readiness()).toEqual(
      expect.objectContaining({
        contract_version: 'quest-media-v3',
        mutation_enabled: false,
        required_routes: [
          'GET /point/admin-quest-media/readiness',
          'POST /point/create-quest',
          'PATCH /point/admin-quest/:id/campaign',
          'GET /point/admin-quest-media/qa-status/:requestKey',
          'POST /point/admin-quest-media/qa-cleanup',
        ],
      }),
    );
  });

  it('fails closed before any database call when mutation is disabled', async () => {
    delete process.env.QUEST_MEDIA_QA_ENABLED;
    await expect(
      service().cleanupAcceptance({
        quest_id: new Types.ObjectId().toHexString(),
        request_key: 'quest-media:qa:test-command',
        qa_marker: 'quest-media-qa:test-marker',
        cleanup_nonce: 'n'.repeat(32),
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(commandModel.findOne).not.toHaveBeenCalled();
  });

  it.each([
    ['request_key', { $ne: '' }],
    ['qa_marker', { $gt: '' }],
    ['cleanup_nonce', ['n'.repeat(32)]],
    ['quest_id', { $oid: new Types.ObjectId().toHexString() }],
  ])(
    'rejects a non-string %s before any database call',
    async (field, value) => {
      process.env.QUEST_MEDIA_QA_ENABLED = 'true';
      const input = {
        quest_id: new Types.ObjectId().toHexString(),
        request_key: 'quest-media:qa:test-command',
        qa_marker: 'quest-media-qa:test-marker',
        cleanup_nonce: 'n'.repeat(32),
        [field]: value,
      };

      await expect(
        service().cleanupAcceptance(input as never),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(commandModel.findOne).not.toHaveBeenCalled();
      expect(questModel.findOne).not.toHaveBeenCalled();
      expect(cleanup.journal).not.toHaveBeenCalled();
    },
  );

  it('journals all four exact objects before deleting the marker-owned quest, then purges intent and tombstones', async () => {
    process.env.QUEST_MEDIA_QA_ENABLED = 'true';
    const questId = new Types.ObjectId();
    const nonce = 'acceptance-cleanup-nonce-1234567890';
    const marker = 'quest-media-qa:test-marker';
    const assets = [
      asset('banner_en'),
      asset('banner_th'),
      asset('sub_banner_en'),
      asset('sub_banner_th'),
    ];
    const command = {
      request_key: 'quest-media:qa:test-command',
      payload_hash: 'a'.repeat(64),
      quest_id: questId,
      attempt_token: 'attempt-1',
      status: 'committed',
      committed_revision: 1,
      qa_marker: marker,
      qa_cleanup_nonce_hash: createHash('sha256').update(nonce).digest('hex'),
      planned_assets: assets.map((item, index) => ({
        role: ['banner_en', 'banner_th', 'sub_banner_en', 'sub_banner_th'][
          index
        ],
        asset: item,
      })),
    };
    const quest = {
      _id: questId,
      campaign_revision: 1,
      media_command_key: command.request_key,
      media_attempt_token: command.attempt_token,
      qa_marker: marker,
      banner_en: assets[0].url,
      banner_th: assets[1].url,
      sub_banner_en: assets[2].url,
      sub_banner_th: assets[3].url,
    };
    commandModel.findOne.mockReturnValue(query(command));
    questModel.findOne.mockReturnValue(query(quest));
    questModel.findOneAndDelete.mockResolvedValue(quest);
    cleanupModel.countDocuments
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    await expect(
      service().cleanupAcceptance({
        quest_id: String(questId),
        request_key: command.request_key,
        qa_marker: marker,
        cleanup_nonce: nonce,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        quest_deleted: true,
        objects_deleted: 4,
        intent_deleted: true,
        tombstones_deleted: 4,
      }),
    );

    expect(commandModel.findOne).toHaveBeenCalledWith({
      request_key: { $eq: command.request_key },
      quest_id: { $eq: questId },
      status: 'committed',
      qa_marker: { $eq: marker },
    });
    expect(questModel.findOne).toHaveBeenCalledWith({
      _id: { $eq: questId },
      qa_marker: { $eq: marker },
      media_command_key: { $eq: command.request_key },
      media_attempt_token: command.attempt_token,
      campaign_revision: command.committed_revision,
    });

    expect(cleanup.journal).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'qa-acceptance',
        assets,
      }),
    );
    expect(cleanup.journal.mock.invocationCallOrder[0]).toBeLessThan(
      questModel.findOneAndDelete.mock.invocationCallOrder[0],
    );
    expect(questModel.findOneAndDelete).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: { $eq: questId },
        qa_marker: { $eq: marker },
        media_command_key: { $eq: command.request_key },
        media_attempt_token: command.attempt_token,
        campaign_revision: 1,
      }),
    );
    expect(commandModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        request_key: { $eq: command.request_key },
        quest_id: { $eq: questId },
        qa_marker: { $eq: marker },
      }),
      expect.any(Object),
      { new: true },
    );
    expect(commandModel.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        quest_id: { $eq: questId },
        status: 'committed',
        qa_marker: { $eq: marker },
        qa_cleanup_nonce_hash: command.qa_cleanup_nonce_hash,
      }),
    );
    expect(
      commandModel.findOneAndUpdate.mock.invocationCallOrder[0],
    ).toBeLessThan(cleanupModel.deleteMany.mock.invocationCallOrder[0]);
    expect(cleanupModel.deleteMany.mock.invocationCallOrder[0]).toBeLessThan(
      commandModel.deleteMany.mock.invocationCallOrder[0],
    );
  });

  it('resumes exact journaled cleanup after the quest was removed but an object delete transiently failed', async () => {
    process.env.QUEST_MEDIA_QA_ENABLED = 'true';
    const questId = new Types.ObjectId();
    const nonce = 'acceptance-cleanup-retry-nonce-1234567890';
    const marker = 'quest-media-qa:retry-marker';
    const assets = [
      asset('banner_en'),
      asset('banner_th'),
      asset('sub_banner_en'),
      asset('sub_banner_th'),
    ];
    const command = {
      request_key: 'quest-media:qa:test-command',
      payload_hash: 'b'.repeat(64),
      quest_id: questId,
      attempt_token: 'attempt-1',
      status: 'committed',
      committed_revision: 1,
      qa_marker: marker,
      qa_cleanup_nonce_hash: createHash('sha256').update(nonce).digest('hex'),
      planned_assets: assets.map((item, index) => ({
        role: ['banner_en', 'banner_th', 'sub_banner_en', 'sub_banner_th'][
          index
        ],
        asset: item,
      })),
    };
    const cleanupRows = assets.map((item) => ({
      quest_id: questId,
      cleanup_key: `qa-cleanup:${command.request_key}:${command.attempt_token}`,
      replacement_revision: 1,
      reason: 'qa-acceptance',
      status: 'deleted',
      asset: item,
    }));
    commandModel.findOne.mockReturnValue(query(command));
    questModel.findOne.mockReturnValue(query(null));
    cleanupModel.find.mockReturnValue(query(cleanupRows));
    cleanupModel.countDocuments
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    await expect(
      service().cleanupAcceptance({
        quest_id: String(questId),
        request_key: command.request_key,
        qa_marker: marker,
        cleanup_nonce: nonce,
      }),
    ).resolves.toMatchObject({
      quest_deleted: true,
      objects_deleted: 4,
      intent_deleted: true,
      tombstones_deleted: 4,
    });

    expect(cleanup.journal).not.toHaveBeenCalled();
    expect(questModel.findOneAndDelete).not.toHaveBeenCalled();
    expect(cleanup.runForKey).toHaveBeenCalledWith(
      `qa-cleanup:${command.request_key}:${command.attempt_token}`,
    );
    expect(commandModel.deleteMany).toHaveBeenCalledTimes(1);
    expect(cleanupModel.deleteMany).toHaveBeenCalledTimes(1);
  });

  it('rejects a nonce mismatch without journaling or deleting anything', async () => {
    process.env.QUEST_MEDIA_QA_ENABLED = 'true';
    commandModel.findOne.mockReturnValue(
      query({
        qa_cleanup_nonce_hash: createHash('sha256')
          .update('correct-nonce-value-that-is-long')
          .digest('hex'),
      }),
    );

    await expect(
      service().cleanupAcceptance({
        quest_id: new Types.ObjectId().toHexString(),
        request_key: 'quest-media:qa:test-command',
        qa_marker: 'quest-media-qa:test-marker',
        cleanup_nonce: 'wrong-nonce-value-that-is-longer',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(cleanup.journal).not.toHaveBeenCalled();
    expect(questModel.findOneAndDelete).not.toHaveBeenCalled();
  });
});
