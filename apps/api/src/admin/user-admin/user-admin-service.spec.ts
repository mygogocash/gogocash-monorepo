import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { UserAdmin } from './schemas/user-admin.schema';
import { UserAdminService } from './user-admin-service';

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
describe('UserAdminService', () => {
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
        exec: () => Promise.resolve(matches(filter) ? { ...doc } : null),
      })),
    } as unknown as Model<UserAdmin>;
    const jwtService = {
      sign: jest.fn().mockReturnValue('signed-token'),
    } as unknown as JwtService;
    return new UserAdminService(model, jwtService);
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
