import { DEV_PHONE_NEW_USER_OTP } from "@/lib/dev/phoneAuthMock";
import { shouldUseMockApi } from "@/lib/env";

/**
 * Account Setup — input validators.
 *
 * OTP validation currently mirrors `isLinkMyCashbackOtpValid`: dev/mock mode
 * accepts only `DEV_PHONE_NEW_USER_OTP`; production accepts any 6-digit code
 * until a real SMS verification API is wired. Replace `isOtpValid` with a
 * server check when that API exists.
 */

/** Strip non-digits. */
function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

/**
 * Thai mobile phone (PromptPay): 10 digits starting with `0` (e.g. `0812345678`).
 * Some editors also accept 9 digits without leading 0 (e.g. `812345678`) —
 * we normalise by expecting the caller to pass digits as entered.
 */
export function isThaiMobileValid(raw: string): boolean {
  const d = digitsOnly(raw);
  if (d.length === 10 && d.startsWith("0")) return true;
  if (d.length === 9 && !d.startsWith("0")) return true;
  return false;
}

/** Normalise a Thai mobile to the canonical 10-digit `0…` form. */
export function canonicalThaiMobile(raw: string): string {
  const d = digitsOnly(raw);
  if (d.length === 9 && !d.startsWith("0")) return `0${d}`;
  return d;
}

/** Thai national ID: 13 digits. We do not verify the checksum here — server will. */
export function isCitizenIdValid(raw: string): boolean {
  return digitsOnly(raw).length === 13;
}

/** Name is required and at least 1 non-whitespace character. */
export function isNameValid(name: string): boolean {
  return name.trim().length > 0;
}

/** OTP: 6 digits; production passes, dev/mock gates to the known test code. */
export function isOtpValid(raw: string): boolean {
  const d = digitsOnly(raw);
  if (d.length !== 6) return false;
  if (shouldUseMockApi() || process.env.NODE_ENV === "development") {
    return d === DEV_PHONE_NEW_USER_OTP;
  }
  return true;
}
