import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/lib/axios/client", () => ({ default: api }));

import { listAdminActivity } from "./activityApi";

describe("listAdminActivity", () => {
  beforeEach(() => {
    api.get.mockReset().mockResolvedValue({
      data: { data: [], limit: 25, page: 1, total: 0 },
    });
  });

  it("threads an AbortSignal into axios so stale React Query requests are cancelled", async () => {
    const controller = new AbortController();

    await listAdminActivity({ page: 1, search: "wallet" }, controller.signal);

    expect(api.get).toHaveBeenCalledWith("/admin/activity", {
      params: { page: 1, search: "wallet" },
      signal: controller.signal,
    });
  });
});
