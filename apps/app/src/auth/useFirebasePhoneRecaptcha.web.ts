import { useCallback } from "react";

import { sendPhoneOtp, type PhoneOtpConfirmation } from "@mobile/auth/firebasePhoneAuth";


/** Web passthrough — invisible DOM reCAPTCHA lives in firebasePhoneAuth. */
export function useFirebasePhoneRecaptcha() {
  const sendPhoneOtpWithRecaptcha = useCallback(
    async (phoneE164: string): Promise<PhoneOtpConfirmation> => sendPhoneOtp(phoneE164),
    []
  );

  return { sendPhoneOtpWithRecaptcha, recaptchaModal: null };
}
