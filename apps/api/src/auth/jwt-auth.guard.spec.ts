import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { CrossmintAuthGuard } from './jwt-auth.guard';

describe('CrossmintAuthGuard', () => {
  const guard = new CrossmintAuthGuard();

  const contextWithAuth = (authorization?: string): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          headers: authorization ? { authorization } : {},
        }),
      }),
    }) as ExecutionContext;

  it('rejects requests without Authorization (Crossmint path disabled)', () => {
    expect(() => guard.canActivate(contextWithAuth())).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects forged JWTs without verifying decode (Crossmint path disabled)', () => {
    const forged =
      'Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJ1c2VySWQiOiJhdHRhY2tlciJ9.';

    expect(() => guard.canActivate(contextWithAuth(forged))).toThrow(
      /Crossmint sign-in is disabled/,
    );
  });
});
