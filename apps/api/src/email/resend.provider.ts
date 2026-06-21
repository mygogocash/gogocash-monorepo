import { Logger, Provider } from '@nestjs/common';
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

/**
 * No-op Resend client used when RESEND_API_KEY is not configured (local dev, or
 * any environment where email is intentionally disabled). Email is a non-critical
 * side channel: a missing key must NOT crash the API at bootstrap (the real
 * Resend SDK throws on an empty key). This mirrors the Customer.io service, which
 * also degrades to a no-op when unconfigured. Each skipped send is logged so a
 * missing OTP/invite email is diagnosable rather than silent.
 */
const createNoopResendClient = (logger: Logger): ResendLike => ({
  emails: {
    send: async (payload) => {
      logger.warn(
        `RESEND_API_KEY not configured — skipping email to ${String(
          payload.to,
        )} ("${payload.subject}")`,
      );
      return { data: null, error: null };
    },
  },
});

export const resendClientProvider: Provider = {
  provide: RESEND_CLIENT,
  useFactory: (config: ConfigService): ResendLike => {
    const apiKey = config.get<string>('env.RESEND_API_KEY');
    const logger = new Logger('ResendClient');
    if (!apiKey) {
      logger.warn(
        'RESEND_API_KEY not set — using a no-op email client; outbound emails will be skipped.',
      );
      return createNoopResendClient(logger);
    }
    return new Resend(apiKey) as unknown as ResendLike;
  },
  inject: [ConfigService],
};
