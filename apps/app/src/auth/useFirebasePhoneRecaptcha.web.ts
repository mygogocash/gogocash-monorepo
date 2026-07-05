import { useCallback } from "react";

import { sendPhoneOtp } from "@mobile/auth/firebasePhoneAuth";
import type { ConfirmationResult } from "firebase/auth";

/** Web passthrough — invisible DOM reCAPTCHA lives in firebasePhoneAuth. */
export function useFirebasePhoneRecaptcha() {
  const sendPhoneOtpWithRecaptcha = useCallback(
    async (phoneE164: string): Promise<ConfirmationResult> => sendPhoneOtp(phoneE164),
    []
  );

  return { sendPhoneOtpWithRecaptcha, recaptchaModal: null };
}
