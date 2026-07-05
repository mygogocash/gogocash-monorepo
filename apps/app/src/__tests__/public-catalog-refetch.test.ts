import { describe, expect, it } from "vitest";

import { PUBLIC_CATALOG_REFETCH_RESOURCE_IDS } from "@mobile/account/accountResourcePrefetch";
import { resolveCustomerAccountResourceQueryOptions } from "@mobile/account/customerAccountResourceQueryOptions";
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
      expect.arrayContaining(["topBrand", "brandCatalog", "homeBanner", "categoryList", "catalog"]),
    );
  });
});
