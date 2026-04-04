import { env } from "@/env";

const INVALID_ENV_VALUES = new Set(["", "undefined", "null"]);

/**
 * Numeric Telegram bot id for `https://oauth.telegram.org/auth?bot_id=…`.
 * Prefer `NEXT_PUBLIC_TELEGRAM_BOT_ID`. Legacy: derives `123456789` from `NEXT_PUBLIC_TELEGRAM_BOT_TOKEN`
 * when it contains `:` so OAuth works without putting the full token in new deployments.
 */
export const getTelegramOAuthBotId = (): string => {
  const explicit = env.NEXT_PUBLIC_TELEGRAM_BOT_ID?.trim();
  if (explicit) {
    return explicit;
  }

  const legacy = env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN?.trim();
  if (!legacy) {
    return "";
  }

  const colon = legacy.indexOf(":");
  if (colon > 0) {
    return legacy.slice(0, colon).trim();
  }

  return legacy;
};

export const getApiBaseUrl = () => {
  const rawValue = env.NEXT_PUBLIC_API_URL?.trim() ?? "";

  if (INVALID_ENV_VALUES.has(rawValue)) {
    return "";
  }

  return rawValue.replace(/\/$/, "");
};

export const hasApiBaseUrl = () => getApiBaseUrl().length > 0;

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
