import { useCallback } from "react";

import type { PhoneOtpConfirmation } from "@mobile/auth/firebasePhoneAuth";
import { sendNativePhoneOtp } from "@mobile/auth/nativePhoneAuth";

/**
 * Native phone OTP goes through @react-native-firebase/auth — Play Integrity
 * provides app verification, so no reCAPTCHA modal is needed (recaptchaModal
 * stays null for interface parity with the web hook, which uses the invisible
 * DOM verifier).
 */
export function useFirebasePhoneRecaptcha() {
  const sendPhoneOtpWithRecaptcha = useCallback(
    async (phoneE164: string): Promise<PhoneOtpConfirmation> => sendNativePhoneOtp(phoneE164),
    []
  );

  return { sendPhoneOtpWithRecaptcha, recaptchaModal: null };
}
