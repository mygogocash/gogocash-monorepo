import { afterEach, describe, expect, it, vi } from "vitest";
import { createMobileApiClient } from "../api/client";
import type { MobileSessionStore } from "../auth/session";

function makeStore(token = "backend-jwt"): MobileSessionStore {
  return {
    clearSession: vi.fn(async () => {}),
    getSession: vi.fn(async () => ({ access_token: token })),
    setSession: vi.fn(async () => {}),
  };
}

describe("createMobileApiClient auth token selection", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("given a fresh Firebase ID token > then prefers it over the stored backend JWT", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true }),
    }));
    const getPreferredAuthToken = vi.fn(async () => "firebase-id-token");

    const client = createMobileApiClient({
      baseUrl: "https://api-staging.gogocash.co",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      getPreferredAuthToken,
      sessionStore: makeStore(),
    });

    await client.get("/offer");

    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer firebase-id-token"
    );
  });

  it("given no Firebase token > then falls back to the session access_token", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true }),
    }));

    const client = createMobileApiClient({
      baseUrl: "https://api-staging.gogocash.co",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      getPreferredAuthToken: async () => null,
      sessionStore: makeStore("stored-jwt"),
    });

    await client.get("/offer");

    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer stored-jwt");
  });
});
