import { QuestOutboxConsumerService } from './quest-outbox-consumer.service';

describe('QuestOutboxConsumerService', () => {
  function service(progressError?: Error) {
    const leased = {
      _id: 'outbox-1',
      source_type: 'account_registration',
      source_event_id: 'account:user-1:created:v1',
      attempts: 1,
    };
    const session = {
      withTransaction: jest.fn(async (operation: () => Promise<void>) =>
        operation(),
      ),
      endSession: jest.fn().mockResolvedValue(undefined),
    };
    const connection = { startSession: jest.fn().mockResolvedValue(session) };
    const outboxModel = {
      findOneAndUpdate: jest.fn().mockResolvedValue(leased),
      findOne: jest.fn().mockResolvedValue(leased),
      updateOne: jest
        .fn()
        .mockResolvedValueOnce({ matchedCount: 1 })
        .mockResolvedValue({ matchedCount: 1 }),
    };
    const ingestionModel = {
      findOne: jest.fn().mockResolvedValue(null),
      updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 }),
    };
    const progress = {
      applyOutboxInSession: progressError
        ? jest.fn().mockRejectedValue(progressError)
        : jest.fn().mockResolvedValue({ effect_count: 1 }),
    };
    const transactions = {
      enabled: true,
      assertReady: jest.fn().mockResolvedValue({ supported: true }),
    };
    return {
      consumer: new QuestOutboxConsumerService(
        connection as never,
        outboxModel as never,
        ingestionModel as never,
        progress as never,
        transactions as never,
      ),
      session,
      outboxModel,
      ingestionModel,
      progress,
      transactions,
    };
  }

  it('marks completion only after effects succeed in the same transaction', async () => {
    const mocks = service();
    await expect(mocks.consumer.drainOne()).resolves.toBe(true);
    expect(mocks.progress.applyOutboxInSession).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'outbox-1' }),
      mocks.session,
    );
    expect(mocks.outboxModel.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'leased' }),
      expect.objectContaining({
        $set: expect.objectContaining({ status: 'completed' }),
      }),
      { session: mocks.session },
    );
  });

  it('leaves a failed effect retryable and never marks the event completed', async () => {
    const mocks = service(new Error('FX unavailable'));
    await expect(mocks.consumer.drainOne()).resolves.toBe(true);
    expect(mocks.outboxModel.updateOne).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        $set: expect.objectContaining({ status: 'completed' }),
      }),
      expect.anything(),
    );
    expect(mocks.outboxModel.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'leased' }),
      expect.objectContaining({
        $set: expect.objectContaining({ status: 'retryable' }),
      }),
    );
    expect(mocks.ingestionModel.updateOne).toHaveBeenCalled();
  });

  it('drains regardless of CRON_ENABLED — v2 jobs are governed only by QUEST_TASK_V2_ENABLED', async () => {
    const originalCronEnabled = process.env.CRON_ENABLED;
    process.env.CRON_ENABLED = 'false';
    try {
      const mocks = service();
      mocks.outboxModel.findOneAndUpdate.mockResolvedValue(null as never);

      await mocks.consumer.scheduledDrain();

      expect(mocks.outboxModel.findOneAndUpdate).toHaveBeenCalled();
    } finally {
      if (originalCronEnabled === undefined) delete process.env.CRON_ENABLED;
      else process.env.CRON_ENABLED = originalCronEnabled;
    }
  });

  it('does not claim source work while task-v2 is disabled', async () => {
    const mocks = service();
    mocks.transactions.enabled = false;
    await expect(mocks.consumer.drainOne()).resolves.toBe(false);
    expect(mocks.outboxModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('does not overwrite or duplicate a terminal ingestion row while recording lease failure', async () => {
    const mocks = service(new Error('base repair conflict'));
    mocks.ingestionModel.findOne.mockResolvedValue({
      _id: 'ingestion-1',
      status: 'completed',
    });
    await expect(mocks.consumer.drainOne()).resolves.toBe(true);
    expect(mocks.ingestionModel.updateOne).not.toHaveBeenCalled();
  });

  it('uses a terminal-status CAS when a nonterminal row can finish after the read', async () => {
    const mocks = service(new Error('expired lease'));
    mocks.ingestionModel.findOne.mockResolvedValue({
      _id: 'ingestion-1',
      status: 'processing',
    });

    await expect(mocks.consumer.drainOne()).resolves.toBe(true);

    expect(mocks.ingestionModel.updateOne).toHaveBeenCalledWith(
      {
        _id: 'ingestion-1',
        status: { $nin: ['completed', 'ignored', 'quarantined'] },
      },
      { $set: { status: 'retryable', error_code: 'expired lease' } },
    );
  });
});
