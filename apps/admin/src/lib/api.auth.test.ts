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
    sessionMock.getSession.mockResolvedValue({ accessToken: "admin-token" });
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_API_URL;
    vi.clearAllMocks();
  });

  it("given a session token > then getOffers sends it to the guarded admin offer endpoint", async () => {
    const { apiClient } = await import("./api");

    await apiClient.getOffers({ limit: 300, page: 1 });

    expect(sessionMock.getSession).toHaveBeenCalled();
    expect(axiosMock.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "GET",
        url: "http://localhost:8080/offer/admin?limit=300&page=1",
        headers: expect.objectContaining({
          Authorization: "Bearer admin-token",
        }),
      }),
    );
  });
});
