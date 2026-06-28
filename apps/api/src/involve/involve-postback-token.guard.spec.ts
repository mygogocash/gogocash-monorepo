import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { InvolvePostbackTokenGuard } from './involve-postback-token.guard';

const ctxWith = (token?: string): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({
        query: token === undefined ? {} : { token },
      }),
    }),
  }) as unknown as ExecutionContext;

describe('InvolvePostbackTokenGuard', () => {
  const ORIGINAL = process.env.INVOLVE_POSTBACK_SECRET;

  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.INVOLVE_POSTBACK_SECRET;
    else process.env.INVOLVE_POSTBACK_SECRET = ORIGINAL;
  });

  it('throws (fail-closed) when INVOLVE_POSTBACK_SECRET is not configured', () => {
    delete process.env.INVOLVE_POSTBACK_SECRET;
    expect(() =>
      new InvolvePostbackTokenGuard().canActivate(ctxWith('anything')),
    ).toThrow(UnauthorizedException);
  });

  it('throws when token query param is missing', () => {
    process.env.INVOLVE_POSTBACK_SECRET = 'postback-secret';
    expect(() => new InvolvePostbackTokenGuard().canActivate(ctxWith())).toThrow(
      UnauthorizedException,
    );
  });

  it('throws when token does not match', () => {
    process.env.INVOLVE_POSTBACK_SECRET = 'postback-secret';
    expect(() =>
      new InvolvePostbackTokenGuard().canActivate(ctxWith('wrong')),
    ).toThrow(UnauthorizedException);
  });

  it('allows when token matches the configured secret', () => {
    process.env.INVOLVE_POSTBACK_SECRET = 'postback-secret';
    expect(
      new InvolvePostbackTokenGuard().canActivate(ctxWith('postback-secret')),
    ).toBe(true);
  });
});
