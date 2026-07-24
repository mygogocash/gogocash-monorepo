import { createElement, type ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

const { useQuestTaskCatalog } = await import("@mobile/quest/questTaskResource");

const catalogPayload = {
  contract_version: 1,
  quest_id: "quest-1",
  config_revision: 1,
  catalog_source: "legacy_compatibility",
  tasks: [
    {
      task_key: "klook",
      task_kind: "brand_purchase",
      points: 50,
      sort_order: 0,
      wording_en: "Klook Travel",
      wording_th: "Klook Travel",
      offer: { id: "offer-klook", name: "Klook Travel" },
    },
    {
      task_key: "legacy-system",
      task_kind: "points_threshold_bonus",
      points: 50,
      sort_order: 1,
      wording_en: "Earn 300 quest points",
      wording_th: "รับคะแนนภารกิจ 300 คะแนน",
      target: { kind: "quest_points_threshold", threshold_points: 300 },
    },
  ],
};

describe("useQuestTaskCatalog", () => {
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

  it("fetches the public server-owned catalog without requiring auth", async () => {
    get.mockResolvedValue(catalogPayload);

    const { result } = renderHook(() => useQuestTaskCatalog(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(get).toHaveBeenCalledWith("/point/quest-task-catalog");
    expect(result.current.rows.map((row) => row.title)).toEqual([
      "Klook Travel",
      "Earn 300 quest points",
    ]);
  });

  it("surfaces backend and contract failures with a retry and no Offer fallback", async () => {
    get.mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useQuestTaskCatalog(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.rows).toEqual([]);
    expect(typeof result.current.retry).toBe("function");
    expect(get).toHaveBeenCalledTimes(1);
  });

  it("does not hit the network in non-backend design mode", () => {
    accountDataSource = "fixtures";

    const { result } = renderHook(() => useQuestTaskCatalog(), { wrapper });

    expect(result.current.status).toBe("ready");
    expect(result.current.rows.length).toBeGreaterThan(0);
    expect(get).not.toHaveBeenCalled();
  });
});
