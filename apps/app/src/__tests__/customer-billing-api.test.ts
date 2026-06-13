import { describe, expect, it, vi } from "vitest";

import { createCustomerBillingApi } from "@mobile/billing/api";
import type { CustomerBillingBaseClient } from "@mobile/billing/api";

function createBaseClient() {
  return {
    get: vi.fn(async () => ({ enabled: true, status: "active" })) as unknown as CustomerBillingBaseClient["get"],
    post: vi.fn(async () => ({ url: "https://billing.example/session" })) as unknown as CustomerBillingBaseClient["post"],
  } as CustomerBillingBaseClient & {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
  };
}

describe("Customer billing mobile API wrapper", () => {
  it("customer billing api > given checkout request > posts checkout body to backend", async () => {
    const baseClient = createBaseClient();
    const api = createCustomerBillingApi(baseClient);

    await api.createCheckoutSession({
      interval: "month",
      locale: "th",
      tier: "starter",
    });

    expect(baseClient.post).toHaveBeenCalledWith("/customer-billing/checkout", {
      interval: "month",
      locale: "th",
      tier: "starter",
    });
  });

  it("customer billing api > given portal request > posts portal body to backend", async () => {
    const baseClient = createBaseClient();
    const api = createCustomerBillingApi(baseClient);

    await api.createBillingPortalSession({ locale: "en" });

    expect(baseClient.post).toHaveBeenCalledWith("/customer-billing/portal", {
      locale: "en",
    });
  });

  it("customer billing api > given subscription status request > gets subscription status", async () => {
    const baseClient = createBaseClient();
    const api = createCustomerBillingApi(baseClient);

    await api.getSubscriptionStatus();

    expect(baseClient.get).toHaveBeenCalledWith("/customer-billing/subscription");
  });
});
