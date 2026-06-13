import { DEV_PHONE_NEW_USER_OTP } from "@/lib/dev/phoneAuthMock";
import { shouldUseMockApi } from "@/lib/env";

/**
 * Link MyCashback OTP step: treat code as valid.
 * - Dev / mock API UAT: must match the same mock OTP as phone login (`123456`).
 * - Production: accept any 6-digit code until a verification API is wired (replace with server check).
 */
export function isLinkMyCashbackOtpValid(digits: string): boolean {
  if (digits.length !== 6) {
    return false;
  }
  if (shouldUseMockApi() || process.env.NODE_ENV === "development") {
    return digits === DEV_PHONE_NEW_USER_OTP;
  }
  return true;
}
