import { ForbiddenException } from '@nestjs/common';

import {
  assertRegistrationSourceEnabled,
  registrationSourceDecision,
  REGISTRATION_SOURCE_MANIFEST,
} from './registration-source.manifest';

describe('registration source manifest', () => {
  it.each([
    ['firebase:phone', 'firebase_phone'],
    ['firebase:password', 'firebase_email'],
    ['firebase:google.com', 'firebase_google'],
    ['firebase:facebook.com', 'firebase_facebook'],
    ['firebase:apple.com', 'firebase_apple'],
    ['firebase:twitter.com', 'firebase_x'],
    ['firebase:microsoft.com', 'firebase_microsoft'],
    ['line', 'line'],
  ] as const)('enables verified source %s through %s', (input, expected) => {
    expect(registrationSourceDecision(input)).toMatchObject({
      source: expected,
      enabled: true,
      central_transaction_required: true,
    });
    expect(() => assertRegistrationSourceEnabled(input)).not.toThrow();
  });

  it.each([
    'firebase:oidc.unknown',
    'email_otp',
    'telegram',
    'telegram_bot',
    'minipay_siwe',
    'crossmint',
    'direct_user_create',
  ])('fails closed for disabled backend source %s', (input) => {
    expect(registrationSourceDecision(input)).toMatchObject({ enabled: false });
    expect(() => assertRegistrationSourceEnabled(input)).toThrow(
      ForbiddenException,
    );
  });

  it('names every discovered registration path and never leaves an implicit default', () => {
    expect(
      REGISTRATION_SOURCE_MANIFEST.map((entry) => entry.source).sort(),
    ).toEqual(
      [
        'crossmint',
        'direct_user_create',
        'email_otp',
        'firebase_apple',
        'firebase_email',
        'firebase_facebook',
        'firebase_google',
        'firebase_microsoft',
        'firebase_phone',
        'firebase_unknown',
        'firebase_x',
        'line',
        'minipay_siwe',
        'telegram',
        'telegram_bot',
      ].sort(),
    );
  });

  it.each(['unknown', 'toString', '__proto__', 'constructor'])(
    'maps unknown or prototype-shaped key %s to the disabled default',
    (input) => {
      expect(registrationSourceDecision(input)).toMatchObject({
        source: 'direct_user_create',
        enabled: false,
      });
    },
  );
});
