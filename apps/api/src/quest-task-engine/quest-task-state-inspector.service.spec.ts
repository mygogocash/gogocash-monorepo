import { ServiceUnavailableException } from '@nestjs/common';

import { QuestTaskStateInspectorService } from './quest-task-state-inspector.service';

describe('QuestTaskStateInspectorService', () => {
  function service() {
    const session = {
      withTransaction: jest.fn(async (operation: () => Promise<void>) =>
        operation(),
      ),
      endSession: jest.fn().mockResolvedValue(undefined),
    };
    const connection = { startSession: jest.fn().mockResolvedValue(session) };
    const questModel = {
      findById: jest.fn().mockResolvedValue({
        start_date: new Date('2026-08-01T00:00:00.000Z'),
        end_date: new Date('2026-08-31T23:59:59.999Z'),
      }),
    };
    const progressModel = { findOne: jest.fn().mockResolvedValue(null) };
    const pointModel = { findOne: jest.fn().mockResolvedValue(null) };
    const accountTransitionModel = {
      findOne: jest.fn().mockResolvedValue(null),
    };
    const conversionTransitionModel = {
      findOne: jest.fn().mockResolvedValue(null),
    };
    const transactions = {
      assertEnabledAndReady: jest.fn().mockResolvedValue({ supported: true }),
    };
    const revisionFence = {
      touchSourceConfigFenceInSession: jest.fn().mockResolvedValue(undefined),
    };
    return {
      inspector: new QuestTaskStateInspectorService(
        connection as never,
        questModel as never,
        progressModel as never,
        pointModel as never,
        accountTransitionModel as never,
        conversionTransitionModel as never,
        transactions as never,
        revisionFence as never,
      ),
      session,
      connection,
      questModel,
      progressModel,
      pointModel,
      accountTransitionModel,
      conversionTransitionModel,
      transactions,
      revisionFence,
    };
  }

  it('fails readiness before invoking a task-v2 config mutation', async () => {
    const mocks = service();
    const unavailable = new ServiceUnavailableException('standalone');
    mocks.transactions.assertEnabledAndReady.mockRejectedValue(unavailable);
    const mutate = jest.fn();

    await expect(
      mocks.inspector.withTaskConfigEditFence(
        '68bf99fed9667685c1637607',
        mutate,
      ),
    ).rejects.toBe(unavailable);
    expect(mutate).not.toHaveBeenCalled();
    expect(mocks.connection.startSession).not.toHaveBeenCalled();
    expect(mocks.questModel.findById).not.toHaveBeenCalled();
  });

  it('runs source inspection and the config callback in one fenced session', async () => {
    const mocks = service();
    mocks.progressModel.findOne.mockResolvedValue({ _id: 'progress' });
    mocks.pointModel.findOne.mockResolvedValue({ _id: 'award' });
    mocks.accountTransitionModel.findOne.mockResolvedValue({ _id: 'source' });
    const operation = jest.fn().mockResolvedValue('saved');
    const candidateWindow = {
      start_at: new Date('2026-09-01T00:00:00.000Z'),
      end_at: new Date('2026-09-30T23:59:59.999Z'),
    };

    await expect(
      mocks.inspector.withTaskConfigEditFence(
        '68bf99fed9667685c1637607',
        operation,
        candidateWindow,
      ),
    ).resolves.toBe('saved');
    expect(
      mocks.revisionFence.touchSourceConfigFenceInSession,
    ).toHaveBeenCalledWith(mocks.session);
    expect(mocks.accountTransitionModel.findOne).toHaveBeenCalledWith(
      {
        occurred_at: {
          $gte: candidateWindow.start_at,
          $lte: candidateWindow.end_at,
        },
      },
      '_id',
      { session: mocks.session },
    );
    expect(operation).toHaveBeenCalledWith(
      {
        has_outbox: true,
        has_progress: true,
        has_award: true,
      },
      mocks.session,
    );
  });
});
