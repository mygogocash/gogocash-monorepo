import { describe, expect, it, vi } from "vitest";

import {
  exchangeFirebaseIdToken,
  FirebaseLoginExchangeError,
  getFirebaseLoginExchangeErrorKind,
  isPhoneLinkRequiredError,
  mapLoginResponseToMobileSession,
} from "@mobile/auth/firebaseLogin";
import { mobileSessionFields } from "@mobile/config/mobileAppConfig";

// Maps the backend POST /auth/log-in envelope into the persisted mobile session.
// The session schema is pinned to exactly 15 fields (mobile-launch-contract +
// security-pentest), so the mapper must only ever emit keys from that list.
const fullResponse = {
  message: "Login success",
  token: "backend-jwt-abc123",
  is_new_user: false,
  auth_flow: "login" as const,
  user: {
    _id: "665f1c2e9b3a7d0012345678",
    email: "user@example.com",
    username: "gogo_user",
    country: "TH",
    mobile: "+66812345678",
    wallet: "0xabc123",
    birthdate: "01-01-1990",
    gender: "female",
    id_telegram: "tg-991",
    avatar_url: "https://cdn.example.com/a.png",
    membership_tier: "starter",
  },
};

describe("firebase login > mapLoginResponseToMobileSession", () => {
  it("given a full login response > then maps the backend JWT and user fields into the session", () => {
    const session = mapLoginResponseToMobileSession(fullResponse);
    expect(session).toMatchObject({
      access_token: "backend-jwt-abc123",
      _id: "665f1c2e9b3a7d0012345678",
      email: "user@example.com",
      username: "gogo_user",
      region: "TH",
      mobile: "+66812345678",
      wallet: "0xabc123",
      birthdate: "01-01-1990",
      gender: "female",
      id_telegram: "tg-991",
      avatar_url: "https://cdn.example.com/a.png",
      membership_tier: "starter",
      provider: "firebase",
      is_new_user: false,
      auth_flow: "login",
    });
  });

  it("given a sparse response > then keeps only the fields the backend sent (plus provider)", () => {
    const session = mapLoginResponseToMobileSession({
      token: "jwt-only",
      user: { _id: "abc" },
    });
    expect(session.access_token).toBe("jwt-only");
    expect(session._id).toBe("abc");
    expect(session.provider).toBe("firebase");
    expect("email" in session).toBe(false);
    expect("region" in session).toBe(false);
  });

  it("given a response without a token > then throws (no session without the backend JWT)", () => {
    expect(() => mapLoginResponseToMobileSession({ user: { _id: "abc" } })).toThrow(
      /token/i
    );
  });

  it("given a user provider from the backend > then maps it into the session", () => {
    const session = mapLoginResponseToMobileSession({
      token: "jwt-only",
      user: { _id: "abc", provider: "telegram" },
    });
    expect(session.provider).toBe("telegram");
  });

  it("emits only keys from the pinned 15-field session schema", () => {
    const session = mapLoginResponseToMobileSession(fullResponse);
    const allowed = new Set<string>(mobileSessionFields);
    for (const key of Object.keys(session)) {
      expect(allowed.has(key)).toBe(true);
    }
  });
});

describe("firebase login > exchangeFirebaseIdToken", () => {
  const okFetch = (payload: unknown) =>
    vi.fn().mockResolvedValue({
      json: () => Promise.resolve(payload),
      ok: true,
      status: 200,
    } as unknown as Response);

  it("posts to /auth/log-in with the Firebase token as a Bearer header (never in the URL)", async () => {
    const fetchImpl = okFetch(fullResponse);
    await exchangeFirebaseIdToken({
      apiUrl: "https://api-staging.gogocash.co/",
      country: "TH",
      fetchImpl,
      idToken: "firebase-id-token",
    });
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api-staging.gogocash.co/auth/log-in");
    expect(url).not.toContain("firebase-id-token");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer firebase-id-token"
    );
    expect(JSON.parse(String(init.body))).toMatchObject({
      country: "TH",
      token: "firebase-id-token",
    });
  });

  it("given registration intent > posts to the explicit /auth/register endpoint", async () => {
    const fetchImpl = okFetch({
      ...fullResponse,
      auth_flow: "register",
      is_new_user: true,
    });

    await exchangeFirebaseIdToken({
      apiUrl: "https://api-staging.gogocash.co",
      fetchImpl,
      idToken: "firebase-id-token",
      intent: "register",
    });

    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "https://api-staging.gogocash.co/auth/register",
    );
  });

  it("returns the mapped session on success", async () => {
    const session = await exchangeFirebaseIdToken({
      apiUrl: "https://api-staging.gogocash.co",
      fetchImpl: okFetch(fullResponse),
      idToken: "firebase-id-token",
    });
    expect(session.access_token).toBe("backend-jwt-abc123");
    expect(session.provider).toBe("firebase");
  });

  it("maps an unlinked verified phone to a safe, actionable error without exposing backend text", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          message:
            "This phone number is not linked to an account. Sign in with your original method, then link it from Profile > Verify Phone.",
        }),
      ok: false,
      status: 401,
    } as unknown as Response);

    const error = await exchangeFirebaseIdToken({
      apiUrl: "https://api-staging.gogocash.co",
      fetchImpl,
      idToken: "verified-phone-token",
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(FirebaseLoginExchangeError);
    expect(error).toMatchObject({ kind: "phone-link-required", status: 401 });
    expect(getFirebaseLoginExchangeErrorKind(error)).toBe(
      "phone-link-required",
    );
    expect(isPhoneLinkRequiredError(error)).toBe(true);
    expect(String(error)).not.toContain("original method");
  });

  it.each([
    [403, "account-disabled"],
    [429, "service-unavailable"],
    [503, "service-unavailable"],
    [401, "identity-verification"],
  ] as const)(
    "maps status %i to the safe %s exchange kind",
    async (status, expectedKind) => {
      const fetchImpl = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ message: "sensitive provider details" }),
        ok: false,
        status,
      } as unknown as Response);

      await expect(
        exchangeFirebaseIdToken({
          apiUrl: "https://api-staging.gogocash.co",
          fetchImpl,
          idToken: "bad-token",
        }),
      ).rejects.toMatchObject({
        kind: expectedKind,
        status,
      });
    },
  );

  it("does not classify arbitrary server text as phone-link-required", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ message: "Firebase token is required" }),
      ok: false,
      status: 401,
    } as unknown as Response);

    await expect(
      exchangeFirebaseIdToken({
        apiUrl: "https://api-staging.gogocash.co",
        fetchImpl,
        idToken: "bad-token",
      }),
    ).rejects.toMatchObject({ kind: "identity-verification", status: 401 });
  });
});
