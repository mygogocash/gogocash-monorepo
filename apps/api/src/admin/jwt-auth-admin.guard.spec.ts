import { UnauthorizedException } from '@nestjs/common';
import { AuthAdminGuard } from './jwt-auth-admin.guard';

function context(headers: Record<string, string>) {
  const req: { headers: Record<string, string>; user?: unknown } = { headers };
  return {
    ctx: {
      switchToHttp: () => ({ getRequest: () => req }),
      getHandler: () => 'handler',
      getClass: () => 'class',
    } as never,
    req,
  };
}

const reflectorReturning = (isPublic: boolean) =>
  ({ getAllAndOverride: jest.fn().mockReturnValue(isPublic) }) as never;

describe('AuthAdminGuard', () => {
  const activeAdmin = {
    _id: '507f1f77bcf86cd799439011',
    email: 'current@gogocash.co',
    username: 'current-admin',
    role: 'support',
    session_version: 3,
  };
  const connection = (admin: unknown = activeAdmin) => ({
    collection: jest.fn().mockReturnValue({
      findOne: jest.fn().mockResolvedValue(admin),
    }),
  });

  it('allows a @Public route through without any token', async () => {
    const jwt = { verify: jest.fn() } as never;
    const db = connection();
    const guard = new AuthAdminGuard(
      jwt,
      reflectorReturning(true),
      db as never,
    );
    const { ctx } = context({});
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(db.collection).not.toHaveBeenCalled();
  });

  it('rejects a protected route with no bearer token', async () => {
    const jwt = { verify: jest.fn() } as never;
    const guard = new AuthAdminGuard(
      jwt,
      reflectorReturning(false),
      connection() as never,
    );
    const { ctx } = context({});
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('uses the current database role instead of stale token privileges', async () => {
    const claims = {
      sub: activeAdmin._id,
      email: 'old@gogocash.co',
      role: 'superadmin',
      session_version: 3,
    };
    const jwt = { verify: jest.fn().mockReturnValue(claims) } as never;
    const guard = new AuthAdminGuard(
      jwt,
      reflectorReturning(false),
      connection() as never,
    );
    const { ctx, req } = context({ authorization: 'Bearer good.token' });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.user).toEqual({
      ...claims,
      sub: activeAdmin._id,
      email: activeAdmin.email,
      username: activeAdmin.username,
      role: 'support',
      session_version: 3,
    });
  });

  it('rejects a JWT from an earlier credential generation', async () => {
    const jwt = {
      verify: jest.fn().mockReturnValue({
        sub: activeAdmin._id,
        role: 'support',
        session_version: 2,
      }),
    } as never;
    const guard = new AuthAdminGuard(
      jwt,
      reflectorReturning(false),
      connection() as never,
    );
    const { ctx } = context({ authorization: 'Bearer stale.token' });

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('maps missing legacy token and database generations to zero', async () => {
    const legacyAdmin = {
      _id: activeAdmin._id,
      email: activeAdmin.email,
      username: activeAdmin.username,
      role: activeAdmin.role,
    };
    const claims = { sub: activeAdmin._id, role: 'support' };
    const guard = new AuthAdminGuard(
      { verify: jest.fn().mockReturnValue(claims) } as never,
      reflectorReturning(false),
      connection(legacyAdmin) as never,
    );
    const { ctx, req } = context({ authorization: 'Bearer legacy.token' });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.user).toEqual(
      expect.objectContaining({ session_version: 0, role: 'support' }),
    );
  });

  it('rejects a valid token after its admin account is deleted', async () => {
    const jwt = {
      verify: jest.fn().mockReturnValue({
        sub: activeAdmin._id,
        role: 'superadmin',
        session_version: 3,
      }),
    } as never;
    const guard = new AuthAdminGuard(
      jwt,
      reflectorReturning(false),
      connection(null) as never,
    );
    const { ctx } = context({ authorization: 'Bearer revoked.token' });

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a protected route when token verification throws', async () => {
    const jwt = {
      verify: jest.fn(() => {
        throw new Error('jwt expired');
      }),
    } as never;
    const guard = new AuthAdminGuard(
      jwt,
      reflectorReturning(false),
      connection() as never,
    );
    const { ctx } = context({ authorization: 'Bearer bad.token' });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
