import { describe, expect, it } from "vitest";

import { translateCopy } from "@mobile/i18n/messages";

const PROFILE_PHONE_COPY = [
  "Link Your Phone Number",
  "Add a verified phone number to this account. Your current sign-in method will stay connected.",
  "Enter a Thai mobile number that you own.",
  "Sending...",
  "This verification attempt expired. Start phone verification again.",
  "Start again",
  "Enter the code we sent",
  "We sent a verification code to {phone}.",
  "That code is invalid or expired. Check the code or request a new one.",
  "This phone number is already linked to another account. Keep using your original sign-in method or contact support.",
  "We couldn't link this phone to your account. Keep using your original sign-in method and try again, or contact support.",
  "Your sign-in session expired. Sign in again with your original method, then return to Profile > Verify Phone.",
  "We couldn't finish linking your phone. Please try again. Your original sign-in still works.",
  "Linking...",
  "Didn't receive a code? Go back and request a new one.",
  "Phone verification isn't available in this app build yet. Open GoGoCash in your web browser to link your number.",
  "We can't sign you in with this phone number yet. Sign in with the method you used when creating your account, then link your phone from Profile > Verify Phone.",
] as const;

describe("profile phone-link copy", () => {
  it.each(PROFILE_PHONE_COPY)("has a Thai translation: %s", (english) => {
    expect(translateCopy(english, "th")).not.toBe(english);
  });
});
