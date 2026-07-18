import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { UserAdmin } from './schemas/user-admin.schema';
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

    expect(findOne).toHaveBeenCalledWith({
      email: { $eq: 'owner@gogocash.co' },
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

/**
 * UserAdminService.login against a fake model that emulates Mongo filter
 * matching on an in-memory fixture, so these tests pin login BEHAVIOUR
 * (which identifiers can authenticate) rather than the query shape.
 *
 * Why the username case matters (#374): usernames are NOT unique
 * (user-admin.schema.ts only has unique on email, and the invite flow
 * derives usernames from email local-parts), so authenticating by username
 * can resolve to the wrong account. Login must match on email only.
 */
describe('UserAdminService login identity', () => {
  const PASSWORD = 'correct horse battery staple';
  const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 4);

  const storedAdmin = {
    _id: 'admin-1',
    email: 'owner@gogocash.co',
    // Email-shaped username that differs from the account's own email —
    // free-form usernames allow this today (RegisterAdminDto/@IsString).
    username: 'someone-else@gogocash.co',
    role: 'approver',
    password: PASSWORD_HASH,
  };

  const buildService = () => {
    const matches = (filter: Record<string, unknown>): boolean => {
      const or = (filter as { $or?: Record<string, unknown>[] }).$or;
      if (Array.isArray(or)) {
        return or.some(matches);
      }
      return Object.entries(filter).every(([key, expected]) => {
        const actual = (storedAdmin as Record<string, unknown>)[key];
        if (
          expected !== null &&
          typeof expected === 'object' &&
          '$eq' in (expected as Record<string, unknown>)
        ) {
          return actual === (expected as { $eq: unknown }).$eq;
        }
        return actual === expected;
      });
    };
    const doc = {
      ...storedAdmin,
      toObject: () => ({ ...storedAdmin }),
    };
    const model = {
      findOne: jest.fn((filter: Record<string, unknown>) => ({
        select: () => ({
          exec: () => Promise.resolve(matches(filter) ? { ...doc } : null),
        }),
      })),
    } as unknown as Model<UserAdmin>;
    const jwtService = {
      sign: jest.fn().mockReturnValue('signed-token'),
    } as unknown as JwtService;
    return new UserAdminService(model, jwtService, {
      append: jest.fn(),
    } as never);
  };

  it('login > given the account email and a valid password > then returns the account with a token', async () => {
    const service = buildService();

    const result = await service.login({
      email: storedAdmin.email,
      password: PASSWORD,
    });

    expect(result.token).toBe('signed-token');
    expect(result.email).toBe(storedAdmin.email);
  });

  it('login > given an identifier matching only the username of an account > then rejects with the generic invalid-credentials error', async () => {
    const service = buildService();

    await expect(
      service.login({ email: storedAdmin.username, password: PASSWORD }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('login > given an unknown email > then rejects with the generic invalid-credentials error', async () => {
    const service = buildService();

    await expect(
      service.login({ email: 'nobody@gogocash.co', password: PASSWORD }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
