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
      attachments?: Array<{
        filename: string;
        content: Buffer | string;
        contentType?: string;
      }>;
    }) => Promise<{
      data: { id: string } | null;
      error: { message: string } | null;
    }>;
  };
}

/**
 * Unavailable Resend client used when RESEND_API_KEY is not configured. A
 * missing key must not crash the whole API at bootstrap, but an attempted
 * transactional send must fail explicitly instead of returning a success-shaped
 * result. The warning intentionally excludes recipient and subject data.
 */
const createUnavailableResendClient = (logger: Logger): ResendLike => ({
  emails: {
    send: async () => {
      logger.warn(
        'Transactional email attempt rejected because RESEND_API_KEY is not configured.',
      );
      return {
        data: null,
        error: { message: 'Transactional email provider is not configured' },
      };
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
        'RESEND_API_KEY not set — transactional email attempts will fail until it is configured.',
      );
      return createUnavailableResendClient(logger);
    }
    return new Resend(apiKey) as unknown as ResendLike;
  },
  inject: [ConfigService],
};
