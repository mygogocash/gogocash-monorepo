import { InternalServerErrorException } from '@nestjs/common';
import { Types } from 'mongoose';

import { MEDIA_FOLDER } from 'src/media/media-folders.config';
import {
  CommandOwnedStoredMediaAsset,
  PreparedCommandOwnedUpload,
} from 'src/media/stored-media.service';

import {
  PolicyMediaWriteInput,
  PolicyMediaWriteService,
} from './policy-media-write.service';

const OWNER_ID = new Types.ObjectId('507f1f77bcf86cd799439011');
const REQUEST_KEY = `offer-create:${OWNER_ID}`;
const PAYLOAD_HASH = 'a'.repeat(64);
const OWNER = { _id: OWNER_ID, title: 'Durable offer' };
const FILE = {
  fieldname: 'logo',
  originalname: 'logo.png',
  encoding: '7bit',
  mimetype: 'image/png',
  size: 4,
  buffer: Buffer.from('logo'),
  destination: '',
  filename: '',
  path: '',
  stream: undefined,
} as unknown as Express.Multer.File;

function valueAt(value: Record<string, any>, path: string) {
  return path.split('.').reduce((current, key) => current?.[key], value);
}

function matches(command: Record<string, any>, filter: Record<string, any>) {
  return Object.entries(filter).every(([key, expected]) => {
    if (key === '$or') {
      return expected.some((candidate: Record<string, any>) =>
        matches(command, candidate),
      );
    }
    if (key === 'planned_assets') {
      const plans = command.planned_assets ?? [];
      if (expected.$elemMatch) {
        return plans.some(
          (plan: Record<string, any>) =>
            plan.role === expected.$elemMatch.role &&
            plan.upload_state === expected.$elemMatch.upload_state &&
            plan.asset?.object_key === expected.$elemMatch['asset.object_key'],
        );
      }
      if (expected.$not?.$elemMatch?.upload_state?.$ne) {
        return !plans.some(
          (plan: Record<string, any>) =>
            plan.upload_state !== expected.$not.$elemMatch.upload_state.$ne,
        );
      }
    }
    const actual = valueAt(command, key);
    if (expected?.$in) return expected.$in.includes(actual);
    if (expected?.$lte) {
      return new Date(actual).getTime() <= expected.$lte.getTime();
    }
    if (expected?.$exists !== undefined) {
      return expected.$exists ? actual !== undefined : actual === undefined;
    }
    if (expected instanceof Types.ObjectId) {
      return String(actual) === String(expected);
    }
    return actual === expected;
  });
}

function applyUpdate(
  command: Record<string, any>,
  update: Record<string, any>,
  options: Record<string, any>,
) {
  for (const [key, value] of Object.entries(update.$set ?? {})) {
    if (key === 'planned_assets.$[planned].upload_state') {
      const role = options.arrayFilters?.[0]?.['planned.role'];
      const objectKey = options.arrayFilters?.[0]?.['planned.asset.object_key'];
      const plan = command.planned_assets?.find(
        (candidate: Record<string, any>) =>
          candidate.role === role && candidate.asset?.object_key === objectKey,
      );
      if (plan) plan.upload_state = value;
      continue;
    }
    command[key] = value;
  }
  for (const key of Object.keys(update.$unset ?? {})) delete command[key];
}

function makeHarness(options: { commitReplyLost?: boolean } = {}) {
  let command: Record<string, any> | null = null;
  let nextPrimaryReadFailure: Error | undefined;
  const queries: Array<Record<string, jest.Mock>> = [];

  const query = (readValue: () => unknown) => {
    let primary = false;
    const result: Record<string, jest.Mock> = {
      read: jest.fn((preference: string) => {
        primary = preference === 'primary';
        return result;
      }),
      session: jest.fn(() => result),
      limit: jest.fn(() => result),
      lean: jest.fn(async () => {
        if (primary && nextPrimaryReadFailure) {
          const error = nextPrimaryReadFailure;
          nextPrimaryReadFailure = undefined;
          throw error;
        }
        return readValue();
      }),
    };
    queries.push(result);
    return result;
  };

  const commandModel = {
    find: jest.fn((filter: Record<string, any>) =>
      query(() => (command && matches(command, filter) ? [command] : [])),
    ),
    findOne: jest.fn((filter: Record<string, any>) =>
      query(() => (command && matches(command, filter) ? command : null)),
    ),
    findOneAndUpdate: jest.fn(
      (
        filter: Record<string, any>,
        update: Record<string, any>,
        settings: Record<string, any> = {},
      ) =>
        query(() => {
          if (!command || !matches(command, filter)) return null;
          applyUpdate(command, update, settings);
          return command;
        }),
    ),
    create: jest.fn(async (rows: Record<string, any>[]) => {
      command = {
        ...rows[0],
        planned_assets: rows[0].planned_assets.map(
          (plan: Record<string, any>) => ({
            ...plan,
            asset: { ...plan.asset },
          }),
        ),
      };
      return rows;
    }),
  };

  const journalSession = {
    withTransaction: jest.fn(async (writer: () => Promise<void>) => writer()),
    endSession: jest.fn().mockResolvedValue(undefined),
  };
  const commitSession = {
    withTransaction: jest.fn(async (writer: () => Promise<void>) => {
      await writer();
      if (options.commitReplyLost) {
        throw new Error('commit reply lost after durable commit');
      }
    }),
    endSession: jest.fn().mockResolvedValue(undefined),
  };
  const connection = {
    startSession: jest
      .fn()
      .mockResolvedValueOnce(journalSession)
      .mockResolvedValueOnce(commitSession),
  };
  const assetFor = (
    ownerKey: string,
    attemptToken: string,
  ): CommandOwnedStoredMediaAsset => ({
    provider: 'r2',
    ownership: 'command-owned',
    owner_key: ownerKey,
    owner_attempt_token: attemptToken,
    url: `https://media.example/brands/${attemptToken}/logo.png`,
    bucket: 'media',
    object_key: `brands/${ownerKey}/${attemptToken}/${'b'.repeat(64)}.png`,
    sha256: 'b'.repeat(64),
    original_name: 'logo.png',
    content_type: 'image/png',
  });
  const media = {
    prepareCommandOwned: jest.fn(
      async (
        file: Express.Multer.File,
        _folder: string,
        ownerKey: string,
        attemptToken: string,
      ): Promise<PreparedCommandOwnedUpload> => ({
        file,
        access: 'public',
        asset: assetFor(ownerKey, attemptToken),
      }),
    ),
    putCommandOwned: jest.fn(
      async (prepared: PreparedCommandOwnedUpload) => prepared.asset,
    ),
  };
  const registry = {
    registerCommandOwnedInSession: jest.fn().mockResolvedValue({}),
    touchAttachInSession: jest.fn().mockResolvedValue({ tracked: true }),
  };
  const cleanup = {
    compensateMediaWriteCommand: jest.fn().mockResolvedValue(true),
  };
  const integrityFence = {
    assertReady: jest.fn().mockResolvedValue(undefined),
    fenceReady: jest.fn().mockResolvedValue(undefined),
    withIntegrityMutation: jest.fn((writer) =>
      writer({ id: 'integrity-session' }),
    ),
  };
  const service = new PolicyMediaWriteService(
    connection as never,
    commandModel as never,
    media as never,
    registry as never,
    cleanup as never,
    integrityFence as never,
  );

  return {
    service,
    commandModel,
    journalSession,
    commitSession,
    media,
    registry,
    cleanup,
    integrityFence,
    queries,
    command: () => command,
    clearCommand: () => {
      command = null;
    },
    setCommand: (next: Record<string, any>) => {
      command = next;
    },
    failNextPrimaryRead: (error: Error) => {
      nextPrimaryReadFailure = error;
    },
  };
}

function input(
  overrides: Partial<PolicyMediaWriteInput<typeof OWNER>> = {},
): PolicyMediaWriteInput<typeof OWNER> {
  return {
    requestKey: REQUEST_KEY,
    payloadHash: PAYLOAD_HASH,
    ownerType: 'offer',
    ownerId: OWNER_ID,
    operation: 'offer-create',
    uploads: [{ role: 'logo', file: FILE, folder: MEDIA_FOLDER.BRANDS }],
    commit: jest.fn().mockResolvedValue(OWNER),
    readCommittedOwner: jest.fn().mockResolvedValue(OWNER),
    ...overrides,
  };
}

describe('PolicyMediaWriteService', () => {
  it('journals a zero-asset offer-create before the owner write and resolves a lost commit reply from primary', async () => {
    const harness = makeHarness({ commitReplyLost: true });
    const commit = jest.fn().mockResolvedValue(OWNER);
    const readCommittedOwner = jest.fn().mockResolvedValue(OWNER);

    await expect(
      harness.service.execute(
        input({ uploads: [], commit, readCommittedOwner }),
      ),
    ).resolves.toEqual(OWNER);

    expect(harness.commandModel.create).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          request_key: REQUEST_KEY,
          owner_id: OWNER_ID,
          operation: 'offer-create',
          status: 'uploading',
          planned_assets: [],
        }),
      ],
      { session: harness.journalSession },
    );
    expect(
      harness.commandModel.create.mock.invocationCallOrder[0],
    ).toBeLessThan(commit.mock.invocationCallOrder[0]);
    expect(harness.media.prepareCommandOwned).not.toHaveBeenCalled();
    expect(harness.media.putCommandOwned).not.toHaveBeenCalled();
    expect(
      harness.registry.registerCommandOwnedInSession,
    ).not.toHaveBeenCalled();
    expect(harness.registry.touchAttachInSession).not.toHaveBeenCalled();
    expect(harness.command()).toMatchObject({
      status: 'committed',
      planned_assets: [],
    });
    expect(readCommittedOwner).toHaveBeenCalledTimes(1);
    expect(harness.cleanup.compensateMediaWriteCommand).not.toHaveBeenCalled();
  });

  it('durably journals the exact command and registry asset before Put, then commits the owner and command', async () => {
    const harness = makeHarness();

    await expect(harness.service.execute(input())).resolves.toEqual(OWNER);

    expect(harness.commandModel.create).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          request_key: REQUEST_KEY,
          owner_id: OWNER_ID,
          status: 'uploading',
          planned_assets: [
            expect.objectContaining({
              role: 'logo',
              upload_state: 'planned',
              asset: expect.objectContaining({
                owner_key: `${REQUEST_KEY}:logo`,
                object_key: expect.any(String),
              }),
            }),
          ],
        }),
      ],
      { session: harness.journalSession },
    );
    expect(
      harness.commandModel.create.mock.invocationCallOrder[0],
    ).toBeLessThan(harness.media.putCommandOwned.mock.invocationCallOrder[0]);
    expect(
      harness.registry.registerCommandOwnedInSession.mock
        .invocationCallOrder[0],
    ).toBeLessThan(harness.media.putCommandOwned.mock.invocationCallOrder[0]);
    expect(harness.command()).toMatchObject({
      status: 'committed',
      planned_assets: [{ upload_state: 'confirmed' }],
    });
    expect(harness.cleanup.compensateMediaWriteCommand).not.toHaveBeenCalled();
  });

  it('returns the authoritative owner and refuses cleanup when commit succeeds but its reply is lost', async () => {
    const harness = makeHarness({ commitReplyLost: true });
    const readCommittedOwner = jest.fn().mockResolvedValue(OWNER);

    await expect(
      harness.service.execute(input({ readCommittedOwner })),
    ).resolves.toEqual(OWNER);

    expect(harness.command()).toMatchObject({ status: 'committed' });
    expect(readCommittedOwner).toHaveBeenCalledTimes(1);
    expect(
      harness.queries[harness.queries.length - 1]?.read,
    ).toHaveBeenCalledWith('primary');
    expect(harness.cleanup.compensateMediaWriteCommand).not.toHaveBeenCalled();
  });

  it('fails closed without cleanup when the authoritative command reread is unavailable', async () => {
    const harness = makeHarness();
    const commitFailure = new Error('owner mutation rejected');
    const primaryFailure = new Error('primary unavailable');
    const commit = jest.fn(async () => {
      harness.failNextPrimaryRead(primaryFailure);
      throw commitFailure;
    });

    await expect(harness.service.execute(input({ commit }))).rejects.toEqual(
      expect.objectContaining<Partial<InternalServerErrorException>>({
        message:
          'Media write outcome is uncertain; cleanup was refused: primary unavailable',
      }),
    );
    expect(harness.cleanup.compensateMediaWriteCommand).not.toHaveBeenCalled();
  });

  it('uses the durable command fence for compensation when Put fails ambiguously', async () => {
    const harness = makeHarness();
    harness.media.putCommandOwned.mockRejectedValueOnce(
      new Error('Put response lost'),
    );

    await expect(harness.service.execute(input())).rejects.toThrow(
      'Put response lost',
    );

    const command = harness.command()!;
    expect(command).toMatchObject({
      status: 'compensating',
      compensation_token: expect.any(String),
      last_error: 'Put response lost',
    });
    expect(harness.cleanup.compensateMediaWriteCommand).toHaveBeenCalledWith(
      REQUEST_KEY,
      command.compensation_token,
    );
  });

  it('treats a missing durable command as uncertain and never attempts a blind cleanup', async () => {
    const harness = makeHarness();
    harness.media.putCommandOwned.mockImplementationOnce(async () => {
      harness.clearCommand();
      throw new Error('Put failed after command disappeared');
    });

    await expect(harness.service.execute(input())).rejects.toThrow(
      'Media write outcome is uncertain because its durable command is missing; cleanup was refused',
    );
    expect(harness.cleanup.compensateMediaWriteCommand).not.toHaveBeenCalled();
  });

  it('recovers an expired post-journal crash through the same fenced cleanup command', async () => {
    const harness = makeHarness();
    harness.setCommand({
      request_key: REQUEST_KEY,
      payload_hash: PAYLOAD_HASH,
      owner_type: 'offer',
      owner_id: OWNER_ID,
      operation: 'offer-create',
      status: 'uploading',
      attempt_token: 'expired-attempt',
      lease_expires_at: new Date(Date.now() - 1_000),
      attempts: 1,
      planned_assets: [
        {
          role: 'logo',
          folder: MEDIA_FOLDER.BRANDS,
          upload_state: 'planned',
          asset: {
            provider: 'r2',
            ownership: 'command-owned',
            owner_key: `${REQUEST_KEY}:logo`,
            owner_attempt_token: 'expired-attempt',
            url: 'https://media.example/brands/expired/logo.png',
            bucket: 'media',
            object_key: `brands/${REQUEST_KEY}/expired/${'b'.repeat(64)}.png`,
            sha256: 'b'.repeat(64),
            original_name: 'logo.png',
          },
        },
      ],
    });

    await expect(harness.service.recoverExpiredCommands()).resolves.toBe(1);

    const recovered = harness.command()!;
    expect(recovered).toMatchObject({
      status: 'compensating',
      compensation_token: expect.any(String),
      last_error: 'Expired durable media write requires fenced compensation',
    });
    expect(harness.cleanup.compensateMediaWriteCommand).toHaveBeenCalledWith(
      REQUEST_KEY,
      recovered.compensation_token,
    );
    expect(harness.integrityFence.withIntegrityMutation).toHaveBeenCalledTimes(
      1,
    );
    expect(harness.commandModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      expect.objectContaining({ session: { id: 'integrity-session' } }),
    );
  });

  it('recovery leaves an expired command untouched while the migration marker is not ready', async () => {
    const harness = makeHarness();
    harness.setCommand({
      request_key: REQUEST_KEY,
      payload_hash: PAYLOAD_HASH,
      owner_type: 'offer',
      owner_id: OWNER_ID,
      operation: 'offer-create',
      status: 'uploading',
      attempt_token: 'expired-attempt',
      lease_expires_at: new Date(Date.now() - 1_000),
      attempts: 1,
      planned_assets: [],
    });
    harness.integrityFence.withIntegrityMutation.mockRejectedValueOnce(
      new Error('integrity migration applying'),
    );

    await expect(harness.service.recoverExpiredCommands()).rejects.toThrow(
      'integrity migration applying',
    );

    expect(harness.command()).toMatchObject({
      status: 'uploading',
      attempt_token: 'expired-attempt',
    });
    expect(harness.cleanup.compensateMediaWriteCommand).not.toHaveBeenCalled();
  });
  it('recoverExpiredCommandsOnSchedule > given CRON_ENABLED=false > then never starts command recovery', async () => {
    const originalCronEnabled = process.env.CRON_ENABLED;
    process.env.CRON_ENABLED = 'false';
    try {
      const harness = makeHarness();
      const recover = jest
        .spyOn(harness.service, 'recoverExpiredCommands')
        .mockResolvedValue(0);

      await harness.service.recoverExpiredCommandsOnSchedule();

      expect(recover).not.toHaveBeenCalled();
    } finally {
      if (originalCronEnabled === undefined) delete process.env.CRON_ENABLED;
      else process.env.CRON_ENABLED = originalCronEnabled;
    }
  });
});
