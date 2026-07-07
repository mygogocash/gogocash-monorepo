import type { QueryClient } from "@tanstack/react-query";

export function invalidateCustomerWalletQueries(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({
    predicate: (query) =>
      Array.isArray(query.queryKey) &&
      query.queryKey[0] === "customer-account-resource" &&
      query.queryKey[1] === "wallet",
  });
}
