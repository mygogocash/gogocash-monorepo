import { FactoryProvider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { resendClientProvider, ResendLike } from './resend.provider';

/**
 * The Resend client factory must be null-safe: a missing RESEND_API_KEY (local
 * dev, or any env where email isn't configured) must NOT crash the API at
 * bootstrap. It should degrade to a no-op client while still constructing a
 * real Resend client when a key is present.
 */
describe('resendClientProvider (null-safe factory)', () => {
  const factory = (resendClientProvider as FactoryProvider).useFactory as (
    config: ConfigService,
  ) => ResendLike;

  const makeConfig = (key?: string): ConfigService =>
    ({
      get: (k: string) => (k === 'env.RESEND_API_KEY' ? key : undefined),
    }) as unknown as ConfigService;

  it('given an empty RESEND_API_KEY > returns a no-op client instead of throwing', async () => {
    const client = factory(makeConfig(''));

    expect(client?.emails?.send).toBeInstanceOf(Function);
    await expect(
      client.emails.send({ from: 'a@b.co', to: 'c@d.co', subject: 'Hi' }),
    ).resolves.toEqual({ data: null, error: null });
  });

  it('given an undefined RESEND_API_KEY > returns a no-op client instead of throwing', () => {
    expect(() => factory(makeConfig(undefined))).not.toThrow();
    expect(factory(makeConfig(undefined))).not.toBeInstanceOf(Resend);
  });

  it('given a real RESEND_API_KEY > constructs a real Resend client', () => {
    const client = factory(makeConfig('re_test_local_key'));

    expect(client).toBeInstanceOf(Resend);
  });
});
