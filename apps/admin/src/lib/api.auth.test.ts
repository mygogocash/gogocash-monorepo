// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const axiosMock = vi.hoisted(() => ({
  request: vi.fn(),
  isAxiosError: vi.fn(),
}));

const sessionMock = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

vi.mock("axios", () => ({
  default: Object.assign(axiosMock.request, {
    isAxiosError: axiosMock.isAxiosError,
  }),
}));

vi.mock("next-auth/react", () => ({
  getSession: sessionMock.getSession,
}));

describe("apiClient auth headers", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:8080";
    axiosMock.request.mockResolvedValue({ data: { data: [], total: 0 } });
    axiosMock.isAxiosError.mockReturnValue(false);
    sessionMock.getSession.mockResolvedValue({
      user: { email: "admin@gogocash.co" },
    });
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_API_URL;
    vi.clearAllMocks();
  });

  it("given browser real-API mode > then getOffers hits BFF without client Bearer", async () => {
    const { apiClient } = await import("./api");

    await apiClient.getOffers({ limit: 300, page: 1 });

    expect(sessionMock.getSession).not.toHaveBeenCalled();
    expect(axiosMock.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "GET",
        url: "/api/backend/offer/admin?limit=300&page=1",
      }),
    );
    const call = axiosMock.request.mock.calls[0]?.[0] as {
      headers?: Record<string, string>;
    };
    const headers = call?.headers ?? {};
    const authKey = Object.keys(headers).find(
      (key) => key.toLowerCase() === "authorization",
    );
    expect(authKey).toBeUndefined();
  });

  it("given an HTTP error with no backend message > then throws status-aware copy, never 'HTTP Error 403'", async () => {
    const { apiClient } = await import("./api");
    axiosMock.isAxiosError.mockReturnValue(true);
    axiosMock.request.mockRejectedValue({
      response: { status: 403, data: {} },
    });

    await expect(apiClient.getOffers({ limit: 10, page: 1 })).rejects.toThrow(
      "You don't have permission to do that. Ask an administrator if you need access.",
    );
    await expect(
      apiClient.getOffers({ limit: 10, page: 1 }),
    ).rejects.not.toThrow(/HTTP Error/);
  });

  it("given an HTTP error WITH a backend message > then the real message is preferred", async () => {
    const { apiClient } = await import("./api");
    axiosMock.isAxiosError.mockReturnValue(true);
    axiosMock.request.mockRejectedValue({
      response: {
        status: 403,
        data: { message: "You do not have the manage_offers permission" },
      },
    });

    await expect(apiClient.getOffers({ limit: 10, page: 1 })).rejects.toThrow(
      "You do not have the manage_offers permission",
    );
  });

  it("given no HTTP response reached us > then throws the friendly connection message", async () => {
    const { apiClient } = await import("./api");
    axiosMock.isAxiosError.mockReturnValue(false);
    axiosMock.request.mockRejectedValue(new Error("Network Error"));

    await expect(apiClient.getOffers({ limit: 10, page: 1 })).rejects.toThrow(
      "Couldn't reach the server. Check your connection and try again.",
    );
  });

  it("given server-side login > then authorize still hits Nest directly", async () => {
    const windowDescriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      "window",
    );
    // @ts-expect-error delete window for server-side path
    delete globalThis.window;

    try {
      const { apiClient } = await import("./api");
      axiosMock.request.mockResolvedValue({
        data: {
          _id: "a1",
          username: "admin",
          email: "admin@gogocash.co",
          token: "nest-jwt",
        },
      });

      await apiClient.login({
        email: "admin@gogocash.co",
        password: "secret",
      });

      expect(axiosMock.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "POST",
          url: "http://localhost:8080/admin/login",
        }),
      );
    } finally {
      if (windowDescriptor) {
        Object.defineProperty(globalThis, "window", windowDescriptor);
      }
    }
  });
});
