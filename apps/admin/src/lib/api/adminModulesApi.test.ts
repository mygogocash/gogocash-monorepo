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
  getMembershipStats,
  getMembershipTiers,
  getMembershipUsers,
  getMissingOrders,
  getWalletAdjustments,
  getWalletDetail,
  getSubscriptionPlans,
  getSubscriptionStats,
  getSubscriptions,
  postMissingOrderNote,
  postWalletAdjust,
  putMissingOrderReject,
  putMissingOrderAssign,
} from "./adminModulesApi";

describe("adminModulesApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getMembershipTiers__given_missing_response_data__then_returns_empty_array", async () => {
    mockClient.get.mockResolvedValueOnce({ data: {} });

    await expect(getMembershipTiers()).resolves.toEqual([]);
  });

  it("normalizes the real membership stats response without inventing unavailable money metrics", async () => {
    mockClient.get.mockResolvedValueOnce({
      data: {
        active_memberships: 7,
        new_this_month: 2,
      },
    });

    await expect(getMembershipStats()).resolves.toEqual({
      totalActiveMembers: 7,
      newThisMonth: 2,
      revenueMtd: null,
      churnRate: null,
    });
  });

  it("normalizes the real membership tier API ids and active state", async () => {
    mockClient.get.mockResolvedValueOnce({
      data: [
        {
          _id: "6942b79d7b9f8214ada6eed5",
          name: "GoGoPass Plus",
          price: 199,
          currency: "THB",
          benefits: ["Bonus cashback"],
          cashback_bonus_percent: 5,
          is_active: false,
        },
      ],
    });

    await expect(getMembershipTiers()).resolves.toEqual([
      expect.objectContaining({
        id: "6942b79d7b9f8214ada6eed5",
        name: "GoGoPass Plus",
        monthlyPrice: 199,
        isActive: false,
        cashbackRate: 5,
        benefits: [{ icon: "check", label: "Bonus cashback" }],
      }),
    ]);
  });

  it("getSubscriptionPlans__given_missing_response_data__then_returns_empty_array", async () => {
    mockClient.get.mockResolvedValueOnce({ data: {} });

    await expect(getSubscriptionPlans()).resolves.toEqual([]);
  });

  it("normalizes the real subscription stats contract into operational counts", async () => {
    mockClient.get.mockResolvedValueOnce({
      data: {
        by_status: { active: 3, paused: 1, cancelled: 2, expired: 4 },
        total_revenue: 597,
      },
    });

    await expect(getSubscriptionStats()).resolves.toEqual({
      totalSubscriptions: 10,
      activeSubscriptions: 3,
      cancelledSubscriptions: 2,
      activePlanValue: 597,
    });
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

  it("getMissingOrders__given_canonical_meta_page__then_returns_the_flat Admin page contract", async () => {
    const claim = {
      id: "claim-1",
      userId: "user-1",
      userName: "Claim Seeker",
      email: "seeker@example.com",
      phone: "+66812345678",
      merchantId: "offer-1",
      merchantName: "Example Store",
      offerSource: "involve",
      providerOfferId: 5031,
      orderId: "ORDER-9",
      orderAmount: 100,
      currency: "THB",
      purchaseDate: "2026-07-01T00:00:00.000Z",
      expectedCashback: null,
      overrideCashback: null,
      submittedDate: "2026-07-02T00:00:00.000Z",
      remarks: "Missing conversion",
      status: "pending",
      assignedTo: null,
      evidence: [],
      notes: [],
      resolutionNote: null,
      rejectionReason: null,
      resolvedAt: null,
      schemaVersion: 2,
    };
    mockClient.get.mockResolvedValueOnce({
      data: {
        data: [claim],
        meta: { total: 1, page: 2, limit: 10, totalPages: 1 },
      },
    });

    await expect(getMissingOrders({ page: 2, limit: 10 })).resolves.toEqual({
      data: [claim],
      total: 1,
      page: 2,
      limit: 10,
      totalPages: 1,
    });
  });

  it("missing-order mutations send the exact DTO fields accepted by Nest", async () => {
    mockClient.put.mockResolvedValueOnce({ data: { status: "under_review" } });
    mockClient.put.mockResolvedValueOnce({ data: { status: "rejected" } });
    mockClient.post.mockResolvedValueOnce({ data: { notes: [] } });

    await putMissingOrderAssign("claim-1");
    await putMissingOrderReject("claim-1", "Provider did not confirm order");
    await postMissingOrderNote("claim-1", "Requested provider confirmation");

    expect(mockClient.put).toHaveBeenCalledWith(
      "/admin/missing-orders/claim-1/assign",
      {},
    );
    expect(mockClient.put).toHaveBeenCalledWith(
      "/admin/missing-orders/claim-1/reject",
      { note: "Provider did not confirm order" },
    );
    expect(mockClient.post).toHaveBeenCalledWith(
      "/admin/missing-orders/claim-1/notes",
      { text: "Requested provider confirmation" },
    );
  });

  it("uses the real wallet detail and adjustment response contracts", async () => {
    const wallet = { userId: "user-1", status: "active" };
    const adjustment = { walletId: "user-1", amount: 25 };
    mockClient.get.mockResolvedValueOnce({
      data: { wallet, recentTransactions: [] },
    });
    mockClient.get.mockResolvedValueOnce({ data: { data: [adjustment] } });

    await expect(getWalletDetail("user-1")).resolves.toEqual({
      wallet,
      recentTransactions: [],
    });
    await expect(getWalletAdjustments("user-1")).resolves.toEqual([adjustment]);
  });

  it("sends a durable wallet command key and only whitelisted adjustment fields", async () => {
    mockClient.post.mockResolvedValueOnce({ data: { _id: "adjustment-1" } });

    await postWalletAdjust(
      "user-1",
      {
        type: "credit",
        amount: 25,
        currency: "THB",
        reason: "Reward",
      },
      "idem-adjust-1",
    );

    expect(mockClient.post).toHaveBeenCalledWith(
      "/admin/wallets/user-1/adjust",
      {
        type: "credit",
        amount: 25,
        currency: "THB",
        reason: "Reward",
      },
      { headers: { "Idempotency-Key": "idem-adjust-1" } },
    );
  });

  it("getMissingOrders__given_a_specific_API_failure__then_preserves_status_and_details", async () => {
    const failure = {
      status: 503,
      data: { message: "MissionOrder index unavailable" },
    };
    mockClient.get.mockRejectedValueOnce(failure);

    await expect(getMissingOrders({ page: 1, limit: 10 })).rejects.toBe(
      failure,
    );
  });
});
