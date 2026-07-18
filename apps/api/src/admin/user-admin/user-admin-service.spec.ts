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

describe('UserAdminService credential generations', () => {
  it('embeds the current session version and never returns the password hash', async () => {
    const password = await bcrypt.hash('secret-pass', 4);
    const admin = {
      _id: '507f1f77bcf86cd799439011',
      email: 'owner@gogocash.co',
      username: 'owner',
      password,
      role: 'superadmin',
      session_version: 7,
      toObject: () => ({
        _id: '507f1f77bcf86cd799439011',
        email: 'owner@gogocash.co',
        username: 'owner',
        password,
        role: 'superadmin',
        session_version: 7,
      }),
    };
    const exec = jest.fn().mockResolvedValue(admin);
    const select = jest.fn().mockReturnValue({ exec });
    const findOne = jest.fn().mockReturnValue({ select });
    const sign = jest.fn().mockReturnValue('signed-token');
    const service = new UserAdminService(
      { findOne } as never,
      { sign } as never,
      { append: jest.fn() } as never,
    );

    const result = await service.login({
      email: 'owner@gogocash.co',
      password: 'secret-pass',
    });

    expect(select).toHaveBeenCalledWith('+password');
    expect(sign).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: admin._id,
        role: 'superadmin',
        session_version: 7,
      }),
      expect.any(Object),
    );
    expect(result).toEqual(
      expect.objectContaining({ token: 'signed-token', session_version: 7 }),
    );
    expect(result).not.toHaveProperty('password');
  });

  it('maps a legacy admin without a session version to generation zero', async () => {
    const password = await bcrypt.hash('secret-pass', 4);
    const admin = {
      _id: '507f1f77bcf86cd799439011',
      email: 'legacy@gogocash.co',
      username: 'legacy',
      password,
      role: 'viewer',
    };
    const exec = jest.fn().mockResolvedValue(admin);
    const findOne = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({ exec }),
    });
    const sign = jest.fn().mockReturnValue('signed-token');
    const service = new UserAdminService(
      { findOne } as never,
      { sign } as never,
      { append: jest.fn() } as never,
    );

    await service.login({
      email: 'legacy@gogocash.co',
      password: 'secret-pass',
    });

    expect(sign).toHaveBeenCalledWith(
      expect.objectContaining({ session_version: 0 }),
      expect.any(Object),
    );
  });
});
