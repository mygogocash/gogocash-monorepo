import * as bcrypt from 'bcrypt';
import { UserAdminService } from './user-admin-service';

const actor = { id: 'admin-1', label: 'owner@gogocash.co' };

describe('UserAdminService activity provenance', () => {
  const append = jest.fn().mockResolvedValue(undefined);
  const create = jest.fn();
  const service = new UserAdminService(
    { create } as never,
    {} as never,
    { append } as never,
  );

  beforeEach(() => {
    create.mockReset();
    append.mockClear();
  });

  it('registers an admin, then records the verified operator', async () => {
    create.mockResolvedValue({
      _id: 'new-admin',
      email: 'new@gogocash.co',
      username: 'new-admin',
      role: 'viewer',
    });

    await service.register(
      {
        email: 'new@gogocash.co',
        username: 'new-admin',
        password: 'secret-pass',
      },
      actor,
    );

    const persisted = create.mock.calls[0][0];
    expect(await bcrypt.compare('secret-pass', persisted.password)).toBe(true);
    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_type: 'admin',
        actor_id: actor.id,
        actor_label: actor.label,
        action: 'admin_user.created',
        entity_id: 'new-admin',
      }),
    );
    expect(create.mock.invocationCallOrder[0]).toBeLessThan(
      append.mock.invocationCallOrder[0],
    );
  });
});
