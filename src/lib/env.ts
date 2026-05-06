import { env } from "@/env";

const INVALID_ENV_VALUES = new Set(["", "undefined", "null"]);

/**
 * Numeric Telegram bot id for `https://oauth.telegram.org/auth?bot_id=…`.
 *
 * Only `NEXT_PUBLIC_TELEGRAM_BOT_ID` is supported. The legacy
 * `NEXT_PUBLIC_TELEGRAM_BOT_TOKEN` fallback was removed because it shipped the
 * full bot secret to every browser bundle. If a deploy still has only the
 * legacy var set, this returns "" and Telegram OAuth will fail loudly rather
 * than silently leak the token.
 */
export const getTelegramOAuthBotId = (): string => {
  return env.NEXT_PUBLIC_TELEGRAM_BOT_ID?.trim() ?? "";
};

export const getApiBaseUrl = () => {
  const rawValue = env.NEXT_PUBLIC_API_URL?.trim() ?? "";

  if (INVALID_ENV_VALUES.has(rawValue)) {
    return "";
  }

  return rawValue.replace(/\/$/, "");
};

export const hasApiBaseUrl = () => getApiBaseUrl().length > 0;

/**
 * Production boot assertion: refuse to start if NEXT_PUBLIC_API_URL is missing.
 * Without this, a misconfigured prod deploy silently falls back to in-memory
 * mocks (see `shouldUseMockApi` below) — fake balances, fake offers, fake
 * withdrawals, no errors. Failing loud at boot is the right behaviour.
 *
 * Runs server-side only (Next.js executes module top-level code on the server
 * during build and at request-time). Skipped during build itself
 * (NEXT_PHASE === 'phase-production-build') because env may not be present
 * during static generation; the runtime gate is what matters.
 */
if (
  typeof window === "undefined" &&
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PHASE !== "phase-production-build" &&
  !hasApiBaseUrl()
) {
  throw new Error(
    "[gogocash-web] Refusing to start in production without NEXT_PUBLIC_API_URL. " +
      "Without it the app silently serves mock data. Set it in your hosting env.",
  );
}

const truthyPublicFlag = (value: string | undefined): boolean => {
  const v = value?.trim().toLowerCase() ?? "";
  return v === "1" || v === "true" || v === "yes";
};

/**
 * Use in-memory API mocks (`src/mocks/homeApi.ts`) instead of calling `NEXT_PUBLIC_API_URL`.
 * True when the API URL is unset, or when `NEXT_PUBLIC_MOCK_API` is enabled.
 */
export const shouldUseMockApi = () =>
  !hasApiBaseUrl() || truthyPublicFlag(env.NEXT_PUBLIC_MOCK_API);

/**
 * Phase 3 of docs/POLICY_MULTILANG_PLAN.md — show the admin-authored
 * terms & conditions section on `/category/[name]`. Off until enabled
 * so the Admin (Phase 2) can ship and admins can populate translations
 * before the customer side starts rendering them.
 */
export const isCategoryPolicyTermsEnabled = () =>
  truthyPublicFlag(env.NEXT_PUBLIC_CATEGORY_POLICY_TERMS);
