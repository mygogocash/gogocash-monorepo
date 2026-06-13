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
  it('allows a @Public route through without any token', () => {
    const jwt = { verify: jest.fn() } as never;
    const guard = new AuthAdminGuard(jwt, reflectorReturning(true));
    const { ctx } = context({});
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('rejects a protected route with no bearer token', () => {
    const jwt = { verify: jest.fn() } as never;
    const guard = new AuthAdminGuard(jwt, reflectorReturning(false));
    const { ctx } = context({});
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('populates req.user from a valid token on a protected route', () => {
    const claims = { sub: 'a1', role: 'superadmin' };
    const jwt = { verify: jest.fn().mockReturnValue(claims) } as never;
    const guard = new AuthAdminGuard(jwt, reflectorReturning(false));
    const { ctx, req } = context({ authorization: 'Bearer good.token' });
    expect(guard.canActivate(ctx)).toEqual(claims);
    expect(req.user).toEqual(claims);
  });

  it('rejects a protected route when token verification throws', () => {
    const jwt = {
      verify: jest.fn(() => {
        throw new Error('jwt expired');
      }),
    } as never;
    const guard = new AuthAdminGuard(jwt, reflectorReturning(false));
    const { ctx } = context({ authorization: 'Bearer bad.token' });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });
});
