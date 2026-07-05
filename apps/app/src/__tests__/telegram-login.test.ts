import { describe, expect, it, vi } from "vitest";

import { exchangeTelegramAuth } from "@mobile/auth/telegramLogin";
import { mapLoginResponseToMobileSession } from "@mobile/auth/firebaseLogin";

describe("telegram login > exchangeTelegramAuth", () => {
  const telegramPayload = {
    id: 12345,
    first_name: "GoGo",
    username: "gogo_user",
    auth_date: 1_700_000_000,
    hash: "abc123",
  };

  const okResponse = {
    token: "backend-jwt",
    user: { _id: "user-1", provider: "telegram", username: "gogo_user" },
  };

  it("posts the Telegram widget payload to /auth/log-in/telegram", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(okResponse),
      ok: true,
      status: 201,
    } as unknown as Response);

    await exchangeTelegramAuth({
      apiUrl: "https://api.dev.gogocash.co",
      country: "TH",
      fetchImpl,
      payload: telegramPayload,
    });

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.dev.gogocash.co/auth/log-in/telegram");
    expect(JSON.parse(String(init.body))).toMatchObject({
      ...telegramPayload,
      country: "TH",
    });
  });

  it("maps the backend provider into the persisted session", async () => {
    const session = await exchangeTelegramAuth({
      apiUrl: "https://api.dev.gogocash.co",
      fetchImpl: vi.fn().mockResolvedValue({
        json: () => Promise.resolve(okResponse),
        ok: true,
        status: 201,
      } as unknown as Response),
      payload: telegramPayload,
    });

    expect(session).toEqual(mapLoginResponseToMobileSession(okResponse));
    expect(session.provider).toBe("telegram");
  });
});
