import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { createSessionQueryCacheBridge } from "../account/sessionQueryCacheBridge";

function seedAccountQuery(queryClient: QueryClient) {
  queryClient.setQueryData(
    ["customer-account-resource", "profile", "/user/profile", "https://api"],
    { name: "cached-user" }
  );
}

describe("createSessionQueryCacheBridge", () => {
  it("given a session change notification > then customer-account-resource queries are removed", () => {
    const queryClient = new QueryClient();
    seedAccountQuery(queryClient);
    let listener: (() => void) | undefined;
    const subscribe = vi.fn((fn: () => void) => {
      listener = fn;
      return () => {};
    });

    createSessionQueryCacheBridge({ queryClient, subscribe });
    expect(queryClient.getQueryCache().findAll().length).toBe(1);

    listener?.();

    // Stale identity-scoped data must never survive a login/logout boundary.
    expect(
      queryClient.getQueryCache().findAll({ queryKey: ["customer-account-resource"] }).length
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
});
