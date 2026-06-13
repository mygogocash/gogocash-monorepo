import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { User } from "@/interfaces/auth";
import client from "@/lib/axios/client";
import { getClientAuth } from "@/lib/firebaseClient";

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    confirmationResult?: any;
  }
}

export const sendOtp = async (phone: string) => {
  // const auth = getClientAuth(); // ✅ ได้แน่ ๆ เฉพาะฝั่ง browser
  const auth = getClientAuth(); // ✅ ต้องไม่ undefined
  if (!auth) throw new Error("Firebase auth is undefined");

  try {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
      });
      await window.recaptchaVerifier.render();
    }

    window.confirmationResult = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);
  } catch (e) {
    window.recaptchaVerifier?.clear();
    window.recaptchaVerifier = undefined;
    throw e;
  }
  return true;
};
export const confirmOtp = async (code: string) => {
  try {
    const cred = await window.confirmationResult.confirm(code);
    const idToken = await cred.user.getIdToken();
    return idToken;
  } catch (e) {
    if (JSON.stringify(e).includes("code-expired")) {
      return false;
    }
    throw e;
  }
};

export async function loginWithFirebase(
  idToken: string,
  tokenUser: string
): Promise<{ uid: string; user: User }> {
  try {
    const res = await client.post<{ uid: string; user: User }>(
      "/auth/firebase",
      { idToken },
      {
        headers: {
          Authorization: `Bearer ${tokenUser}`,
        },
      }
    );
    return res.data;
  } catch (err: unknown) {
    const data =
      err && typeof err === "object" && "data" in err
        ? (err as { data?: { message?: string } }).data
        : undefined;
    throw new Error(data?.message || "Server auth failed");
  }
}
