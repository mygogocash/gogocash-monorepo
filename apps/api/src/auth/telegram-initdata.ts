import * as crypto from 'crypto';

/**
 * Pure, framework-free verifier for Telegram Mini App `initData`.
 *
 * CRITICAL: this is NOT the same algorithm as the Telegram Login Widget.
 *   - Login Widget: secret = SHA256(bot_token)
 *   - Mini App initData: secret = HMAC_SHA256(key="WebAppData", msg=bot_token)
 * A hash produced for one path will NOT validate against the other, so the two
 * verifiers must stay distinct.
 *
 * Spec: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * Kept dependency-free (no Nest/Mongo) so it is deterministic and unit-testable:
 * the caller passes the bot token and, optionally, the current time.
 */

const DEFAULT_MAX_AGE_SECONDS = 86_400; // 24h
const DEFAULT_FUTURE_SKEW_SECONDS = 60; // tolerate small clock drift

export interface VerifyTelegramInitDataOptions {
  /** Reject payloads older than this many seconds. Default 86400 (24h). */
  maxAgeSeconds?: number;
  /** Injectable clock (seconds since epoch) for deterministic tests. */
  nowSec?: number;
  /** Tolerated future skew for auth_date, in seconds. Default 60. */
  futureSkewSeconds?: number;
}

export interface TelegramInitDataResult {
  valid: boolean;
  /** Parsed `user` object (or null if absent/malformed). Only set when valid. */
  user?: unknown;
  /** Parsed `auth_date` (epoch seconds). Only set when valid. */
  authDate?: number;
  /** Machine-readable reason on failure (never leaks internals). */
  reason?: string;
}

function fail(reason: string): TelegramInitDataResult {
  return { valid: false, reason };
}

/**
 * Verify a raw Telegram Mini App initData query string.
 *
 * @param initData Raw query string, e.g. "user=%7B...%7D&auth_date=...&hash=...".
 * @param botToken The Telegram bot token (from env at the call site).
 * @param opts     Optional freshness window + injectable clock.
 */
export function verifyTelegramInitData(
  initData: string,
  botToken: string,
  opts: VerifyTelegramInitDataOptions = {},
): TelegramInitDataResult {
  try {
    if (typeof botToken !== 'string' || botToken.length === 0) {
      return fail('missing_bot_token');
    }
    if (typeof initData !== 'string' || initData.length === 0) {
      return fail('missing_init_data');
    }

    // URLSearchParams URL-DECODES values; the data_check_string is built from
    // the decoded values.
    const params = new URLSearchParams(initData);

    const hash = params.get('hash');
    if (!hash) {
      return fail('missing_hash');
    }

    // Build data_check_string over every key EXCEPT 'hash' and 'signature',
    // sorted alphabetically, joined by '\n'.
    const pairs: string[] = [];
    for (const [key, value] of params.entries()) {
      if (key === 'hash' || key === 'signature') continue;
      pairs.push(`${key}=${value}`);
    }
    pairs.sort();
    const dataCheckString = pairs.join('\n');

    // secret_key = HMAC_SHA256(key="WebAppData", msg=bot_token)  <-- the key
    // difference from the widget path (which uses SHA256(bot_token)).
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    const computed = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Constant-time compare (length-guard first — timingSafeEqual throws on
    // mismatched buffer lengths).
    const computedBuf = Buffer.from(computed, 'hex');
    const providedBuf = Buffer.from(hash, 'hex');
    if (
      computedBuf.length === 0 ||
      computedBuf.length !== providedBuf.length ||
      !crypto.timingSafeEqual(computedBuf, providedBuf)
    ) {
      return fail('bad_hash');
    }

    // auth_date freshness.
    const authDateRaw = params.get('auth_date');
    const authDate = Number(authDateRaw);
    if (authDateRaw === null || !Number.isFinite(authDate) || authDate <= 0) {
      return fail('bad_auth_date');
    }

    const nowSec =
      typeof opts.nowSec === 'number'
        ? opts.nowSec
        : Math.floor(Date.now() / 1000);
    const maxAgeSeconds = opts.maxAgeSeconds ?? DEFAULT_MAX_AGE_SECONDS;
    const futureSkewSeconds =
      opts.futureSkewSeconds ?? DEFAULT_FUTURE_SKEW_SECONDS;

    const ageSeconds = nowSec - authDate;
    if (ageSeconds > maxAgeSeconds) {
      return fail('expired');
    }
    if (ageSeconds < -futureSkewSeconds) {
      return fail('future_auth_date');
    }

    // Parse user; malformed JSON must not throw — resolve to null instead.
    let user: unknown = null;
    const userRaw = params.get('user');
    if (userRaw) {
      try {
        user = JSON.parse(userRaw);
      } catch {
        user = null;
      }
    }

    return { valid: true, user, authDate };
  } catch {
    // Never surface raw internals; any unexpected error is an invalid payload.
    return fail('verification_error');
  }
}
