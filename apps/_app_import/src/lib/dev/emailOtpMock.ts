/**
 * Deterministic email + OTP pairs for QA when the app runs against the in-repo
 * axios mock (no `NEXT_PUBLIC_API_URL`). Used by Telegram login’s “verify email” step:
 * POST `/auth/send-otp`, `/auth/verify-otp`, and `/auth/log-in/telegram`.
 *
 * | Case           | Email                         | OTP    |
 * |----------------|-------------------------------|--------|
 * | New user       | otp.new.user@gogocash.test    | 123456 |
 * | Existing user  | otp.existing.user@gogocash.test | 654321 |
 */
import type { IResponseLogin } from "@/interfaces/auth";
import { isRecord } from "@/mocks/homeApi/helpers";
import { createMockRegisterResponse, createMockSignInResponse } from "@/mocks/auth/signInMockData";

export const DEV_EMAIL_OTP_NEW_USER = "otp.new.user@gogocash.test";
export const DEV_EMAIL_OTP_EXISTING_USER = "otp.existing.user@gogocash.test";

export const DEV_EMAIL_OTP_NEW_USER_CODE = "123456";
export const DEV_EMAIL_OTP_EXISTING_USER_CODE = "654321";

export function normalizeDevEmailOtpAddress(email: string): string {
  return email.trim().toLowerCase();
}

export function isDevEmailOtpTestAddress(email: string): boolean {
  const n = normalizeDevEmailOtpAddress(email);
  return n === DEV_EMAIL_OTP_NEW_USER || n === DEV_EMAIL_OTP_EXISTING_USER;
}

/** Expected 6-digit OTP for a test address, or `null` if not a test email. */
export function devEmailMockExpectedOtp(email: string): string | null {
  const n = normalizeDevEmailOtpAddress(email);
  if (n === DEV_EMAIL_OTP_NEW_USER) return DEV_EMAIL_OTP_NEW_USER_CODE;
  if (n === DEV_EMAIL_OTP_EXISTING_USER) return DEV_EMAIL_OTP_EXISTING_USER_CODE;
  return null;
}

export function devEmailMockIsNewUser(email: string): boolean {
  return normalizeDevEmailOtpAddress(email) === DEV_EMAIL_OTP_NEW_USER;
}

/** Mock `POST /auth/log-in/telegram` body when `email` is a test OTP address. */
export function devEmailMockTelegramLoginResponse(emailRaw: string): IResponseLogin | null {
  if (!isDevEmailOtpTestAddress(emailRaw)) return null;
  const email = emailRaw.trim();
  const isNew = devEmailMockIsNewUser(emailRaw);
  const base = isNew ? createMockRegisterResponse() : createMockSignInResponse();
  return {
    ...base,
    user: { ...base.user, email },
    is_new_user: isNew,
    auth_flow: isNew ? "register" : "login",
  };
}

/**
 * HTTP status for `POST /auth/verify-otp` when using test emails.
 * Returns `undefined` when this helper does not apply (caller uses default mock status).
 */
export function devEmailMockVerifyOtpHttpStatus(body: unknown): number | undefined {
  if (!isRecord(body)) return undefined;
  const email = String(body.email ?? "");
  if (!isDevEmailOtpTestAddress(email)) return undefined;
  const otp = String(body.otp ?? "").trim();
  const expected = devEmailMockExpectedOtp(email);
  if (expected === null) return undefined;
  return otp === expected ? 200 : 400;
}
