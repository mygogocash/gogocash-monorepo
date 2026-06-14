import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

/**
 * DI token for the Resend client. Injecting the client (rather than `new`-ing
 * it inside EmailService) keeps EmailService unit-testable: tests provide a
 * fake `{ emails: { send } }` under this token instead of mocking the SDK.
 */
export const RESEND_CLIENT = 'RESEND_CLIENT';

/** Minimal surface EmailService depends on — the wrapper we own and mock. */
export interface ResendLike {
  emails: {
    send: (payload: {
      from: string;
      to: string | string[];
      subject: string;
      html?: string;
      text?: string;
    }) => Promise<{ data: unknown; error: { message: string } | null }>;
  };
}

export const resendClientProvider: Provider = {
  provide: RESEND_CLIENT,
  useFactory: (config: ConfigService): ResendLike =>
    new Resend(
      config.get<string>('env.RESEND_API_KEY'),
    ) as unknown as ResendLike,
  inject: [ConfigService],
};
