import { ForbiddenException } from '@nestjs/common';

export type RegistrationSource =
  | 'firebase_phone'
  | 'firebase_email'
  | 'firebase_google'
  | 'firebase_facebook'
  | 'firebase_apple'
  | 'firebase_x'
  | 'firebase_microsoft'
  | 'firebase_unknown'
  | 'email_otp'
  | 'line'
  | 'telegram'
  | 'telegram_bot'
  | 'minipay_siwe'
  | 'crossmint'
  | 'direct_user_create';

export type RegistrationSourceDecision = {
  source: RegistrationSource;
  enabled: boolean;
  central_transaction_required: boolean;
  reason: string;
};

export const REGISTRATION_SOURCE_MANIFEST: readonly RegistrationSourceDecision[] =
  [
    {
      source: 'firebase_phone',
      enabled: true,
      central_transaction_required: true,
      reason: 'Firebase verifies the phone ID token before registration.',
    },
    {
      source: 'firebase_email',
      enabled: true,
      central_transaction_required: true,
      reason:
        'Firebase verifies password/email-link ownership before registration.',
    },
    {
      source: 'firebase_google',
      enabled: true,
      central_transaction_required: true,
      reason:
        'Firebase verifies the Google identity token before registration.',
    },
    {
      source: 'firebase_facebook',
      enabled: true,
      central_transaction_required: true,
      reason:
        'Firebase verifies the Facebook identity token before registration.',
    },
    {
      source: 'email_otp',
      enabled: false,
      central_transaction_required: true,
      reason:
        'No deployed verified email-OTP route creates a customer account.',
    },
    {
      source: 'line',
      enabled: true,
      central_transaction_required: true,
      reason: 'The server verifies the LINE channel token and profile first.',
    },
    {
      source: 'firebase_apple',
      enabled: true,
      central_transaction_required: true,
      reason: 'Firebase verifies the active Apple identity provider.',
    },
    {
      source: 'firebase_x',
      enabled: true,
      central_transaction_required: true,
      reason: 'Firebase verifies the active X identity provider.',
    },
    {
      source: 'firebase_microsoft',
      enabled: true,
      central_transaction_required: true,
      reason: 'Firebase verifies the active Microsoft identity provider.',
    },
    {
      source: 'firebase_unknown',
      enabled: false,
      central_transaction_required: true,
      reason: 'Unlisted Firebase providers fail closed.',
    },
    {
      source: 'telegram',
      enabled: false,
      central_transaction_required: true,
      reason: 'Telegram is hidden and disabled in backend scope.',
    },
    {
      source: 'telegram_bot',
      enabled: false,
      central_transaction_required: true,
      reason: 'The Telegram bot may not create customer accounts directly.',
    },
    {
      source: 'minipay_siwe',
      enabled: false,
      central_transaction_required: true,
      reason: 'Web3 and MiniPay are outside the deployed backend scope.',
    },
    {
      source: 'crossmint',
      enabled: false,
      central_transaction_required: true,
      reason: 'The retired Crossmint sign-in path stays disabled.',
    },
    {
      source: 'direct_user_create',
      enabled: false,
      central_transaction_required: true,
      reason:
        'Unverified direct user creation is not an authentication source.',
    },
  ] as const;

const decisions = new Map(
  REGISTRATION_SOURCE_MANIFEST.map((entry) => [entry.source, entry]),
);

function firebaseSource(provider: string): RegistrationSource {
  switch (provider.trim().toLowerCase()) {
    case 'phone':
      return 'firebase_phone';
    case 'password':
    case 'emaillink':
    case 'email_link':
      return 'firebase_email';
    case 'google.com':
      return 'firebase_google';
    case 'facebook.com':
      return 'firebase_facebook';
    case 'apple.com':
      return 'firebase_apple';
    case 'twitter.com':
      return 'firebase_x';
    case 'microsoft.com':
    case 'oidc.microsoft':
      return 'firebase_microsoft';
    default:
      return 'firebase_unknown';
  }
}

export function registrationSourceDecision(
  input: string,
): RegistrationSourceDecision {
  const source = input.startsWith('firebase:')
    ? firebaseSource(input.slice('firebase:'.length))
    : decisions.has(input as RegistrationSource)
      ? (input as RegistrationSource)
      : 'direct_user_create';
  return decisions.get(source)!;
}

export function assertRegistrationSourceEnabled(
  input: string,
): RegistrationSourceDecision {
  const decision = registrationSourceDecision(input);
  if (!decision.enabled) {
    throw new ForbiddenException({
      code: 'REGISTRATION_SOURCE_DISABLED',
      source: decision.source,
      message: decision.reason,
    });
  }
  return decision;
}
