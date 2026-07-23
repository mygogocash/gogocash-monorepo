import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearProfilePhoneAttempt,
  getProfilePhoneAttempt,
  maskPhoneE164,
  setProfilePhoneAttempt,
} from "@mobile/auth/profilePhoneAttempt";

describe("profile phone verification attempt", () => {
  beforeEach(() => {
    clearProfilePhoneAttempt();
  });

  it("keeps the Firebase confirmation handle only in memory between profile routes", () => {
    const confirmation = { confirm: vi.fn() };

    setProfilePhoneAttempt({
      confirmation,
      maskedDestination: "+66 ••• ••• 4567",
      phoneE164: "+66631234567",
    });

    expect(getProfilePhoneAttempt()).toEqual({
      confirmation,
      maskedDestination: "+66 ••• ••• 4567",
      phoneE164: "+66631234567",
    });
  });

  it("clears the non-serializable confirmation handle after completion or cancellation", () => {
    setProfilePhoneAttempt({
      confirmation: { confirm: vi.fn() },
      maskedDestination: "+66 ••• ••• 4567",
      phoneE164: "+66631234567",
    });

    clearProfilePhoneAttempt();

    expect(getProfilePhoneAttempt()).toBeNull();
  });

  it("masks the destination without returning the full phone number", () => {
    const masked = maskPhoneE164("+66631234567");

    expect(masked).toBe("+66 ••• ••• 4567");
    expect(masked).not.toContain("631234567");
  });
});
