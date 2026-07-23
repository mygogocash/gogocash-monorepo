import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import {
  buildFixturePayoutMethods,
  mapWithdrawMethodRecordToPayoutMethod,
  maskAccountNumber,
  mergePayoutMethodSave,
  type PayoutMethod,
} from "@mobile/withdraw/payoutMethodModel";
import { resolvePayoutMethodsQueryKey } from "@mobile/withdraw/payoutMethodsQueryKey";

describe("payoutMethodModel", () => {
  it("maskAccountNumber > given long account > then masks all but last four digits", () => {
    expect(maskAccountNumber("1234567890")).toBe("****7890");
  });

  it("mapWithdrawMethodRecordToPayoutMethod > maps API record fields", () => {
    expect(
      mapWithdrawMethodRecordToPayoutMethod({
        _id: "method-1",
        account_name: "Demo Shopper",
        account_no: "0891234567",
        bank_name: "PromptPay (Phone)",
        is_default: true,
      }),
    ).toEqual({
      id: "method-1",
      type: "promptpay",
      bankName: "PromptPay (Phone)",
      accountNo: "0891234567",
      accountName: "Demo Shopper",
      isDefault: true,
      maskedAccount: "****4567",
    });
  });

  it("mergePayoutMethodSave > given new default method > then clears other defaults", () => {
    const seed = buildFixturePayoutMethods();
    const next = mergePayoutMethodSave(seed, {
      type: "bank",
      bankName: "SCB",
      accountNo: "1111222233",
      accountName: "New Account",
      isDefault: true,
    });

    expect(next.methods).toHaveLength(seed.length + 1);
    expect(next.methods.filter((method) => method.isDefault)).toHaveLength(1);
    expect(next.saved.accountName).toBe("New Account");
    expect(next.saved.isDefault).toBe(true);
  });
});

describe("usePayoutMethods shared cache", () => {
  it("saveMethod > given fixtures mode > then query cache updates are visible to later readers", () => {
    vi.stubEnv("EXPO_PUBLIC_ACCOUNT_DATA_SOURCE", "fixtures");
    vi.stubEnv("EXPO_PUBLIC_API_URL", "");

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const queryKey = resolvePayoutMethodsQueryKey("", "anon");
    const seed = buildFixturePayoutMethods();
    queryClient.setQueryData(queryKey, seed);

    const { methods: nextMethods, saved } = mergePayoutMethodSave(seed, {
      type: "bank",
      bankName: "SCB",
      accountNo: "5555666677",
      accountName: "Saved In Shared Cache",
      isDefault: false,
    });
    queryClient.setQueryData(queryKey, nextMethods);

    const reader = queryClient.getQueryData<PayoutMethod[]>(queryKey) ?? [];
    expect(reader.some((method) => method.id === saved.id)).toBe(true);
    expect(saved.accountName).toBe("Saved In Shared Cache");

    vi.unstubAllEnvs();
  });
});
