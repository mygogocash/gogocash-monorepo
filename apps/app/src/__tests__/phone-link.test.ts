import { describe, expect, it, vi } from "vitest";

import {
  isProfilePhoneLinkSupported,
  linkVerifiedPhone,
  PhoneLinkError,
} from "@mobile/auth/phoneLink";

function response(body: Record<string, unknown>, status = 200): Response {
  return {
    json: () => Promise.resolve(body),
    ok: status >= 200 && status < 300,
    status,
  } as unknown as Response;
}

describe("linkVerifiedPhone", () => {
  it("keeps the real profile phone-link flow web-only until native OTP ships in the installed build", () => {
    expect(isProfilePhoneLinkSupported("web")).toBe(true);
    expect(isProfilePhoneLinkSupported("ios")).toBe(false);
    expect(isProfilePhoneLinkSupported("android")).toBe(false);
  });

  it("uses the stored backend JWT to link a confirmed Firebase phone token", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(response({ user: { mobile: "+66631234567" } }));

    await expect(
      linkVerifiedPhone({
        apiUrl: "https://api-staging.gogocash.co/",
        backendAccessToken: "stored-backend-jwt",
        fetchImpl,
        firebaseIdToken: "firebase-phone-id-token",
      }),
    ).resolves.toEqual({ mobile: "+66631234567" });

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api-staging.gogocash.co/auth/firebase");
    expect(url).not.toContain("firebase-phone-id-token");
    expect(init.headers).toMatchObject({
      Accept: "application/json",
      Authorization: "Bearer stored-backend-jwt",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(init.body))).toEqual({
      idToken: "firebase-phone-id-token",
    });
  });

  it("fails before the network when the original provider session is missing", async () => {
    const fetchImpl = vi.fn();

    const error = await linkVerifiedPhone({
      apiUrl: "https://api-staging.gogocash.co",
      backendAccessToken: "",
      fetchImpl,
      firebaseIdToken: "firebase-phone-id-token",
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(PhoneLinkError);
    expect(error).toMatchObject({ code: "SESSION_REAUTH_REQUIRED" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns a stable conflict code when the phone is already linked", async () => {
    const error = await linkVerifiedPhone({
      apiUrl: "https://api-staging.gogocash.co",
      backendAccessToken: "stored-backend-jwt",
      fetchImpl: vi.fn().mockResolvedValue(response({}, 409)),
      firebaseIdToken: "firebase-phone-id-token",
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(PhoneLinkError);
    expect(error).toMatchObject({ code: "PHONE_ALREADY_LINKED", status: 409 });
    expect((error as Error).message).not.toContain("backend");
  });

  it("maps backend-session rejection to a reauthentication error", async () => {
    const error = await linkVerifiedPhone({
      apiUrl: "https://api-staging.gogocash.co",
      backendAccessToken: "stored-backend-jwt",
      fetchImpl: vi
        .fn()
        .mockResolvedValue(
          response({ message: "Your session has expired" }, 401),
        ),
      firebaseIdToken: "firebase-phone-id-token",
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(PhoneLinkError);
    expect(error).toMatchObject({
      code: "SESSION_REAUTH_REQUIRED",
      status: 401,
    });
    expect((error as Error).message).not.toContain("session has expired");
  });

  it.each([
    [401, "Your phone verification expired. Request a new code and try again."],
    [400, "Verify this phone number with a new code before linking it."],
  ])(
    "keeps backend phone-credential failure (%s) distinct from session and link failures",
    async (status, message) => {
      const error = await linkVerifiedPhone({
        apiUrl: "https://api-staging.gogocash.co",
        backendAccessToken: "stored-backend-jwt",
        fetchImpl: vi.fn().mockResolvedValue(response({ message }, status)),
        firebaseIdToken: "firebase-phone-id-token",
      }).catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(PhoneLinkError);
      expect(error).toMatchObject({
        code: "PHONE_VERIFICATION_REQUIRED",
        status,
      });
      expect((error as Error).message).not.toContain(message);
    },
  );

  it.each([
    ["server failure", vi.fn().mockResolvedValue(response({}, 503))],
    ["network failure", vi.fn().mockRejectedValue(new Error("socket details"))],
  ])(
    "maps %s to a retryable system error without leaking internals",
    async (_label, fetchImpl) => {
      const error = await linkVerifiedPhone({
        apiUrl: "https://api-staging.gogocash.co",
        backendAccessToken: "stored-backend-jwt",
        fetchImpl,
        firebaseIdToken: "firebase-phone-id-token",
      }).catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(PhoneLinkError);
      expect(error).toMatchObject({ code: "AUTH_SERVICE_UNAVAILABLE" });
      expect((error as Error).message).not.toContain("socket details");
    },
  );
});
