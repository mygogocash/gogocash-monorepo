import { useCallback } from "react";

import { sendPhoneOtp } from "@mobile/auth/firebasePhoneAuth";
import type { ConfirmationResult } from "firebase/auth";

/**
 * Native passthrough until @react-native-firebase/auth ships (expo-firebase-recaptcha
 * breaks Expo SDK 57 native builds). Demo/device QA uses JWT inject, not native OTP.
 */
export function useFirebasePhoneRecaptcha() {
  const sendPhoneOtpWithRecaptcha = useCallback(
    async (phoneE164: string): Promise<ConfirmationResult> => sendPhoneOtp(phoneE164),
    []
  );

  return { sendPhoneOtpWithRecaptcha, recaptchaModal: null };
}
