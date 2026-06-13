import { describe, expect, it, vi } from "vitest";

import { ApiError, createMobileApiClient } from "@mobile/api/client";
import type { MobileSessionStore } from "@mobile/auth/session";

function createSessionStore(token: string | null): MobileSessionStore {
  return {
    getSession: vi.fn(async () =>
      token
        ? {
            access_token: token,
            email: "tester@gogocash.co",
            username: "tester",
          }
        : null
    ),
    setSession: vi.fn(),
    clearSession: vi.fn(async () => {
      token = null;
    }),
  };
}

describe("GoGoCash mobile API client", () => {
  it("mobile api client > given session token > then sends bearer token to staging api", async () => {
    const fetchMock = vi.fn(async () => Response.json({ ok: true }));
    const sessionStore = createSessionStore("mobile-token");
    const client = createMobileApiClient({
      baseUrl: "https://api-staging.gogocash.co",
      fetchImpl: fetchMock,
      sessionStore,
    });

    await expect(client.get("/offers")).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledWith("https://api-staging.gogocash.co/offers", {
      headers: {
        Accept: "application/json",
        Authorization: "Bearer mobile-token",
        "Content-Type": "application/json",
      },
      method: "GET",
    });
  });

  it("mobile api client > given expired session > then clears secure session and reports unauthorized", async () => {
    const unauthorizedHandler = vi.fn();
    const sessionStore = createSessionStore("expired-token");
    const client = createMobileApiClient({
      baseUrl: "https://api-staging.gogocash.co",
      fetchImpl: vi.fn(async () => Response.json({ message: "expired" }, { status: 401 })),
      onUnauthorized: unauthorizedHandler,
      sessionStore,
    });

    await expect(client.get("/profile")).rejects.toMatchObject({
      status: 401,
      message: "expired",
    });

    expect(sessionStore.clearSession).toHaveBeenCalledOnce();
    expect(unauthorizedHandler).toHaveBeenCalledOnce();
  });

  it("mobile api client > given 401 on a request that sent no bearer > then the session is NOT cleared", async () => {
    const unauthorizedHandler = vi.fn();
    const sessionStore = createSessionStore(null);
    const client = createMobileApiClient({
      baseUrl: "https://api-staging.gogocash.co",
      fetchImpl: vi.fn(async () => Response.json({ message: "unauthorized" }, { status: 401 })),
      onUnauthorized: unauthorizedHandler,
      sessionStore,
    });

    await expect(client.get("/offer")).rejects.toMatchObject({ status: 401 });

    // A public/unauthenticated request 401-ing must never force-logout a user
    // whose stored session was never even presented.
    expect(sessionStore.clearSession).not.toHaveBeenCalled();
    expect(unauthorizedHandler).not.toHaveBeenCalled();
  });

  it("mobile api client > given post body > then serializes json and preserves custom headers", async () => {
    const fetchMock = vi.fn(async () => Response.json({ created: true }));
    const client = createMobileApiClient({
      baseUrl: "https://api-staging.gogocash.co/",
      fetchImpl: fetchMock,
      sessionStore: createSessionStore(null),
    });

    await expect(
      client.post("/auth/log-in", { provider: "firebase" }, { "X-PostHog-Distinct-Id": "abc" })
    ).resolves.toEqual({ created: true });

    expect(fetchMock).toHaveBeenCalledWith("https://api-staging.gogocash.co/auth/log-in", {
      body: JSON.stringify({ provider: "firebase" }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-PostHog-Distinct-Id": "abc",
      },
      method: "POST",
    });
  });

  it("mobile api client > given server failure > then throws typed ApiError", async () => {
    const client = createMobileApiClient({
      baseUrl: "https://api-staging.gogocash.co",
      fetchImpl: vi.fn(async () => Response.json({ message: "bad gateway" }, { status: 502 })),
      sessionStore: createSessionStore(null),
    });

    await expect(client.get("/wallet")).rejects.toBeInstanceOf(ApiError);
  });
});
