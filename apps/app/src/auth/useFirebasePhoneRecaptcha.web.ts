import { useCallback, useEffect, useRef } from "react";

import {
  clearPhoneOtpRecaptcha,
  sendPhoneOtp,
  type PhoneOtpConfirmation,
  type PhoneOtpRecaptchaOwner,
} from "@mobile/auth/firebasePhoneAuth";

/** Web passthrough — invisible DOM reCAPTCHA lives in firebasePhoneAuth. */
export function useFirebasePhoneRecaptcha() {
  const recaptchaOwner = useRef<PhoneOtpRecaptchaOwner>({}).current;
  const sendPhoneOtpWithRecaptcha = useCallback(
    async (phoneE164: string): Promise<PhoneOtpConfirmation> =>
      sendPhoneOtp(phoneE164, undefined, recaptchaOwner),
    [recaptchaOwner],
  );

  useEffect(
    () => () => {
      clearPhoneOtpRecaptcha(recaptchaOwner);
    },
    [recaptchaOwner],
  );

  return { sendPhoneOtpWithRecaptcha, recaptchaModal: null };
}
