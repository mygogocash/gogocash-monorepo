import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildLineLoginCallbackUrl,
  exchangeLineAuth,
  getLiffId,
  getLineAuthUserMessage,
  isLineLoginConfigured,
  LineAuthExchangeError,
  LineLoginRedirectStartedError,
  LineLoginSessionMissingError,
  requestLineLogin,
  resumeLineLogin,
} from "@mobile/auth/lineLogin";

describe("lineLogin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("buildLineLoginCallbackUrl > preserves only a sanitized in-app callback on the same origin", () => {
    const callbackUrl = buildLineLoginCallbackUrl(
      "https://app-staging.gogocash.co/login?callbackUrl=%2Fwallet&code=secret#token",
    );

    expect(callbackUrl).toBe(
      "https://app-staging.gogocash.co/auth/line-callback?callbackUrl=%2Fwallet",
    );
    expect(callbackUrl).not.toContain("secret");
    expect(callbackUrl).not.toContain("token");
  });

  it.each([
    "https://evil.example/steal",
    "//evil.example/steal",
    "/auth/callback",
    "/not-a-real-route",
  ])(
    "buildLineLoginCallbackUrl > rejects unsafe callback %s and uses the post-login default",
    (unsafeCallback) => {
      const currentUrl = new URL("https://app-staging.gogocash.co/login");
      currentUrl.searchParams.set("callbackUrl", unsafeCallback);

      expect(buildLineLoginCallbackUrl(currentUrl.toString())).toBe(
        "https://app-staging.gogocash.co/auth/line-callback?callbackUrl=%2Flink-mycashback",
      );
    },
  );

  it("requestLineLogin > redirects to the fixed callback route and preserves the caller-compatible cancellation code", async () => {
    const liff = createLiffStub({ isLoggedIn: false });
    vi.stubGlobal("window", {
      liff,
      location: {
        href: "https://app-staging.gogocash.co/login?callbackUrl=%2Fwallet&state=private",
      },
    });

    const loginPromise = requestLineLogin("line-id");

    await expect(loginPromise).rejects.toBeInstanceOf(
      LineLoginRedirectStartedError,
    );
    await expect(loginPromise).rejects.toMatchObject({
      code: "auth/popup-closed-by-user",
    });
    expect(liff.login).toHaveBeenCalledWith({
      redirectUri:
        "https://app-staging.gogocash.co/auth/line-callback?callbackUrl=%2Fwallet",
    });
  });

  it("resumeLineLogin > resumes the returned LIFF session without starting another redirect", async () => {
    const liff = createLiffStub({ isLoggedIn: true });
    vi.stubGlobal("window", {
      liff,
      location: {
        href: "https://app-staging.gogocash.co/auth/line-callback?callbackUrl=%2Fwallet",
      },
    });

    await expect(resumeLineLogin("line-id")).resolves.toEqual({
      accessToken: "line-access",
      profile: {
        displayName: "LINE User",
        pictureUrl: "https://img.example/avatar.png",
        userId: "U123",
      },
    });
    expect(liff.init).toHaveBeenCalledWith({ liffId: "line-id" });
    expect(liff.login).not.toHaveBeenCalled();
  });

  it("resumeLineLogin > given no returned LINE session > fails without a redirect loop", async () => {
    const liff = createLiffStub({ isLoggedIn: false });
    vi.stubGlobal("window", {
      liff,
      location: {
        href: "https://app-staging.gogocash.co/auth/line-callback",
      },
    });

    await expect(resumeLineLogin("line-id")).rejects.toBeInstanceOf(
      LineLoginSessionMissingError,
    );
    expect(liff.login).not.toHaveBeenCalled();
  });

  it("isLineLoginConfigured > given EXPO_PUBLIC_LIFF_ID > then true", () => {
    vi.stubEnv("EXPO_PUBLIC_LIFF_ID", "2008237918-mpplkp5Q");
    expect(getLiffId()).toBe("2008237918-mpplkp5Q");
    expect(isLineLoginConfigured()).toBe(true);
  });

  it("isLineLoginConfigured > given empty LIFF id > then false", () => {
    vi.stubEnv("EXPO_PUBLIC_LIFF_ID", "");
    expect(isLineLoginConfigured()).toBe(false);
  });

  it("exchangeLineAuth > given a successful /auth/line-login > then maps session", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        token: "line-jwt",
        user: { _id: "u1", username: "LINE User", provider: "line" },
      }),
    });

    const session = await exchangeLineAuth({
      accessToken: "line-access",
      apiUrl: "https://api.example",
      country: "TH",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      profile: {
        userId: "U123",
        displayName: "LINE User",
        pictureUrl: "https://img",
      },
    });

    expect(session).toMatchObject({
      access_token: "line-jwt",
      provider: "line",
      _id: "u1",
      username: "LINE User",
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example/auth/line-login",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer line-access",
        }),
        body: JSON.stringify({
          id_line: "U123",
          username: "LINE User",
          picture_url: "https://img",
          country: "TH",
        }),
      }),
    );
  });

  it("exchangeLineAuth > given an expired LINE token > returns a typed safe error without leaking API copy", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        code: "LINE_TOKEN_INVALID",
        message: "sensitive provider diagnostics",
      }),
    });

    const exchangePromise = exchangeLineAuth({
      accessToken: "expired-line-access",
      apiUrl: "https://api.example",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      profile: { userId: "U123" },
    });

    await expect(exchangePromise).rejects.toMatchObject({
      kind: "session-expired",
      name: "LineAuthExchangeError",
      status: 401,
    });
    await expect(exchangePromise).rejects.not.toMatchObject({
      message: expect.stringContaining("sensitive provider diagnostics"),
    });
  });

  it("exchangeLineAuth > given an unavailable network > returns a typed provider-unavailable error", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("socket details"));

    await expect(
      exchangeLineAuth({
        accessToken: "line-access",
        apiUrl: "https://api.example",
        fetchImpl: fetchImpl as unknown as typeof fetch,
        profile: { userId: "U123" },
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<LineAuthExchangeError>>({
        kind: "provider-unavailable",
        name: "LineAuthExchangeError",
        status: 0,
      }),
    );
  });

  it.each([
    [
      "account-disabled",
      "This GoGoCash account is disabled. Contact support.",
    ],
    [
      "account-link-failed",
      "We couldn't link your LINE account. Please try again or contact support.",
    ],
    [
      "provider-unavailable",
      "LINE sign-in is temporarily unavailable. Please try again.",
    ],
    ["session-expired", "Your LINE sign-in expired. Start LINE sign-in again."],
  ] as const)(
    "getLineAuthUserMessage > maps %s to actionable safe copy",
    (kind, expectedCopy) => {
      expect(getLineAuthUserMessage(new LineAuthExchangeError(kind, 503))).toBe(
        expectedCopy,
      );
    },
  );

  it("exchangeLineAuth > given a backend account-system failure > returns safe account-link recovery without retaining diagnostics", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ code: "database-host-secret" }),
    });

    await expect(
      exchangeLineAuth({
        accessToken: "line-access",
        apiUrl: "https://api.example",
        fetchImpl: fetchImpl as unknown as typeof fetch,
        profile: { userId: "U123" },
      }),
    ).rejects.toMatchObject({
      code: undefined,
      kind: "account-link-failed",
      message:
        "We couldn't link your LINE account. Please try again or contact support.",
      status: 500,
    });
  });
});

function createLiffStub({ isLoggedIn }: { isLoggedIn: boolean }) {
  return {
    getAccessToken: vi.fn(() => "line-access"),
    getProfile: vi.fn(async () => ({
      displayName: "LINE User",
      pictureUrl: "https://img.example/avatar.png",
      userId: "U123",
    })),
    init: vi.fn(async () => undefined),
    isLoggedIn: vi.fn(() => isLoggedIn),
    login: vi.fn(),
  };
}
