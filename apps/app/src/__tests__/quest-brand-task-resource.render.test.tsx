import { createElement, type ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The public brand earn-list is gated ONLY on accountDataSource === "backend" (NOT auth), so it
// renders for signed-out visitors exactly like prod app.gogocash.co. We drive the hook with a
// mocked shared client + backend env and prove it fetches /offer/extra-point with no session.
let accountDataSource = "backend";
const get = vi.fn();

vi.mock("@mobile/config/env", () => ({
  getMobileEnv: () => ({
    accountDataSource,
    apiUrl: "https://api.test",
    appEnv: "test",
    frontendUrl: "http://localhost:8081",
    posthogHost: "",
    posthogKey: "",
    sentryDsn: "",
  }),
}));

vi.mock("@mobile/api/sharedClient", () => ({
  getSharedMobileApiClient: vi.fn(async () => ({ get })),
}));

vi.mock("@mobile/i18n/LocaleProvider", () => ({
  useLocale: () => ({ locale: "en" }),
}));

// Explicitly signed-OUT: the hook must still return rows (no auth requirement).
vi.mock("@mobile/auth/useMobileSessionSnapshot", () => ({
  useMobileSessionSnapshot: () => null,
}));

const { useQuestBrandTasks } = await import("@mobile/quest/questTaskResource");

const extraPointPayload = [
  { _id: "offer-klook", offer_name_display: "Klook Travel", extra_point: 50 },
  { _id: "offer-traveloka", offer_name: "Traveloka TH", extra_point: 50 },
];

describe("useQuestBrandTasks (public gate)", () => {
  let queryClient: QueryClient;
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  beforeEach(() => {
    accountDataSource = "backend";
    get.mockReset();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it("returns the public brand list + hardcoded row while signed OUT (backend mode)", async () => {
    get.mockResolvedValue(extraPointPayload);

    const { result } = renderHook(() => useQuestBrandTasks(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(get).toHaveBeenCalledWith("/offer/extra-point");

    const titles = result.current.rows.map((row) => row.title);
    expect(titles).toContain("Klook Travel");
    expect(titles).toContain("Traveloka TH");
    // Prod parity: the hardcoded "Shop 300 Baht+" row is appended after the API brands.
    expect(result.current.rows.at(-1)).toMatchObject({
      href: "/shop",
      title: "Shop 300 Baht+ on any shops",
      points: "+50 Points",
    });
  });

  it("surfaces a backend failure as an error status with a retry", async () => {
    get.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useQuestBrandTasks(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.rows).toEqual([]);
    expect(typeof result.current.retry).toBe("function");
  });

  it("does not hit the network in non-backend (design/preview) mode, still returns rows", () => {
    accountDataSource = "fixtures";

    const { result } = renderHook(() => useQuestBrandTasks(), { wrapper });

    expect(result.current.status).toBe("ready");
    expect(result.current.rows.length).toBeGreaterThan(0);
    expect(get).not.toHaveBeenCalled();
  });
});
