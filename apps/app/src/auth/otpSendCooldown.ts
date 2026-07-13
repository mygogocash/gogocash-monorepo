/** Client-side gate after Firebase `auth/too-many-requests` to stop hammering SMS. */
export const OTP_RATE_LIMIT_COOLDOWN_SECONDS = 5 * 60;

export function nextOtpSendCooldownSeconds(
  errorKind: string | null,
  currentCooldownSeconds: number,
): number {
  if (errorKind === "rate-limit") {
    return Math.max(currentCooldownSeconds, OTP_RATE_LIMIT_COOLDOWN_SECONDS);
  }
  return currentCooldownSeconds;
}

export function canAttemptPhoneOtpSend({
  cooldownSecondsRemaining,
  privacyAccepted,
  phoneDigitCount,
}: {
  cooldownSecondsRemaining: number;
  privacyAccepted: boolean;
  phoneDigitCount: number;
}): boolean {
  return (
    cooldownSecondsRemaining <= 0 && privacyAccepted && phoneDigitCount >= 9
  );
}
