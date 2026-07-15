import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import {
  PUBLIC_CATALOG_REFETCH_RESOURCE_IDS,
  refetchPublicCatalogResources,
} from "@mobile/account/accountResourcePrefetch";
import { resolveCustomerAccountResourceQueryOptions } from "@mobile/account/customerAccountResourceQueryOptions";
import { resolveCustomerAccountResourceQueryKey } from "@mobile/account/customerAccountResourceQueryKey";
import {
  CUSTOMER_QUERY_STALE_TIME_MS,
  PUBLIC_CATALOG_QUERY_STALE_TIME_MS,
} from "@mobile/query/queryDefaults";

describe("resolveCustomerAccountResourceQueryOptions", () => {
  it("given topBrand > then uses short stale time and refetch on focus", () => {
    expect(resolveCustomerAccountResourceQueryOptions("topBrand")).toEqual({
      staleTime: PUBLIC_CATALOG_QUERY_STALE_TIME_MS,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    });
  });

  it("given merchantCoupons > then refreshes the public deal feed on focus", () => {
    expect(
      resolveCustomerAccountResourceQueryOptions("merchantCoupons"),
    ).toEqual({
      staleTime: PUBLIC_CATALOG_QUERY_STALE_TIME_MS,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    });
  });

  it("given allBrandBanner > then refreshes the public directory carousel on focus", () => {
    expect(
      resolveCustomerAccountResourceQueryOptions("allBrandBanner"),
    ).toEqual({
      staleTime: PUBLIC_CATALOG_QUERY_STALE_TIME_MS,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    });
  });

  it("given wallet > then uses default stale time and no catalog refetch flags", () => {
    expect(resolveCustomerAccountResourceQueryOptions("wallet")).toEqual({
      staleTime: CUSTOMER_QUERY_STALE_TIME_MS,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    });
  });
});

describe("PUBLIC_CATALOG_REFETCH_RESOURCE_IDS", () => {
  it("includes top brands and catalog feeds", () => {
    expect(PUBLIC_CATALOG_REFETCH_RESOURCE_IDS).toEqual(
      expect.arrayContaining([
        "allBrandBanner",
        "topBrand",
        "brandCatalog",
        "homeBanner",
        "categoryList",
        "catalog",
      ]),
    );
  });
});

describe("refetchPublicCatalogResources", () => {
  it("given active catalog queries for the current region > then refetches matching resource ids", async () => {
    const queryClient = new QueryClient();
    const apiUrl = "https://api.test";
    const refetchQueries = vi.spyOn(queryClient, "refetchQueries");

    await refetchPublicCatalogResources(queryClient, apiUrl, "backend");

    expect(refetchQueries).toHaveBeenCalledWith({
      predicate: expect.any(Function),
      type: "active",
    });

    const predicate = refetchQueries.mock.calls[0]?.[0]?.predicate as
      ((query: { queryKey: readonly unknown[] }) => boolean) | undefined;
    expect(predicate).toBeDefined();

    const topBrandKey = resolveCustomerAccountResourceQueryKey({
      apiUrl,
      endpoint: "/offer/top-brands",
      regionCode: "TW",
      resourceId: "topBrand",
      sessionScope: "public",
    });
    const walletKey = resolveCustomerAccountResourceQueryKey({
      apiUrl,
      endpoint: "/withdraw/check",
      regionCode: "TH",
      resourceId: "wallet",
      sessionScope: "user-a",
    });

    expect(predicate?.({ queryKey: topBrandKey })).toBe(true);
    expect(predicate?.({ queryKey: walletKey })).toBe(false);
  });

  it("given fixtures mode > then skips refetch", async () => {
    const queryClient = new QueryClient();
    const refetchQueries = vi.spyOn(queryClient, "refetchQueries");

    await refetchPublicCatalogResources(queryClient, "", "fixtures");

    expect(refetchQueries).not.toHaveBeenCalled();
  });
});
