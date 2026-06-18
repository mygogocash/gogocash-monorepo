import { beforeEach, describe, expect, it, vi } from "vitest";

const mockClient = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/lib/axios/client", () => ({
  default: mockClient,
}));

import {
  getCreditScoreAudit,
  getCreditScoreDetail,
  getMembershipTiers,
  getMembershipUsers,
  getSubscriptionPlans,
  getSubscriptions,
} from "./adminModulesApi";

describe("adminModulesApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getMembershipTiers__given_missing_response_data__then_returns_empty_array", async () => {
    mockClient.get.mockResolvedValueOnce({ data: {} });

    await expect(getMembershipTiers()).resolves.toEqual([]);
  });

  it("getSubscriptionPlans__given_missing_response_data__then_returns_empty_array", async () => {
    mockClient.get.mockResolvedValueOnce({ data: {} });

    await expect(getSubscriptionPlans()).resolves.toEqual([]);
  });

  it("getMembershipUsers__given_missing_response_data__then_returns_empty_page", async () => {
    mockClient.get.mockResolvedValueOnce({ data: {} });

    await expect(
      getMembershipUsers({ page: 2, limit: 20, search: "unknown" }),
    ).resolves.toEqual({
      data: [],
      page: 2,
      limit: 20,
      total: 0,
      totalPages: 0,
    });
  });

  it("getSubscriptions__given_missing_response_data__then_returns_empty_page", async () => {
    mockClient.get.mockResolvedValueOnce({ data: {} });

    await expect(
      getSubscriptions({ page: 3, limit: 10, search: "unknown" }),
    ).resolves.toEqual({
      data: [],
      page: 3,
      limit: 10,
      total: 0,
      totalPages: 0,
    });
  });

  it("getCreditScoreDetail__given_not_found__then_returns_null", async () => {
    mockClient.get.mockRejectedValueOnce({ status: 404 });

    await expect(getCreditScoreDetail("missing-user")).resolves.toBeNull();
  });

  it("getCreditScoreAudit__given_missing_response_data__then_returns_empty_array", async () => {
    mockClient.get.mockResolvedValueOnce({ data: {} });

    await expect(getCreditScoreAudit("missing-user")).resolves.toEqual([]);
  });
});
