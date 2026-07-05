import { FirebaseRecaptchaVerifierModal } from "expo-firebase-recaptcha";
import { useCallback, useMemo, useRef, type ReactElement } from "react";

import { getFirebaseClientConfig } from "@mobile/auth/firebaseClient";
import { sendPhoneOtp } from "@mobile/auth/firebasePhoneAuth";
import type { ConfirmationResult } from "firebase/auth";

type RecaptchaModalRef = FirebaseRecaptchaVerifierModal | null;

/** Native phone OTP — mounts FirebaseRecaptchaVerifierModal for ApplicationVerifier. */
export function useFirebasePhoneRecaptcha() {
  const recaptchaRef = useRef<RecaptchaModalRef>(null);
  const firebaseConfig = useMemo(() => getFirebaseClientConfig(), []);

  const sendPhoneOtpWithRecaptcha = useCallback(
    async (phoneE164: string): Promise<ConfirmationResult> => {
      const verifier = recaptchaRef.current;
      if (!verifier) {
        throw new Error("Firebase reCAPTCHA is not ready. Try again in a moment.");
      }
      return sendPhoneOtp(phoneE164, verifier);
    },
    []
  );

  const recaptchaModal: ReactElement = (
    <FirebaseRecaptchaVerifierModal
      ref={recaptchaRef}
      firebaseConfig={firebaseConfig}
      attemptInvisibleVerification
    />
  );

  return { sendPhoneOtpWithRecaptcha, recaptchaModal };
}
