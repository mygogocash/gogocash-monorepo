// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const axiosMock = vi.hoisted(() => ({
  request: vi.fn(),
  isAxiosError: vi.fn(),
}));

vi.mock("axios", () => ({
  default: Object.assign(axiosMock.request, {
    isAxiosError: axiosMock.isAxiosError,
  }),
}));

describe("apiClient admin-user routes", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:8080";
    axiosMock.request.mockResolvedValue({
      data: { _id: "admin-1", role: "support" },
    });
    axiosMock.isAxiosError.mockReturnValue(false);
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_API_URL;
    vi.clearAllMocks();
  });

  it("updates an admin role through the Nest PATCH contract", async () => {
    const { apiClient } = await import("./api");

    await apiClient.updateAdminUser("admin-1", { role: "support" });

    expect(axiosMock.request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/api/backend/admin/admin-1",
        method: "PATCH",
        data: { role: "support" },
      }),
    );
  });

  it("uses the matching DELETE contract for admin revocation", async () => {
    const { apiClient } = await import("./api");

    await apiClient.deleteAdminUser("admin-1");

    expect(axiosMock.request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/api/backend/admin/admin-1",
        method: "DELETE",
      }),
    );
  });
});
