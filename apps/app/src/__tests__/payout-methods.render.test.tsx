import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createElement, type ReactNode } from "react";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { usePayoutMethods } from "@mobile/withdraw/usePayoutMethods";

const usePayoutMethodsSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../withdraw/usePayoutMethods.ts"),
  "utf8",
);

const moneyActionSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../screens/CustomerMoneyActionScreen.tsx"),
  "utf8",
);
const withdrawMethodSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../screens/CustomerWithdrawMethodScreen.tsx"),
  "utf8",
);

describe("payout methods shared state (source signals)", () => {
  it("CustomerMoneyActionScreen > reads and writes payout methods via usePayoutMethods", () => {
    expect(moneyActionSource).toContain("usePayoutMethods");
    expect(moneyActionSource).toContain("saveMethod");
    expect(moneyActionSource).not.toContain("INITIAL_METHODS");
    expect(moneyActionSource).not.toContain("setMethods(");
  });

  it("CustomerWithdrawMethodScreen > renders methods from usePayoutMethods", () => {
    expect(withdrawMethodSource).toContain("usePayoutMethods");
    expect(withdrawMethodSource).not.toContain("webWithdrawMethodPage.methods.map");
  });
});

describe("usePayoutMethods hook (render)", () => {
  it("usePayoutMethods > backend mode > does not seed fixture methods as initialData", () => {
    expect(usePayoutMethodsSource).toContain(
      "initialData: useFixtures ? buildFixturePayoutMethods() : undefined",
    );
    expect(usePayoutMethodsSource).toContain(
      "useFixtures\n    ? (query.data ?? buildFixturePayoutMethods())\n    : (query.data ?? [])",
    );
  });

  it("saveMethod > given fixtures mode > then a second hook instance sees the saved method", async () => {
    vi.stubEnv("EXPO_PUBLIC_ACCOUNT_DATA_SOURCE", "fixtures");
    vi.stubEnv("EXPO_PUBLIC_API_URL", "");

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children);

    const { result: writer } = renderHook(() => usePayoutMethods(), { wrapper });
    await waitFor(() => {
      expect(writer.current.status).toBe("ready");
    });

    await act(async () => {
      await writer.current.saveMethod({
        type: "bank",
        bankName: "SCB",
        accountNo: "5555666677",
        accountName: "Saved In Shared Cache",
        isDefault: false,
      });
    });

    const { result: reader } = renderHook(() => usePayoutMethods(), { wrapper });
    await waitFor(() => {
      expect(
        reader.current.methods.some((method) => method.accountName === "Saved In Shared Cache"),
      ).toBe(true);
    });

    vi.unstubAllEnvs();
  });
});
