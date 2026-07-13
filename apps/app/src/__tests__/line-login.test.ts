import { afterEach, describe, expect, it, vi } from "vitest";

import {
  exchangeLineAuth,
  getLiffId,
  isLineLoginConfigured,
} from "@mobile/auth/lineLogin";

describe("lineLogin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
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
      profile: { userId: "U123", displayName: "LINE User", pictureUrl: "https://img" },
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
});
