import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { invalidateCustomerWalletQueries } from "@mobile/account/invalidateCustomerWalletQueries";
import { resolveCustomerAccountResourceQueryKey } from "@mobile/account/customerAccountResourceQueryKey";

describe("invalidateCustomerWalletQueries", () => {
  it("invalidates only wallet customer-account-resource queries", async () => {
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    const walletKey = resolveCustomerAccountResourceQueryKey({
      apiUrl: "https://api.test",
      endpoint: "/withdraw/check",
      regionCode: "TH",
      resourceId: "wallet",
      sessionScope: "user-a",
    });
    const profileKey = resolveCustomerAccountResourceQueryKey({
      apiUrl: "https://api.test",
      endpoint: "/user/profile",
      regionCode: "TH",
      resourceId: "profile",
      sessionScope: "user-a",
    });

    queryClient.setQueryData(walletKey, { netAmountTHB: 1000 });
    queryClient.setQueryData(profileKey, { name: "Demo" });

    await invalidateCustomerWalletQueries(queryClient);

    const predicate = invalidateQueries.mock.calls[0]?.[0]?.predicate as
      | ((query: { queryKey: unknown }) => boolean)
      | undefined;

    expect(predicate?.({ queryKey: walletKey })).toBe(true);
    expect(predicate?.({ queryKey: profileKey })).toBe(false);
  });
});
