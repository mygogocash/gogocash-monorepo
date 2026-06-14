import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';

/**
 * V-5: guards the external/AI integration route POST /involve/create-affiliate-ai
 * with a shared API key. Fail-closed — if the key is unset the route is locked,
 * so an unconfigured deploy can't accidentally leave it open (the old bug).
 */
const ctxWith = (apiKey?: string): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({
        header: (name: string) =>
          name.toLowerCase() === 'x-api-key' ? apiKey : undefined,
      }),
    }),
  }) as unknown as ExecutionContext;

describe('ApiKeyGuard (V-5)', () => {
  const ORIGINAL = process.env.INVOLVE_AI_API_KEY;
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.INVOLVE_AI_API_KEY;
    else process.env.INVOLVE_AI_API_KEY = ORIGINAL;
  });

  it('throws (fail-closed) when INVOLVE_AI_API_KEY is not configured', () => {
    delete process.env.INVOLVE_AI_API_KEY;
    expect(() => new ApiKeyGuard().canActivate(ctxWith('anything'))).toThrow(
      UnauthorizedException,
    );
  });

  it('throws when no x-api-key header is provided', () => {
    process.env.INVOLVE_AI_API_KEY = 'secret-123';
    expect(() => new ApiKeyGuard().canActivate(ctxWith(undefined))).toThrow(
      UnauthorizedException,
    );
  });

  it('throws when the x-api-key does not match', () => {
    process.env.INVOLVE_AI_API_KEY = 'secret-123';
    expect(() => new ApiKeyGuard().canActivate(ctxWith('wrong-key'))).toThrow(
      UnauthorizedException,
    );
  });

  it('allows when the x-api-key matches the configured key', () => {
    process.env.INVOLVE_AI_API_KEY = 'secret-123';
    expect(new ApiKeyGuard().canActivate(ctxWith('secret-123'))).toBe(true);
  });
});
