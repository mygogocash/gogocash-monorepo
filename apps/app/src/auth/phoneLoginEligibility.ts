const PHONE_LOGIN_ELIGIBILITY_ERROR =
  "Could not check phone sign-in eligibility. Please try again.";
const AUTH_RATE_LIMIT_ERROR_CODE = "auth/too-many-requests";

function phoneLoginEligibilityError(status: number): Error {
  const error = new Error(PHONE_LOGIN_ELIGIBILITY_ERROR);
  return status === 429
    ? Object.assign(error, { code: AUTH_RATE_LIMIT_ERROR_CODE })
    : error;
}

export async function checkPhoneLoginEligibility({
  apiUrl,
  fetchImpl = fetch,
  phoneE164,
}: {
  apiUrl: string;
  fetchImpl?: typeof fetch;
  phoneE164: string;
}): Promise<boolean> {
  const baseUrl = apiUrl.replace(/\/+$/, "");
  const response = await fetchImpl(
    `${baseUrl}/auth/phone-sign-in/eligibility`,
    {
      body: JSON.stringify({ phone_e164: phoneE164 }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );

  if (!response.ok) {
    throw phoneLoginEligibilityError(response.status);
  }

  const payload = (await response.json().catch(() => ({}))) as {
    eligible?: unknown;
  };

  if (typeof payload.eligible !== "boolean") {
    throw phoneLoginEligibilityError(response.status);
  }

  return payload.eligible;
}
