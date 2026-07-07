import { createElement, type ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useGoGoTrackMerchants } from "@mobile/gototrack/useGoGoTrackMerchants";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("useGoGoTrackMerchants (render)", () => {
  let queryClient: QueryClient;
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it("loads the live catalog and selects a merchant by route slug", async () => {
    const api = {
      getMerchants: vi.fn(async () => [
        {
          android_packages: ["com.grocery.galaxy"],
          enabled: true,
          merchant_id: "merchant-grocery-galaxy",
          merchant_name: "Grocery Galaxy",
        },
      ]),
    };

    const { result } = renderHook(() => useGoGoTrackMerchants("grocery-galaxy", api), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(api.getMerchants).toHaveBeenCalledTimes(1);
    expect(result.current.merchant).toMatchObject({
      androidPackages: ["com.grocery.galaxy"],
      id: "merchant-grocery-galaxy",
      name: "Grocery Galaxy",
    });
  });

  it("stays empty when the app is off-device or unauthenticated", () => {
    const { result } = renderHook(() => useGoGoTrackMerchants("grocery-galaxy", null), { wrapper });

    expect(result.current.loading).toBe(false);
    expect(result.current.merchant).toBeNull();
    expect(result.current.merchants).toEqual([]);
  });

  it("does not fetch the catalog while the merchant route is inactive", () => {
    const api = {
      getMerchants: vi.fn(async () => [
        {
          merchant_id: "merchant-grocery-galaxy",
          merchant_name: "Grocery Galaxy",
        },
      ]),
    };

    const { result } = renderHook(() => useGoGoTrackMerchants("grocery-galaxy", api, false), {
      wrapper,
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.merchant).toBeNull();
    expect(result.current.merchants).toEqual([]);
    expect(api.getMerchants).not.toHaveBeenCalled();
  });

  it("shares the merchant catalog across hook instances via React Query", async () => {
    const api = {
      getMerchants: vi.fn(async () => [
        {
          android_packages: ["com.grocery.galaxy"],
          enabled: true,
          merchant_id: "merchant-grocery-galaxy",
          merchant_name: "Grocery Galaxy",
        },
      ]),
    };

    const { result: first } = renderHook(() => useGoGoTrackMerchants("grocery-galaxy", api), {
      wrapper,
    });
    await waitFor(() => expect(first.current.loading).toBe(false));
    expect(api.getMerchants).toHaveBeenCalledTimes(1);

    const { result: second } = renderHook(() => useGoGoTrackMerchants("grocery-galaxy", api), {
      wrapper,
    });
    await waitFor(() => expect(second.current.loading).toBe(false));
    expect(api.getMerchants).toHaveBeenCalledTimes(1);
    expect(second.current.merchant).toMatchObject({
      id: "merchant-grocery-galaxy",
      name: "Grocery Galaxy",
    });
  });
});
