import * as crypto from 'crypto';
import { verifyTelegramInitData } from './telegram-initdata';

const BOT_TOKEN = '123456:FAKE-TEST-BOT-TOKEN';
const NOW_SEC = 1_700_000_000;

/**
 * Build a signed Telegram Mini App initData query string using the CORRECT
 * WebAppData-keyed HMAC. Values are provided DECODED (as Telegram would give
 * them to the verifier after URLSearchParams decoding); we compute the
 * data_check_string over decoded values, then URL-encode into a query string.
 */
function signInitData(
  params: Record<string, string>,
  botToken = BOT_TOKEN,
): string {
  const dataCheckString = Object.keys(params)
    .filter((k) => k !== 'hash' && k !== 'signature')
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('\n');
  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();
  const hash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) usp.set(k, v);
  usp.set('hash', hash);
  return usp.toString();
}

/** Build initData signed with the WIDGET secret (SHA256(token)) — the WRONG key. */
function signInitDataWidgetSecret(params: Record<string, string>): string {
  const dataCheckString = Object.keys(params)
    .filter((k) => k !== 'hash' && k !== 'signature')
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('\n');
  const secretKey = crypto.createHash('sha256').update(BOT_TOKEN).digest();
  const hash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) usp.set(k, v);
  usp.set('hash', hash);
  return usp.toString();
}

const userJson = JSON.stringify({
  id: 987654321,
  first_name: 'Ada',
  username: 'ada_l',
  language_code: 'en',
});

function baseParams(overrides: Record<string, string> = {}) {
  return {
    query_id: 'AAETEST',
    user: userJson,
    auth_date: String(NOW_SEC - 10),
    ...overrides,
  };
}

describe('verifyTelegramInitData > given a freshly signed WebAppData initData > then valid with parsed user', () => {
  it('accepts a valid initData and parses the user', () => {
    const initData = signInitData(baseParams());
    const res = verifyTelegramInitData(initData, BOT_TOKEN, {
      nowSec: NOW_SEC,
    });
    expect(res.valid).toBe(true);
    expect(res.user).toMatchObject({ id: 987654321, username: 'ada_l' });
    expect(res.authDate).toBe(NOW_SEC - 10);
  });
});

describe('verifyTelegramInitData > given a tampered field after signing > then invalid', () => {
  it('rejects when any signed value is changed', () => {
    const initData = signInitData(baseParams());
    // Flip the user field after signing.
    const tampered = initData.replace(
      encodeURIComponent(userJson),
      encodeURIComponent(JSON.stringify({ id: 1, first_name: 'Mallory' })),
    );
    const res = verifyTelegramInitData(tampered, BOT_TOKEN, {
      nowSec: NOW_SEC,
    });
    expect(res.valid).toBe(false);
  });
});

describe('verifyTelegramInitData > given a hash from the WIDGET secret > then invalid', () => {
  it('rejects a hash computed with SHA256(token) instead of WebAppData HMAC', () => {
    const initData = signInitDataWidgetSecret(baseParams());
    const res = verifyTelegramInitData(initData, BOT_TOKEN, {
      nowSec: NOW_SEC,
    });
    expect(res.valid).toBe(false);
  });
});

describe('verifyTelegramInitData > given auth_date outside the freshness window > then invalid', () => {
  it('rejects a stale auth_date older than maxAgeSeconds', () => {
    const initData = signInitData(
      baseParams({ auth_date: String(NOW_SEC - 90_000) }),
    );
    const res = verifyTelegramInitData(initData, BOT_TOKEN, {
      nowSec: NOW_SEC,
      maxAgeSeconds: 86_400,
    });
    expect(res.valid).toBe(false);
  });

  it('rejects a future auth_date beyond the skew', () => {
    const initData = signInitData(
      baseParams({ auth_date: String(NOW_SEC + 3_600) }),
    );
    const res = verifyTelegramInitData(initData, BOT_TOKEN, {
      nowSec: NOW_SEC,
    });
    expect(res.valid).toBe(false);
  });

  it('accepts an auth_date within a small future skew (clock drift)', () => {
    const initData = signInitData(
      baseParams({ auth_date: String(NOW_SEC + 5) }),
    );
    const res = verifyTelegramInitData(initData, BOT_TOKEN, {
      nowSec: NOW_SEC,
    });
    expect(res.valid).toBe(true);
  });
});

describe('verifyTelegramInitData > given malformed input > then invalid without throwing', () => {
  it('rejects missing hash', () => {
    const usp = new URLSearchParams(baseParams());
    const res = verifyTelegramInitData(usp.toString(), BOT_TOKEN, {
      nowSec: NOW_SEC,
    });
    expect(res.valid).toBe(false);
  });

  it('rejects empty hash', () => {
    const initData = signInitData(baseParams());
    const withEmptyHash = initData.replace(/hash=[a-f0-9]+/, 'hash=');
    const res = verifyTelegramInitData(withEmptyHash, BOT_TOKEN, {
      nowSec: NOW_SEC,
    });
    expect(res.valid).toBe(false);
  });

  it('rejects missing auth_date', () => {
    const params = baseParams();
    delete (params as Record<string, string>).auth_date;
    const initData = signInitData(params);
    const res = verifyTelegramInitData(initData, BOT_TOKEN, {
      nowSec: NOW_SEC,
    });
    expect(res.valid).toBe(false);
  });

  it('is valid at HMAC layer but returns null user for malformed user JSON', () => {
    const initData = signInitData(baseParams({ user: 'not-json' }));
    const res = verifyTelegramInitData(initData, BOT_TOKEN, {
      nowSec: NOW_SEC,
    });
    // HMAC is over the (malformed) value so it still verifies; but parsing
    // must not throw and user resolves to null.
    expect(res.valid).toBe(true);
    expect(res.user).toBeNull();
  });

  it('rejects empty initData string', () => {
    const res = verifyTelegramInitData('', BOT_TOKEN, { nowSec: NOW_SEC });
    expect(res.valid).toBe(false);
  });

  it('rejects a missing bot token', () => {
    const initData = signInitData(baseParams());
    const res = verifyTelegramInitData(initData, '', { nowSec: NOW_SEC });
    expect(res.valid).toBe(false);
  });
});

describe('verifyTelegramInitData > given a signature field present > then it is excluded from the check', () => {
  it('still verifies when a signature field is present (excluded like hash)', () => {
    // Sign WITHOUT signature in the check-string, then append a signature
    // param. A correct verifier excludes both hash and signature, so it stays
    // valid.
    const params = baseParams();
    const signed = signInitData(params);
    const usp = new URLSearchParams(signed);
    usp.set('signature', 'ed25519-third-party-signature-value');
    const res = verifyTelegramInitData(usp.toString(), BOT_TOKEN, {
      nowSec: NOW_SEC,
    });
    expect(res.valid).toBe(true);
    expect(res.user).toMatchObject({ id: 987654321 });
  });
});
