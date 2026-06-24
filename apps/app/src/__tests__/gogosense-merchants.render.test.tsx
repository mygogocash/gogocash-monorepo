import { renderHook, waitFor } from "@testing-library/react";
import { useGoGoSenseMerchants } from "@mobile/gogosense/useGoGoSenseMerchants";
import { describe, expect, it, vi } from "vitest";

describe("useGoGoSenseMerchants (render)", () => {
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

    const { result } = renderHook(() => useGoGoSenseMerchants("grocery-galaxy", api));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(api.getMerchants).toHaveBeenCalledTimes(1);
    expect(result.current.merchant).toMatchObject({
      androidPackages: ["com.grocery.galaxy"],
      id: "merchant-grocery-galaxy",
      name: "Grocery Galaxy",
    });
  });

  it("stays empty when the app is off-device or unauthenticated", () => {
    const { result } = renderHook(() => useGoGoSenseMerchants("grocery-galaxy", null));

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

    const { result } = renderHook(() => useGoGoSenseMerchants("grocery-galaxy", api, false));

    expect(result.current.loading).toBe(false);
    expect(result.current.merchant).toBeNull();
    expect(result.current.merchants).toEqual([]);
    expect(api.getMerchants).not.toHaveBeenCalled();
  });
});
