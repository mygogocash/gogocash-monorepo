import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AdminActivityService } from './admin-activity.service';
import { AdminActivityEvent } from './schemas/admin-activity-event.schema';

describe('AdminActivityService', () => {
  let service: AdminActivityService;
  let activityModel: {
    create: jest.Mock;
    find: jest.Mock;
    countDocuments: jest.Mock;
  };

  beforeEach(async () => {
    const leanExec = jest.fn().mockResolvedValue([]);
    const chain = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnValue({ exec: leanExec }),
      exec: leanExec,
    };
    activityModel = {
      create: jest.fn().mockResolvedValue({}),
      find: jest.fn().mockReturnValue(chain),
      countDocuments: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      }),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AdminActivityService,
        {
          provide: getModelToken(AdminActivityEvent.name),
          useValue: activityModel,
        },
      ],
    }).compile();

    service = moduleRef.get(AdminActivityService);
  });

  it('append > given valid event > then persists with occurred_at', async () => {
    await service.append({
      actor_type: 'admin',
      actor_id: 'admin-1',
      actor_label: 'ops@gogocash.com',
      action: 'withdraw.status_changed',
      entity_type: 'withdraw',
      entity_id: 'w1',
      summary: 'Withdraw rejected',
      metadata: { from: 'pending', to: 'rejected' },
    });

    expect(activityModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_type: 'admin',
        action: 'withdraw.status_changed',
        entity_type: 'withdraw',
        entity_id: 'w1',
        summary: 'Withdraw rejected',
        occurred_at: expect.any(Date),
      }),
    );
  });

  it('append > given create throws > then propagates the failure', async () => {
    activityModel.create.mockRejectedValue(new Error('mongo down'));
    await expect(
      service.append({
        actor_type: 'system',
        action: 'wallet.adjusted',
        entity_type: 'wallet',
        summary: 'x',
      }),
    ).rejects.toThrow('mongo down');
  });

  it('appendRequired > writes through the supplied transaction session', async () => {
    const session = { id: 'audit-session' } as never;

    await service.appendRequired(
      {
        actor_type: 'admin',
        actor_id: 'admin-1',
        actor_label: 'ops@gogocash.com',
        action: 'wallet.adjusted',
        entity_type: 'wallet_adjustment',
        entity_id: 'adjustment-1',
        summary: 'Credited customer wallet',
      },
      session,
    );

    expect(activityModel.create).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          action: 'wallet.adjusted',
          entity_id: 'adjustment-1',
          occurred_at: expect.any(Date),
        }),
      ],
      { session },
    );
  });

  it('appendRequired > propagates persistence failure so the mutation aborts', async () => {
    activityModel.create.mockRejectedValue(new Error('mongo down'));

    await expect(
      service.appendRequired(
        {
          actor_type: 'admin',
          actor_id: 'admin-1',
          actor_label: 'ops@gogocash.com',
          action: 'admin_user.deleted',
          entity_type: 'admin_user',
          summary: 'Deleted admin',
        },
        {} as never,
      ),
    ).rejects.toThrow('mongo down');
  });

  it('list > given filters > then queries newest first with pagination', async () => {
    const result = await service.list({
      page: 2,
      limit: 10,
      action: 'withdraw.status_changed',
      search: 'rejected',
    });

    expect(activityModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'withdraw.status_changed',
        $or: expect.any(Array),
      }),
    );
    expect(result).toEqual({ data: [], total: 0, page: 2, limit: 10 });
  });

  it('list > redacts payout-evidence metadata keys for viewers', async () => {
    const leanExec = jest.fn().mockResolvedValue([
      {
        action: 'withdraw.slip_updated',
        summary: 'Updated withdrawal payout evidence',
        metadata: {
          slip_file: 'gs://bucket/slip.png',
          previous_slip_file: 'gs://bucket/old.png',
          status: 'approved',
        },
      },
    ]);
    activityModel.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnValue({ exec: leanExec }),
      exec: leanExec,
    });

    const result = await service.list({ page: 1, limit: 20 });

    expect(result.data[0].metadata).toEqual({
      slip_file: '[redacted]',
      previous_slip_file: '[redacted]',
      status: 'approved',
    });
  });

  it('list > accepts integer query-string pagination values', async () => {
    const result = await service.list({ page: '2', limit: '10' });

    expect(result).toMatchObject({ page: 2, limit: 10 });
  });

  it.each([
    [{ page: 0 }, 'page'],
    [{ limit: 101 }, 'limit'],
    [{ from: 'not-a-date' }, 'from'],
    [{ from: '2026-02-01', to: '2026-01-01' }, 'range'],
    [{ search: 'x'.repeat(101) }, 'search'],
  ])('list > rejects unsafe %s query input', async (query, _field) => {
    await expect(service.list(query)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(activityModel.find).not.toHaveBeenCalled();
  });
});
