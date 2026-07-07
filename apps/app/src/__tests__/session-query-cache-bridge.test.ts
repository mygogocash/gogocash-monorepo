import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

vi.mock("@mobile/auth/firebaseIdTokenCache", () => ({
  clearFirebaseIdTokenCache: vi.fn(),
}));

import { createSessionQueryCacheBridge } from "../account/sessionQueryCacheBridge";
import { resolveCustomerAccountResourceQueryKey } from "../account/customerAccountResourceQueryKey";

function seedAccountQuery(queryClient: QueryClient) {
  queryClient.setQueryData(
    ["customer-account-resource", "profile", "/user/profile", "https://api", "user-a"],
    { name: "cached-user" }
  );
}

describe("createSessionQueryCacheBridge", () => {
  it("given a session change notification > then identity-scoped query caches are removed", () => {
    const queryClient = new QueryClient();
    seedAccountQuery(queryClient);
    queryClient.setQueryData(["gototrack-settings", "https://api", "user-a"], {
      enabled: true,
    });
    queryClient.setQueryData(["gototrack-merchants", "https://api"], [
      { id: "shopee", name: "Shopee", enabled: true, androidPackages: [], domains: [] },
    ]);
    let listener: (() => void) | undefined;
    const subscribe = vi.fn((fn: () => void) => {
      listener = fn;
      return () => {};
    });

    createSessionQueryCacheBridge({ queryClient, subscribe });
    expect(queryClient.getQueryCache().findAll().length).toBe(3);

    listener?.();

    expect(
      queryClient.getQueryCache().findAll({ queryKey: ["customer-account-resource"] }).length,
    ).toBe(0);
    expect(
      queryClient.getQueryCache().findAll({ queryKey: ["gototrack-settings"] }).length,
    ).toBe(0);
    expect(
      queryClient.getQueryCache().findAll({ queryKey: ["gototrack-merchants"] }).length,
    ).toBe(0);
  });

  it("given the bridge is torn down > then the session subscription is released", () => {
    const queryClient = new QueryClient();
    const unsubscribe = vi.fn();
    const subscribe = vi.fn(() => unsubscribe);

    const teardown = createSessionQueryCacheBridge({ queryClient, subscribe });
    teardown();

    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it("given wallet cache entries for two users > when keys differ by session scope > then data does not collide", () => {
    const queryClient = new QueryClient();
    const userAKey = resolveCustomerAccountResourceQueryKey({
      apiUrl: "https://api.test",
      endpoint: "/withdraw/check",
      regionCode: "TH",
      resourceId: "wallet",
      sessionScope: "user-a",
    });
    const userBKey = resolveCustomerAccountResourceQueryKey({
      apiUrl: "https://api.test",
      endpoint: "/withdraw/check",
      regionCode: "TH",
      resourceId: "wallet",
      sessionScope: "user-b",
    });

    queryClient.setQueryData(userAKey, { availableTHB: 100 });

    expect(queryClient.getQueryData(userBKey)).toBeUndefined();
  });
});
