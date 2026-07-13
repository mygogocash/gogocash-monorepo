import { describe, expect, it } from "vitest";

import {
  OTP_RATE_LIMIT_COOLDOWN_SECONDS,
  canAttemptPhoneOtpSend,
  nextOtpSendCooldownSeconds,
} from "@mobile/auth/otpSendCooldown";

describe("otpSendCooldown", () => {
  it("nextOtpSendCooldownSeconds > given rate-limit > then applies 5 minute client gate", () => {
    expect(nextOtpSendCooldownSeconds("rate-limit", 0)).toBe(OTP_RATE_LIMIT_COOLDOWN_SECONDS);
    expect(OTP_RATE_LIMIT_COOLDOWN_SECONDS).toBe(5 * 60);
  });

  it("nextOtpSendCooldownSeconds > given other errors > then keeps current cooldown", () => {
    expect(nextOtpSendCooldownSeconds("invalid-phone", 12)).toBe(12);
    expect(nextOtpSendCooldownSeconds(null, 0)).toBe(0);
  });

  it("canAttemptPhoneOtpSend > given active cooldown > then false", () => {
    expect(
      canAttemptPhoneOtpSend({
        cooldownSecondsRemaining: 10,
        privacyAccepted: true,
        phoneDigitCount: 9,
      }),
    ).toBe(false);
  });

  it("canAttemptPhoneOtpSend > given ready phone + consent + no cooldown > then true", () => {
    expect(
      canAttemptPhoneOtpSend({
        cooldownSecondsRemaining: 0,
        privacyAccepted: true,
        phoneDigitCount: 9,
      }),
    ).toBe(true);
  });
});
