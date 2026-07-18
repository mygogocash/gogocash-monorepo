import { createHash } from 'node:crypto';
import { WalletsService } from './wallets.service';

const userId = '507f1f77bcf86cd799439011';
const actor = { id: 'admin-1', label: 'ops@gogocash.co' };

const query = <T>(value: T) => {
  const result: Record<string, jest.Mock> = {};
  for (const method of ['lean', 'session', 'select', 'sort', 'skip', 'limit']) {
    result[method] = jest.fn().mockReturnValue(result);
  }
  result.exec = jest.fn().mockResolvedValue(value);
  return result;
};

describe('WalletsService', () => {
  const append = jest.fn().mockResolvedValue(undefined);
  const appendRequired = jest.fn().mockResolvedValue(undefined);
  const findByIdAndUpdate = jest.fn();
  const findOneAndUpdate = jest.fn();
  const find = jest.fn();
  const countDocuments = jest.fn();
  const adjustmentFindOne = jest.fn();
  const adjustmentCreate = jest.fn();
  const checkWithdraw = jest.fn();
  const session = {
    withTransaction: jest.fn(async (work: () => Promise<void>) => work()),
    endSession: jest.fn().mockResolvedValue(undefined),
  };
  const service = new WalletsService(
    { findByIdAndUpdate, findOneAndUpdate, find, countDocuments } as never,
    {} as never,
    {} as never,
    { findOne: adjustmentFindOne, create: adjustmentCreate } as never,
    { append, appendRequired } as never,
    { checkWithdraw } as never,
    { startSession: jest.fn().mockResolvedValue(session) } as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    session.withTransaction.mockImplementation(async (work) => work());
  });

  it.each([
    ['freeze', true],
    ['unfreeze', false],
  ] as const)(
    '%s logs the verified actor after the user mutation',
    async (method, frozen) => {
      findByIdAndUpdate.mockReturnValue(
        query({ _id: userId, wallet_frozen: frozen }),
      );

      await service[method](userId, actor);

      expect(append).toHaveBeenCalledWith(
        expect.objectContaining({
          actor_type: 'admin',
          actor_id: actor.id,
          actor_label: actor.label,
          action: frozen ? 'wallet.frozen' : 'wallet.unfrozen',
          entity_id: userId,
        }),
      );
      expect(findByIdAndUpdate.mock.invocationCallOrder[0]).toBeLessThan(
        append.mock.invocationCallOrder[0],
      );
    },
  );

  it('escapes wallet search as a literal regex and caps page size', async () => {
    let filter: Record<string, unknown> | undefined;
    find.mockImplementation((value) => {
      filter = value;
      return query([]);
    });
    countDocuments.mockReturnValue(query(0));

    await service.findAll({ search: 'a.*(b)', limit: '999' });

    expect(filter).toEqual({
      $or: [
        { email: { $regex: 'a\\.\\*\\(b\\)', $options: 'i' } },
        { username: { $regex: 'a\\.\\*\\(b\\)', $options: 'i' } },
      ],
    });
  });

  it('commits one canonical credit and audits inside the same transaction', async () => {
    findOneAndUpdate.mockReturnValue(query({ _id: userId }));
    adjustmentFindOne.mockReturnValue(query(null));
    const adjustment = {
      _id: 'adjustment-1',
      toObject: () => ({ _id: 'adjustment-1' }),
    };
    adjustmentCreate.mockResolvedValue([adjustment]);

    await service.adjust(
      userId,
      { type: 'credit', amount: 25, currency: 'THB', reason: ' Reward ' },
      actor,
      'idem-1',
    );

    expect(adjustmentCreate).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          type: 'credit',
          amount: 25,
          currency: 'THB',
          reason: 'Reward',
          idempotency_key: 'idem-1',
        }),
      ],
      { session },
    );
    expect(appendRequired).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'wallet.adjusted',
        actor_id: actor.id,
        entity_id: userId,
      }),
      session,
    );
    expect(append).not.toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalled();
    expect(adjustmentCreate.mock.invocationCallOrder[0]).toBeLessThan(
      appendRequired.mock.invocationCallOrder[0],
    );
  });

  it('returns an exact idempotent replay without another credit or audit', async () => {
    const effectHash = createHash('sha256')
      .update(
        JSON.stringify({
          amount: 25,
          currency: 'THB',
          reason: 'Reward',
          type: 'credit',
        }),
      )
      .digest('hex');
    findOneAndUpdate.mockReturnValue(query({ _id: userId }));
    adjustmentFindOne.mockReturnValue(
      query({
        _id: 'adjustment-1',
        idempotency_effect_hash: effectHash,
        toObject: () => ({ _id: 'adjustment-1' }),
      }),
    );

    await service.adjust(
      userId,
      { type: 'credit', amount: 25, currency: 'THB', reason: 'Reward' },
      actor,
      'idem-1',
    );

    expect(adjustmentCreate).not.toHaveBeenCalled();
    expect(appendRequired).not.toHaveBeenCalled();
    expect(append).not.toHaveBeenCalled();
  });

  it('rejects a debit larger than the authoritative balance', async () => {
    findOneAndUpdate.mockReturnValue(query({ _id: userId }));
    adjustmentFindOne.mockReturnValue(query(null));
    checkWithdraw.mockResolvedValue({ netAmountTHB: 10, netAmount: 1 });

    await expect(
      service.adjust(
        userId,
        { type: 'debit', amount: 11, currency: 'THB', reason: 'Correction' },
        actor,
        'idem-debit',
      ),
    ).rejects.toMatchObject({ status: 409 });

    expect(adjustmentCreate).not.toHaveBeenCalled();
    expect(appendRequired).not.toHaveBeenCalled();
    expect(append).not.toHaveBeenCalled();
  });
});
