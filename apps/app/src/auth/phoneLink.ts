export type PhoneLinkErrorCode =
  | "AUTH_SERVICE_UNAVAILABLE"
  | "PHONE_ALREADY_LINKED"
  | "PHONE_LINK_FAILED"
  | "PHONE_VERIFICATION_REQUIRED"
  | "SESSION_REAUTH_REQUIRED";

const PHONE_LINK_ERROR_MESSAGES: Record<PhoneLinkErrorCode, string> = {
  AUTH_SERVICE_UNAVAILABLE: "Phone verification service is unavailable.",
  PHONE_ALREADY_LINKED: "This phone number cannot be linked to this account.",
  PHONE_LINK_FAILED: "The verified phone number could not be linked.",
  PHONE_VERIFICATION_REQUIRED: "A fresh phone verification code is required.",
  SESSION_REAUTH_REQUIRED:
    "Your sign-in session is required to link this phone number.",
};

export class PhoneLinkError extends Error {
  readonly code: PhoneLinkErrorCode;
  readonly status: number | undefined;

  constructor(code: PhoneLinkErrorCode, status?: number) {
    super(PHONE_LINK_ERROR_MESSAGES[code]);
    this.name = "PhoneLinkError";
    this.code = code;
    this.status = status;
  }
}

type LinkVerifiedPhoneArgs = {
  apiUrl: string;
  backendAccessToken: string;
  firebaseIdToken: string;
  fetchImpl?: typeof fetch;
};

export type LinkVerifiedPhoneResult = {
  mobile?: string;
};

/** Native OTP needs an installed RN Firebase auth module; #332 ships on web. */
export function isProfilePhoneLinkSupported(platform: string): boolean {
  return platform === "web";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getResponseMessage(payload: unknown): string {
  if (!isRecord(payload) || typeof payload.message !== "string") {
    return "";
  }
  return payload.message.toLowerCase();
}

function isAlreadyLinkedResponse(status: number, payload: unknown): boolean {
  if (status === 409) {
    return true;
  }
  if (status !== 400) {
    return false;
  }

  const message = getResponseMessage(payload);
  return (
    message.includes("already") &&
    (message.includes("link") || message.includes("use"))
  );
}

function isPhoneVerificationResponse(
  status: number,
  payload: unknown,
): boolean {
  if (status !== 400 && status !== 401) {
    return false;
  }

  const message = getResponseMessage(payload);
  return (
    message.includes("phone verification") ||
    (message.includes("verify") &&
      message.includes("phone") &&
      message.includes("code"))
  );
}

/**
 * Links a Firebase-verified phone credential to the currently authenticated
 * backend user. The backend JWT identifies the existing account; the Firebase
 * ID token proves ownership of the phone. Neither credential is put in the URL.
 */
export async function linkVerifiedPhone({
  apiUrl,
  backendAccessToken,
  firebaseIdToken,
  fetchImpl = fetch,
}: LinkVerifiedPhoneArgs): Promise<LinkVerifiedPhoneResult> {
  const storedToken = backendAccessToken.trim();
  if (!storedToken) {
    throw new PhoneLinkError("SESSION_REAUTH_REQUIRED");
  }

  const phoneCredential = firebaseIdToken.trim();
  if (!phoneCredential) {
    throw new PhoneLinkError("PHONE_LINK_FAILED");
  }

  const normalizedApiUrl = apiUrl.trim().replace(/\/+$/, "");
  if (!normalizedApiUrl) {
    throw new PhoneLinkError("AUTH_SERVICE_UNAVAILABLE");
  }

  try {
    const response = await fetchImpl(`${normalizedApiUrl}/auth/firebase`, {
      body: JSON.stringify({ idToken: phoneCredential }),
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${storedToken}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      if (isAlreadyLinkedResponse(response.status, payload)) {
        throw new PhoneLinkError("PHONE_ALREADY_LINKED", response.status);
      }
      if (isPhoneVerificationResponse(response.status, payload)) {
        throw new PhoneLinkError(
          "PHONE_VERIFICATION_REQUIRED",
          response.status,
        );
      }
      if (response.status === 401 || response.status === 403) {
        throw new PhoneLinkError("SESSION_REAUTH_REQUIRED", response.status);
      }
      if (response.status === 429 || response.status >= 500) {
        throw new PhoneLinkError("AUTH_SERVICE_UNAVAILABLE", response.status);
      }
      throw new PhoneLinkError("PHONE_LINK_FAILED", response.status);
    }

    const user =
      isRecord(payload) && isRecord(payload.user) ? payload.user : null;
    const mobile =
      user && typeof user.mobile === "string" ? user.mobile : undefined;
    return mobile ? { mobile } : {};
  } catch (error) {
    if (error instanceof PhoneLinkError) {
      throw error;
    }
    throw new PhoneLinkError("AUTH_SERVICE_UNAVAILABLE");
  }
}
