/**
 * Whether to show mock/demo OTP codes in the admin UI (e.g. after Send OTP).
 * - NEXT_PUBLIC_SHOW_MOCK_OTP_HINT=1|true → show
 * - NEXT_PUBLIC_SHOW_MOCK_OTP_HINT=0|false → hide
 * - unset → show only in development
 */
export function shouldShowMockOtpHint(): boolean {
  const v = process.env.NEXT_PUBLIC_SHOW_MOCK_OTP_HINT?.toLowerCase().trim();
  if (v === "1" || v === "true" || v === "yes") return true;
  if (v === "0" || v === "false" || v === "no") return false;
  return process.env.NODE_ENV === "development";
}
