import { FactoryProvider, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { resendClientProvider, ResendLike } from './resend.provider';

/**
 * The Resend client factory must be null-safe: a missing RESEND_API_KEY (local
 * dev, or any env where email isn't configured) must NOT crash the API at
 * bootstrap. It should degrade to an explicitly unavailable client while still
 * constructing a real Resend client when a key is present.
 */
describe('resendClientProvider (null-safe factory)', () => {
  const factory = (resendClientProvider as FactoryProvider).useFactory as (
    config: ConfigService,
  ) => ResendLike;

  const makeConfig = (key?: string): ConfigService =>
    ({
      get: (k: string) => (k === 'env.RESEND_API_KEY' ? key : undefined),
    }) as unknown as ConfigService;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('given an empty RESEND_API_KEY > reports delivery unavailable without logging the recipient', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const client = factory(makeConfig(''));

    expect(client?.emails?.send).toBeInstanceOf(Function);
    const result = await client.emails.send({
      from: 'a@b.co',
      to: 'private-recipient@example.com',
      subject: 'Private invitation subject',
    });

    expect(result).toEqual({
      data: null,
      error: expect.objectContaining({ message: expect.any(String) }),
    });
    const logged = warn.mock.calls.flat().join(' ');
    expect(logged).not.toContain('private-recipient@example.com');
    expect(logged).not.toContain('Private invitation subject');
  });

  it('given an undefined RESEND_API_KEY > returns an unavailable client instead of throwing', () => {
    expect(() => factory(makeConfig(undefined))).not.toThrow();
    expect(factory(makeConfig(undefined))).not.toBeInstanceOf(Resend);
  });

  it('given a real RESEND_API_KEY > constructs a real Resend client', () => {
    const client = factory(makeConfig('re_test_local_key'));

    expect(client).toBeInstanceOf(Resend);
  });
});
