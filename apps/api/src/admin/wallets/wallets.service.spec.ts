import { WalletsService } from './wallets.service';

const userId = '507f1f77bcf86cd799439011';
const actor = { id: 'admin-1', label: 'ops@gogocash.co' };

const query = <T>(value: T) => ({
  lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(value) }),
});

describe('WalletsService activity provenance', () => {
  const append = jest.fn().mockResolvedValue(undefined);
  const findByIdAndUpdate = jest.fn();
  const service = new WalletsService(
    { findByIdAndUpdate } as never,
    {} as never,
    {} as never,
    {} as never,
    { append } as never,
  );

  beforeEach(() => {
    append.mockClear();
    findByIdAndUpdate.mockReset();
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
});
